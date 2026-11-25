#!/usr/bin/env python3
"""Apply one host's part of Hsi's home VPN on/off switch."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import plistlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid

PERSONAL = "sago-cream.github"
NTHUSA = "nthu-sa.org.github"
PROFILES = {"personal": "fba9", "nthusa": "7f5e"}
BOX_NODE = "nN6DM37mXG11CNTRL"
NAS_NODE = "nLJTAqH9iJ11CNTRL"
NAS_IP = "100.90.147.102"
MODES = {"on": "personal", "off": "nthusa"}
DEFAULT_ROUTES = {"0.0.0.0/0", "::/0"}


def run(args, timeout=20):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE,
        timeout=timeout, env=dict(os.environ, SHLVL="1")).strip()


def tailscale_binary():
    binary = shutil.which("tailscale")
    if binary:
        return str(Path(binary).resolve())
    binary = Path("/Applications/Tailscale.app/Contents/MacOS/Tailscale")
    if binary.is_file():
        return str(binary)
    raise RuntimeError("Tailscale CLI not found.")


def network(state):
    return (state["status"].get("CurrentTailnet") or {}).get("Name")


class Host:
    def __init__(self, role, binary=None):
        self.role = role
        self.binary = binary or tailscale_binary()

    def ts(self, *args):
        return run([self.binary, *args], timeout=8)

    def inspect(self):
        return {"status": json.loads(self.ts("status", "--json")),
                "prefs": json.loads(self.ts("debug", "prefs")),
                "profiles": json.loads(self.ts("switch", "--list", "--json")) if self.role == "box" else []}

    def public_ip(self):
        with urllib.request.urlopen("https://api.ipify.org", timeout=12) as response:
            value = response.read(100).decode().strip()
        if ipaddress.ip_address(value).version != 4:
            raise RuntimeError("Expected a public IPv4 address.")
        return value

    def check_forwarding(self):
        for path in ("/proc/sys/net/ipv4/ip_forward", "/proc/sys/net/ipv6/conf/all/forwarding"):
            if Path(path).read_text().strip() != "1":
                raise RuntimeError("Repair persistent IP forwarding before switching.")

    def snapshot(self, state):
        p, s = state["prefs"], state["status"]
        if self.role == "mac":
            return {"role": "mac", "binary": self.binary}
        profile = next((v["id"] for v in state["profiles"] if v.get("selected")), None)
        exit_ip = p.get("ExitNodeIP") or ""
        if p.get("ExitNodeID"):
            peer = next((v for v in s.get("Peer", {}).values() if v.get("ID") == p["ExitNodeID"]), {})
            if not peer.get("TailscaleIPs"):
                raise RuntimeError("Cannot identify current exit node for recovery.")
            exit_ip = peer["TailscaleIPs"][0]
        if self.role == "box" and not profile:
            raise RuntimeError("Cannot identify current profile for recovery.")
        return {"role": self.role, "binary": self.binary, "profile": profile,
                "exit_ip": exit_ip, "lan": bool(p.get("ExitNodeAllowLANAccess")),
                "advertise": DEFAULT_ROUTES.issubset(p.get("AdvertiseRoutes") or []),
                "dns": bool(p.get("CorpDNS")), "routes": bool(p.get("RouteAll"))}

    def preflight(self, state, mode, expected_ip, box_ip):
        if self.role == "box":
            if not set(PROFILES.values()).issubset({v["id"] for v in state["profiles"]}):
                raise RuntimeError("A saved box profile is missing; do not reauthenticate automatically.")
            if state["status"].get("Self", {}).get("HostName") != "box":
                raise RuntimeError("This is not the configured box.")
            if mode == "personal":
                self.check_forwarding()
        else:
            if network(state) != PERSONAL or state["status"].get("Self", {}).get("OS") != "macOS":
                raise RuntimeError("Run on the Mac already connected to the personal network.")
            if mode == "personal":
                if not expected_ip or ipaddress.ip_address(expected_ip).version != 4:
                    raise RuntimeError("Supply box's fresh public IPv4 with --expected-ip.")
                peer = next((v for v in state["status"].get("Peer", {}).values() if v.get("ID") == BOX_NODE), {})
                if not peer.get("Online") or not peer.get("ExitNodeOption"):
                    raise RuntimeError("box is not online as an approved exit node.")
                if box_ip not in peer.get("TailscaleIPs", []):
                    raise RuntimeError("--box-ip does not belong to the verified box peer.")

    def desired(self, state, mode):
        s, p = state["status"], state["prefs"]
        exit_id, exit_ip = p.get("ExitNodeID") or "", p.get("ExitNodeIP") or ""
        if s.get("BackendState") != "Running":
            return False
        if self.role == "mac":
            return exit_id == BOX_NODE if mode == "personal" else not exit_id and not exit_ip
        if network(state) != (PERSONAL if mode == "personal" else NTHUSA):
            return False
        advertised = DEFAULT_ROUTES.issubset(p.get("AdvertiseRoutes") or [])
        if mode == "personal":
            return (advertised and not exit_id and not exit_ip and not p.get("CorpDNS")
                    and not p.get("RouteAll") and s.get("Self", {}).get("ExitNodeOption", False))
        return (not advertised and exit_id == NAS_NODE and p.get("ExitNodeAllowLANAccess")
                and p.get("CorpDNS") and not p.get("RouteAll"))

    def mutate(self, mode, box_ip):
        if self.role == "mac":
            if mode == "personal":
                self.ts("set", "--exit-node=" + box_ip, "--exit-node-allow-lan-access=true")
            else:
                self.ts("set", "--exit-node=")
            return
        self.ts("switch", PROFILES[mode])
        s = json.loads(self.ts("status", "--json"))
        if (s.get("CurrentTailnet") or {}).get("Name") != (PERSONAL if mode == "personal" else NTHUSA):
            raise RuntimeError("Saved profile points to an unexpected tailnet.")
        if mode == "personal":
            self.ts("set", "--exit-node=", "--advertise-exit-node=true", "--accept-dns=false", "--accept-routes=false")
        else:
            self.ts("set", "--advertise-exit-node=false", "--exit-node=" + NAS_IP,
                    "--exit-node-allow-lan-access=true", "--accept-dns=true", "--accept-routes=false")

    def restore(self, snapshot):
        if self.role == "mac":
            self.ts("set", "--exit-node=")
            return
        self.ts("switch", snapshot["profile"])
        self.ts("set", "--exit-node=" + snapshot["exit_ip"],
                "--advertise-exit-node=" + str(snapshot["advertise"]).lower(),
                "--exit-node-allow-lan-access=" + str(snapshot["lan"]).lower(),
                "--accept-dns=" + str(snapshot["dns"]).lower(),
                "--accept-routes=" + str(snapshot["routes"]).lower())

    def verify(self, mode, expected_ip, control_url):
        deadline = time.monotonic() + 10
        while True:
            state = self.inspect()
            if self.desired(state, mode):
                break
            if time.monotonic() >= deadline:
                raise RuntimeError("Requested Tailscale state did not become ready.")
            time.sleep(0.5)
        public_ip = self.public_ip()
        if self.role == "mac" and mode == "personal" and public_ip != expected_ip:
            raise RuntimeError("Mac public IPv4 does not match box.")
        if control_url:
            with urllib.request.urlopen(control_url, timeout=5) as response:
                if response.status != 200:
                    raise RuntimeError("T3 local HTTP check failed.")
        return summary(state, self.role, public_ip)


def summary(state, role, public_ip=None):
    s, p = state["status"], state["prefs"]
    result = {"role": role, "network": network(state), "backend": s.get("BackendState"),
              "addresses": s.get("Self", {}).get("TailscaleIPs"),
              "exit_node_id": p.get("ExitNodeID") or "", "exit_node_ip": p.get("ExitNodeIP") or "",
              "advertised_routes": p.get("AdvertiseRoutes") or [],
              "approved_exit_node": bool(s.get("Self", {}).get("ExitNodeOption"))}
    if role == "box":
        result["profiles"] = [{k: v.get(k) for k in ("id", "tailnet", "selected")} for v in state["profiles"]]
    if public_ip:
        result["public_ip"] = public_ip
    return result


class Recovery:
    def __init__(self, role, snapshot):
        self.role = role
        self.directory = Path(tempfile.mkdtemp(prefix="home-vpn-"))
        path = self.directory / "snapshot.json"
        path.write_text(json.dumps(snapshot))
        path.chmod(0o600)
        self.label = "dev.hsichen.home-vpn-" + uuid.uuid4().hex
        command = [sys.executable, str(Path(__file__).resolve()), "_rollback", "--snapshot", str(path)]
        if role == "box":
            run(["systemd-run", "--unit=" + self.label, "--on-active=120s",
                 "--timer-property=AccuracySec=1s", *command])
            if run(["systemctl", "is-active", self.label + ".timer"]) != "active":
                raise RuntimeError("Recovery did not arm; no network change attempted.")
        else:
            self.domain = "gui/" + str(os.getuid())
            plist = self.directory / "recovery.plist"
            plist.write_bytes(plistlib.dumps({"Label": self.label, "RunAtLoad": True,
                "ProgramArguments": command + ["--delay", "120"],
                "StandardOutPath": str(self.directory / "recovery.log"),
                "StandardErrorPath": str(self.directory / "recovery.log")}))
            run(["launchctl", "bootstrap", self.domain, str(plist)])
            run(["launchctl", "print", self.domain + "/" + self.label])

    def disarm(self):
        if self.role == "box":
            run(["systemctl", "stop", self.label + ".timer"])
            if run(["systemctl", "show", self.label + ".timer", "-p", "ActiveState", "--value"]) != "inactive":
                raise RuntimeError("Recovery timer is still active.")
        else:
            run(["launchctl", "bootout", self.domain + "/" + self.label])
        shutil.rmtree(self.directory)


def apply(host, mode, box_ip, expected_ip=None, control_url=None, recovery_factory=Recovery):
    state = host.inspect()
    host.preflight(state, mode, expected_ip, box_ip)
    if host.desired(state, mode):
        try:
            result = host.verify(mode, expected_ip, control_url)
        except Exception:
            if host.role == "mac" and mode == "personal":
                host.restore({"role": "mac"})
            raise
        result["changed"] = False
        return result
    snapshot = host.snapshot(state)
    recovery = recovery_factory(host.role, snapshot)
    try:
        host.mutate(mode, box_ip)
        result = host.verify(mode, expected_ip, control_url)
    except Exception as error:
        try:
            host.restore(snapshot)
            recovery.disarm()
        except Exception as restore_error:
            raise RuntimeError("Switch and recovery failed. Keep watchdog files at "
                               + str(recovery.directory) + ": " + str(restore_error)) from error
        raise RuntimeError("Switch failed; recovery completed: " + str(error)) from error
    recovery.disarm()
    result["changed"] = True
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("action", choices=("status", "plan", "apply", "_rollback"))
    p.add_argument("--role", choices=("box", "mac"))
    p.add_argument("--mode", choices=("on", "off"))
    p.add_argument("--box-ip", default="100.80.81.66")
    p.add_argument("--expected-ip")
    p.add_argument("--public-ip", action="store_true")
    p.add_argument("--control-url")
    p.add_argument("--snapshot", type=Path)
    p.add_argument("--delay", type=int, default=0)
    a = p.parse_args()
    if a.action == "_rollback":
        if not a.snapshot:
            p.error("--snapshot is required")
        time.sleep(a.delay)
        snapshot = json.loads(a.snapshot.read_text())
        Host(snapshot["role"], snapshot["binary"]).restore(snapshot)
        print(json.dumps({"recovered": snapshot["role"]}))
        return
    if not a.role:
        p.error("--role is required")
    if a.role == "box" and (sys.platform != "linux" or socket.gethostname().split(".")[0] != "box"):
        p.error("box commands must run on the configured Linux box")
    if a.role == "mac" and sys.platform != "darwin":
        p.error("Mac commands must run on the Mac")
    if a.action in ("apply", "plan") and not a.mode:
        p.error("--mode is required")
    host = Host(a.role)
    if a.action == "apply":
        if a.role == "box" and os.geteuid() != 0:
            p.error("Run box apply through sudo so recovery has root privileges")
        result = apply(host, MODES[a.mode], a.box_ip, a.expected_ip, a.control_url)
        result["home_vpn"] = a.mode
    else:
        state = host.inspect()
        result = summary(state, a.role, host.public_ip() if a.public_ip else None)
        if a.action == "plan":
            result.update(target_mode=a.mode, already_selected=bool(host.desired(state, MODES[a.mode])), mutation_performed=False)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.SubprocessError, OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            print(error.stderr.strip(), file=sys.stderr)
        sys.exit(1)
