"""Routing-state tests; no live networking or OS services are changed."""
import copy
import contextlib
import io
import json
from pathlib import Path
import unittest
from unittest import mock
import switch_mode as m

BOX_IP = "100.80.81.66"
PUBLIC_IP = "203.0.113.10"


def state(role, mode):
    personal = mode == "personal" or role == "mac"
    exit_id = m.BOX_NODE if role == "mac" and mode == "personal" else ""
    if role == "box" and mode == "nthusa":
        exit_id = m.NAS_NODE
    return {"status": {"BackendState": "Running", "CurrentTailnet": {
        "Name": m.PERSONAL if personal else m.NTHUSA},
        "Self": {"HostName": "box" if role == "box" else "Mac",
                 "OS": "linux" if role == "box" else "macOS",
                 "ExitNodeOption": role == "box" and personal},
        "Peer": {"box": {"ID": m.BOX_NODE, "Online": True,
                         "ExitNodeOption": True, "TailscaleIPs": [BOX_IP]},
                 "nas": {"ID": m.NAS_NODE, "TailscaleIPs": [m.NAS_IP]}}},
        "prefs": {"ExitNodeID": exit_id, "ExitNodeIP": "", "ExitNodeAllowLANAccess": True,
                  "CorpDNS": not personal, "RouteAll": False,
                  "AdvertiseRoutes": list(m.DEFAULT_ROUTES) if role == "box" and personal else []},
        "profiles": [{"id": pid, "selected": name == mode} for name, pid in m.PROFILES.items()] if role == "box" else []}


class FakeHost(m.Host):
    def __init__(self, role, mode):
        super().__init__(role, "/fake/tailscale")
        self.states = {key: state(role, key) for key in ("personal", "nthusa")}
        self.current = mode
        self.commands = []
        self.events = []
        self.ip = PUBLIC_IP
        self.fail_set_once = False

    def inspect(self):
        return copy.deepcopy(self.states[self.current])

    def check_forwarding(self):
        pass

    def public_ip(self):
        return self.ip

    def ts(self, *args):
        self.commands.append(args)
        self.events.append(args[0])
        if args[0] == "switch":
            self.current = next(k for k, v in m.PROFILES.items() if v == args[1])
            for profile in self.states[self.current]["profiles"]:
                profile["selected"] = profile["id"] == args[1]
        elif args[0] == "status":
            return json.dumps(self.states[self.current]["status"])
        elif args[0] == "set":
            if self.fail_set_once:
                self.fail_set_once = False
                raise RuntimeError("simulated local configuration failure")
            p = self.states[self.current]["prefs"]
            for arg in args[1:]:
                key, value = arg.split("=", 1)
                if key == "--exit-node":
                    p["ExitNodeID"] = {BOX_IP: m.BOX_NODE, m.NAS_IP: m.NAS_NODE, "": ""}[value]
                    p["ExitNodeIP"] = ""
                elif key == "--advertise-exit-node":
                    p["AdvertiseRoutes"] = list(m.DEFAULT_ROUTES) if value == "true" else []
                else:
                    field = {"--exit-node-allow-lan-access": "ExitNodeAllowLANAccess",
                             "--accept-dns": "CorpDNS", "--accept-routes": "RouteAll"}[key]
                    p[field] = value == "true"
        return ""

    def recovery(self, role, snapshot):
        parent = self
        class FakeRecovery:
            directory = Path("/fake/recovery")
            def __init__(self):
                parent.events.append("arm")
            def disarm(self):
                parent.events.append("disarm")
        return FakeRecovery()

    def apply(self, mode, box_ip=BOX_IP):
        return m.apply(self, mode, box_ip, PUBLIC_IP, recovery_factory=self.recovery)


class SwitchTests(unittest.TestCase):
    def test_on_off_cli_plans_do_not_change_networking(self):
        for mode, expected in (("on", True), ("off", False)):
            h = FakeHost("box", "personal")
            output = io.StringIO()
            with mock.patch.object(m.sys, "argv", ["switch_mode.py", "plan", "--role", "box", "--mode", mode]), \
                 mock.patch.object(m.sys, "platform", "linux"), \
                 mock.patch.object(m.socket, "gethostname", return_value="box"), \
                 mock.patch.object(m, "Host", return_value=h), \
                 contextlib.redirect_stdout(output):
                m.main()
            plan = json.loads(output.getvalue())
            self.assertEqual(plan["target_mode"], mode)
            self.assertEqual(plan["already_selected"], expected)
            self.assertFalse(plan["mutation_performed"])
            self.assertEqual(h.commands, [])
            self.assertEqual(h.events, [])

    def test_box_personal_is_direct_and_approved(self):
        h = FakeHost("box", "nthusa")
        self.assertTrue(h.apply("personal")["changed"])
        self.assertTrue(h.desired(h.inspect(), "personal"))
        self.assertEqual(h.events[0], "arm")
        self.assertEqual(h.events[-1], "disarm")

    def test_box_nthusa_uses_nas_and_stops_offering_exit(self):
        h = FakeHost("box", "personal")
        h.apply("nthusa")
        self.assertTrue(h.desired(h.inspect(), "nthusa"))

    def test_failure_after_profile_switch_restores_previous_state(self):
        h = FakeHost("box", "personal")
        before = h.inspect()
        h.fail_set_once = True
        with self.assertRaisesRegex(RuntimeError, "recovery completed"):
            h.apply("nthusa")
        self.assertEqual(h.inspect(), before)
        self.assertEqual(h.events[-1], "disarm")

    def test_mac_nthusa_clears_exit_without_switching_network(self):
        h = FakeHost("mac", "personal")
        h.apply("nthusa")
        self.assertTrue(h.desired(h.inspect(), "nthusa"))
        self.assertEqual(m.network(h.inspect()), m.PERSONAL)
        self.assertFalse(any(command[0] == "switch" for command in h.commands))

    def test_mac_wrong_egress_recovers_to_no_exit(self):
        h = FakeHost("mac", "nthusa")
        h.ip = "203.0.113.99"
        with self.assertRaisesRegex(RuntimeError, "recovery completed"):
            h.apply("personal")
        self.assertTrue(h.desired(h.inspect(), "nthusa"))

    def test_working_mode_is_not_bounced(self):
        for role in ("box", "mac"):
            h = FakeHost(role, "personal")
            self.assertFalse(h.apply("personal")["changed"])
            self.assertEqual(h.commands, [])
            self.assertEqual(h.events, [])

    def test_existing_broken_mac_exit_is_cleared(self):
        h = FakeHost("mac", "personal")
        h.ip = "203.0.113.99"
        with self.assertRaisesRegex(RuntimeError, "does not match"):
            h.apply("personal")
        self.assertTrue(h.desired(h.inspect(), "nthusa"))

    def test_missing_approval_prevents_mac_mutation(self):
        h = FakeHost("mac", "nthusa")
        h.states["nthusa"]["status"]["Peer"]["box"]["ExitNodeOption"] = False
        with self.assertRaisesRegex(RuntimeError, "approved"):
            h.apply("personal")
        self.assertEqual(h.commands, [])
        self.assertEqual(h.events, [])

    def test_unverified_box_address_prevents_mac_mutation(self):
        h = FakeHost("mac", "nthusa")
        with self.assertRaisesRegex(RuntimeError, "does not belong"):
            h.apply("personal", box_ip="100.1.2.3")
        self.assertEqual(h.commands, [])


if __name__ == "__main__":
    unittest.main()
