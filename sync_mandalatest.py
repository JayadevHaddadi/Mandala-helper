import paramiko
import os
import stat
import time
import json

sftp_config_path = r"d:\GitHub\Mandala-helper\bga-mandala\sftp.json"
with open(sftp_config_path, "r") as f:
    config = json.load(f)

host = config.get("host", "1.studio.boardgamearena.com")
port = int(config.get("port", 2022))
username = config.get("username")
password = config.get("password")
remote_base = "mandalatest"
local_base = r"d:\GitHub\Mandala-helper\bga-mandalatest"

t0 = time.time()
print(f"Connecting to {host}:{port}...")
transport = paramiko.Transport((host, port))
transport.connect(username=username, password=password)
sftp = paramiko.SFTPClient.from_transport(transport)

def sync_dir(local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass

    remote_attrs = {}
    try:
        for a in sftp.listdir_attr(remote_dir):
            remote_attrs[a.filename] = a
    except IOError:
        pass

    for item in os.listdir(local_dir):
        if item.startswith(".") or item == "sftp.json":
            continue
        l_path = os.path.join(local_dir, item)
        r_path = f"{remote_dir}/{item}"

        if os.path.isdir(l_path):
            sync_dir(l_path, r_path)
        else:
            l_stat = os.stat(l_path)
            # Only upload if file doesn't exist remotely or has different size/newer mtime
            needs_upload = True
            if item in remote_attrs:
                r_stat = remote_attrs[item]
                if r_stat.st_size == l_stat.st_size and int(r_stat.st_mtime) >= int(l_stat.st_mtime):
                    needs_upload = False

            if needs_upload:
                print(f"[SYNC] {item} -> {r_path}")
                sftp.put(l_path, r_path)

sync_dir(local_base, remote_base)
sftp.close()
transport.close()
print(f"Sync completed in {time.time() - t0:.2f}s!")
