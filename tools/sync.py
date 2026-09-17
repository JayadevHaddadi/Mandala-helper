#!/usr/bin/env python3
"""
Board Game Arena (BGA) Universal Delta-Sync Tool
Synchronizes local game files to remote BGA Studio SFTP repository.

Usage:
    python tools/sync.py pushfighttest
    python tools/sync.py mandalatest
    python tools/sync.py mandala
    python tools/sync.py lordsofscotlandtest
    python tools/sync.py pushfighttest --dry-run
"""

import os
import sys
import json
import time
import posixpath
import argparse
import paramiko

# Root workspace directory
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Known game targets mapping: target_alias -> (local_subpath, remote_folder)
TARGET_MAP = {
    "pushfight": ("games/pushfight/bga", "pushfighttest"),
    "pushfighttest": ("games/pushfight/bga", "pushfighttest"),
    "mandala": ("games/mandala/bga-prod", "mandala"),
    "mandalatest": ("games/mandala/bga-test", "mandalatest"),
    "lordsofscotland": ("games/lordsofscotland/bga", "lordsofscotlandtest"),
    "lordsofscotlandtest": ("games/lordsofscotland/bga", "lordsofscotlandtest"),
}

def load_credentials():
    config_paths = [
        os.path.join(ROOT_DIR, "tools", "sftp.config.json"),
        os.path.join(ROOT_DIR, "games", "mandala", "bga-prod", "sftp.json"),
    ]
    for p in config_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("Could not find SFTP configuration in tools/sftp.config.json")

def connect_sftp(host, port, username, password, max_retries=3, timeout=10):
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Connecting to {host}:{port} as {username} (attempt {attempt}/{max_retries})...")
            transport = paramiko.Transport((host, port))
            transport.banner_timeout = timeout
            transport.connect(username=username, password=password)
            sftp = paramiko.SFTPClient.from_transport(transport)
            return transport, sftp
        except Exception as e:
            print(f"Connection attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(3)
    raise ConnectionError(f"Failed to connect to {host}:{port} after {max_retries} attempts.")

def sync_directory(sftp, local_dir, remote_dir, dry_run=False):
    uploaded = 0
    skipped = 0

    if not dry_run:
        try:
            sftp.mkdir(remote_dir)
        except IOError:
            pass

    remote_attrs = {}
    if not dry_run:
        try:
            for a in sftp.listdir_attr(remote_dir):
                remote_attrs[a.filename] = a
        except IOError:
            pass

    ignore_set = {".git", ".vscode", ".gitignore", "node_modules", "sftp.json", "sftp.config.json", ".DS_Store", "__pycache__"}

    for item in sorted(os.listdir(local_dir)):
        if item in ignore_set or item.endswith(".pyc"):
            continue

        l_path = os.path.join(local_dir, item)
        r_path = posixpath.join(remote_dir, item)

        if os.path.isdir(l_path):
            u, s = sync_directory(sftp, l_path, r_path, dry_run=dry_run)
            uploaded += u
            skipped += s
        else:
            l_stat = os.stat(l_path)
            needs_upload = True

            if not dry_run and item in remote_attrs:
                r_stat = remote_attrs[item]
                if r_stat.st_size == l_stat.st_size and int(r_stat.st_mtime) >= int(l_stat.st_mtime):
                    needs_upload = False

            if needs_upload:
                action = "[DRY-RUN UPLOAD]" if dry_run else "[SYNC]"
                print(f"{action} {item} -> {r_path} ({l_stat.st_size} bytes)")
                if not dry_run:
                    sftp.put(l_path, r_path)
                uploaded += 1
            else:
                skipped += 1

    return uploaded, skipped

def main():
    parser = argparse.ArgumentParser(description="BGA Multi-Game Universal SFTP Sync Tool")
    parser.add_argument("target", help=f"Game target to sync. Supported: {', '.join(TARGET_MAP.keys())} or custom <local_dir>")
    parser.add_argument("remote_dir", nargs="?", default=None, help="Remote destination directory (optional if target is known)")
    parser.add_argument("--dry-run", action="store_true", help="Preview files that would be uploaded without connecting/uploading")

    args = parser.parse_args()
    target_key = args.target.lower()

    if target_key in TARGET_MAP:
        local_rel, remote_base = TARGET_MAP[target_key]
        local_base = os.path.join(ROOT_DIR, local_rel)
    else:
        local_base = os.path.abspath(args.target)
        remote_base = args.remote_dir or os.path.basename(local_base)

    if not os.path.exists(local_base):
        print(f"Error: Local directory does not exist: {local_base}")
        sys.exit(1)

    print(f"=== BGA Universal Sync: {target_key.upper()} ===")
    print(f"Local:  {local_base}")
    print(f"Remote: {remote_base}")
    print(f"Mode:   {'DRY-RUN (No Upload)' if args.dry_run else 'LIVE SFTP UPLOAD'}\n")

    cfg = load_credentials()
    host = cfg.get("host", "1.studio.boardgamearena.com")
    port = int(cfg.get("port", 2022))
    username = cfg["username"]
    password = cfg["password"]

    t0 = time.time()

    if args.dry_run:
        print("[DRY-RUN] Simulating upload without SFTP connection...")
        uploaded, skipped = sync_directory(None, local_base, remote_base, dry_run=True)
        print(f"\n[DRY-RUN COMPLETE] Would upload {uploaded} files ({skipped} unchanged) in {time.time() - t0:.2f}s.")
        return

    transport, sftp = connect_sftp(host, port, username, password)
    try:
        uploaded, skipped = sync_directory(sftp, local_base, remote_base, dry_run=False)
        print(f"\n[SUCCESS] Synced {uploaded} file(s) ({skipped} unchanged) in {time.time() - t0:.2f}s!")
    finally:
        sftp.close()
        transport.close()

if __name__ == "__main__":
    main()
