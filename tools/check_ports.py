#!/usr/bin/env python3
"""
Diagnostic tool to test network port reachability.
Checks if outbound ports (specifically SFTP port 2022) are blocked by the network/firewall,
and tests connectivity to Board Game Arena Studio servers.
"""

import socket
import concurrent.futures

TARGETS = [
    # BGA Studio targets
    ("1.studio.boardgamearena.com", 2022, "BGA Studio SFTP"),
    ("1.studio.boardgamearena.com", 443,  "BGA Studio HTTPS"),
    ("studio.boardgamearena.com",   443,  "BGA Studio Portal"),
    # General outbound port tests (via portquiz.net which listens on all ports)
    ("portquiz.net", 80,   "Web HTTP"),
    ("portquiz.net", 443,  "Web HTTPS"),
    ("portquiz.net", 22,   "SSH Default"),
    ("portquiz.net", 2022, "SFTP Custom Port (BGA standard)"),
    ("portquiz.net", 21,   "FTP Default"),
]

def check_target(host, port, desc, timeout=2.5):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        return (host, port, desc, True, "OPEN")
    except socket.timeout:
        return (host, port, desc, False, "BLOCKED (Timeout)")
    except ConnectionRefusedError:
        return (host, port, desc, False, "Connection Refused")
    except Exception as e:
        return (host, port, desc, False, f"FAILED ({type(e).__name__})")
    finally:
        s.close()

def main():
    print("=" * 65)
    print("       NETWORK & BGA PORT CONNECTIVITY DIAGNOSTIC")
    print("=" * 65)
    print(f"{'Target Host':<28} {'Port':<6} {'Description':<20} {'Status'}")
    print("-" * 65)

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(check_target, h, p, d) for h, p, d in TARGETS]
        for f in concurrent.futures.as_completed(futures):
            host, port, desc, is_open, status = f.result()
            symbol = "[OK]  " if is_open else "[FAIL]"
            print(f"{symbol} {host:<22} {port:<6} {desc:<20} {status}")

    print("=" * 65)

if __name__ == "__main__":
    main()
