---
name: home-vpn
description: Turn Hsi's home VPN on or off across box and Mac. On routes the Mac through box; off restores box to NTHUSA and clears the Mac exit node. Also check home VPN status.
---

# Home VPN

Use `$home-vpn on` or “home-vpn on” to enable the home VPN, `$home-vpn off` to disable it, and `$home-vpn status` for a read-only check. A bare “home-vpn” request needs an explicit on/off/status choice; do not guess or toggle the current state.

| Command | box | Mac |
| --- | --- | --- |
| `home-vpn on` | Personal profile, direct internet, approved exit node | Personal network, using box as exit node |
| `home-vpn off` | NTHUSA profile, using `nthusa-nas`; does not offer an exit node | Personal network, exit node None |

## Saved installation

- box is Linux. Saved profiles: `7f5e` (NTHUSA), `fba9` (personal).
- Personal network: `sago-cream.github`, suffix `tail849708.ts.net`.
- box's personal address: `100.80.81.66`; Mac: `100.104.90.95`.
- NTHUSA network: `nthu-sa.org.github`; upstream exit: `nthusa-nas`, `100.90.147.102`.
- Mac T3 environment: `c7236259-0de3-454b-ad8c-c97edf265e6e`, Hsi's MacBook Air. Confirm with `t3_environment_links`; saved links can expire.
- Forwarding and personal exit-node approval already exist. Routine switching reuses profiles and needs no API token or reauthentication.

## Execute on each host

Use [scripts/switch_mode.py](scripts/switch_mode.py). Status and plan are read-only:

```sh
python3 scripts/switch_mode.py status --role box --public-ip
python3 scripts/switch_mode.py plan --role box --mode off
```

The helper changes one host at a time; coordinate hosts in the order below. Box `apply` runs as root so its systemd recovery timer can restore a profile even if operator permissions change. Use the environment's secure secret tool for sudo when needed; never store a password here.

For the Mac, use its linked T3 environment. If no remote command tool is exposed, **delegate the Mac operation** with `delegate_task`, `target.environmentId` set to the confirmed Mac environment, and `mode: wait`. Follow current capability/wait rules and inherit provider/model/settings. Include the exact helper source in the task so the child can save it to a private temporary directory and run it locally: box paths are not shared with the Mac. Specify the requested command, no unrelated changes, and no further delegation. Do not create a top-level thread for this. Use an existing SSH route only after confirming it is independent of the departing tailnet.

If Mac automation is unavailable, have the user make the indicated menu change and verify it before continuing. The user is on the Mac; a browser opened on box cannot change Mac settings.

## Preflight

1. Inspect both hosts. Confirm identities and saved profiles. Do not use login, logout, profile deletion, or forced reauthentication for routine switching.
2. Inspect T3's current transport on box with `ss -tnp` and route lookups. Confirm control remains available when leaving the active tailnet. T3 has used a Cloudflare tunnel over Wi-Fi here; verify this afresh. If control depends solely on the departing tailnet, establish an independent control path first.
3. Keep the Mac on its personal network in both modes; preserve its DNS and unrelated VPN preferences.

## Turn on

1. Clear any unavailable exit node on the Mac first and verify ordinary internet access.
2. Box: `sudo python3 <helper> apply --role box --mode on`. Optionally add `--control-url <known-local-T3-HTTP-url>`. The helper arms recovery, selects the saved profile, offers an exit node, checks forwarding, approval and internet access, then cancels recovery. Read the returned box address and `public_ip`.
3. Mac: `python3 <helper> apply --role mac --mode on --box-ip <fresh-box-personal-IP> --expected-ip <fresh-box-public-IP>`. A launchd watchdog clears the exit node after two minutes if the operation does not finish. The helper checks box is online/approved and compares the Mac's public IPv4 with box's before cancelling recovery.
4. Verify both hosts and the T3 environment link. Manual Mac equivalent: Tailscale → Exit Nodes → box, then confirm browsing works. Distinguish manual confirmation from CLI verification.

## Turn off

1. **Mac first:** `python3 <helper> apply --role mac --mode off`. This clears its exit node and checks internet access. Manual equivalent: Tailscale → Exit Nodes → None. Do not switch box away while the Mac depends on it.
2. **Box second:** `sudo python3 <helper> apply --role box --mode off`. This disables advertising, selects `nthusa-nas`, and allows direct LAN access. Recovery restores the previous profile/settings if validation fails.
3. Verify both hosts and T3. The Mac stays on its personal network with no exit node.

## Recovery and completion

- An already correct host is a verified no-op. Do not toggle live networking to demonstrate the skill.
- Each host commits after its own checks; this is not an atomic two-host transaction. If a later step fails, leave the Mac with exit node None, retain the last verified box state, report the partial mode, and stop. Do not loop network mutations.
- Confirm watchdog cancellation after success. If recovery fails, preserve its snapshot/timer; do not delete recovery files or kill its worker.
- If a saved login expired or approval was removed, stop routine switching and request only the needed sign-in/admin action. Never replace an identity silently.
- Report the actual box network/exit node, Mac exit-node choice, and connection checks. Changing box alone is not a completed two-host switch.
