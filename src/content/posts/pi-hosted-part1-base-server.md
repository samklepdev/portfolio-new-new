---
title: 'Turning a Raspberry Pi into a Docker + Portainer Home Server (Base Setup)'
excerpt: 'Part 1 of building a self-hosted mini server on a Raspberry Pi: the base-image build — flash Raspberry Pi OS, install Docker and Portainer, load a bigger app-template catalog, and add a browser-based SSH terminal.'
publishedAt: '2026-10-25'
tags:
  - Raspberry Pi
  - Docker
  - Self-Hosting
status: 'draft'
---

## What you'll need

- A Raspberry Pi (any RAM size works for the base setup)
- A USB hard drive — SSD or spindle. The build uses a 1 TB drive and boots directly from it, **no SD card**. Because the Pi doesn't strictly need an SD card to boot, keeping everything on the USB drive means you can later move the drive to a different Pi and it'll just work, no reconfiguration.
- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) on your desktop
- Network access to the Pi (this is a headless build — no monitor attached)

---

## Step 1 — Create an SSH key pair

Since this is a headless build with no monitor, set up key-based SSH up front — it's more secure than passwords and it's the only practical time to bake it in before first boot.

On your **desktop machine**, check whether you already have a key:

```bash
ls ~/.ssh/id_ed25519.pub
```

If that file doesn't exist, generate one:

```bash
ssh-keygen -t ed25519 -C "pi-server"
```

Press Enter to accept the default path, and set a passphrase if you want one. You now have a private key (`~/.ssh/id_ed25519`, keep this secret) and a public key (`~/.ssh/id_ed25519.pub`, safe to share). You'll paste the **public** key into the Imager in the next step. To view it:

```bash
cat ~/.ssh/id_ed25519.pub
```

---

## Step 2 — Flash Raspberry Pi OS Lite

1. Open **Raspberry Pi Imager**.
2. **Choose OS → Raspberry Pi OS Lite** (the minimal server image, no desktop environment).
3. Open the advanced settings with **`Ctrl` + `Shift` + `X`** and set:
   - **Disable overscan** (prevents the black border)
   - **Hostname** — e.g. `rpi-server`
   - **Enable SSH → Allow public-key authentication only.** Paste the contents of your `~/.ssh/id_ed25519.pub` into the authorized-keys box. (Imager may auto-fill this from the key it finds on your machine — confirm it's the right one.) This disables SSH password login entirely.
   - **Username and password** — still set these; the account needs a password for `sudo` and console access even though SSH itself will be key-only. Pick a real password rather than leaving a default.
   - **Wi-Fi** (optional) — only needed if this won't be on Ethernet. Note you'll be limited by wireless speed.
   - **Locale + keyboard layout**
   - Skip the first-run wizard and disable "eject media"
4. Plug in the USB drive, select it as the **storage** target, and **write** the image. Lite is tiny, so this is fast — optionally run the verify pass (a few seconds).
5. Move the drive to the Pi and power it on.

> **Note:** First boot can take a little longer than expected while the filesystem resizes to fill the whole drive.

> **Already flashed with a password?** If your Pi is already running with password SSH enabled, you don't need to re-flash — set the key up after the fact from your **desktop**:
>
> ```bash
> ssh-copy-id <your-username>@<your-pi-ip>
> ```
>
> Enter the account password once; this appends your public key to the Pi's `~/.ssh/authorized_keys`. If `ssh-copy-id` isn't available, do it manually:
>
> ```bash
> ssh <your-username>@<your-pi-ip> \
>   "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" \
>   < ~/.ssh/id_ed25519.pub
> ```
>
> Confirm key login works (SSH back in — it should not ask for the account password), then disable password auth on the Pi:
>
> ```bash
> echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/99-disable-passwords.conf
> sudo systemctl restart ssh
> ```

---

## Step 3 — First boot and system update

SSH into the Pi using the username and hostname/IP you set. Because you loaded your public key, this logs in with your key automatically (you'll be prompted for the key's passphrase if you set one, not for the account password):

```bash
ssh <your-username>@<your-pi-ip>
```

> If the key isn't at the default path, point to it explicitly with `ssh -i ~/.ssh/id_ed25519 <your-username>@<your-pi-ip>`.

Update the package lists and upgrade everything:

```bash
sudo apt update
sudo apt upgrade
```

> If a kernel update is included, expect this to take ~15 minutes. Reboot afterward:

```bash
sudo reboot
```

---

## Step 4 — Install Docker

Docker keeps each service in its own isolated container, separate from the host system, so a container needing an older runtime (say, an older Python) won't disrupt the Pi's system version.

Install git, then clone the helper repo that holds the install scripts:

```bash
sudo apt install git
git clone https://github.com/novaspirit/pi-hosted
cd pi-hosted
```

Run the Docker install script:

```bash
./install_docker.sh
```

**What that script actually does** — if you'd rather run it by hand, it's just:

```bash
# Install Docker via the official convenience script
curl -sSL https://get.docker.com | sh

# Add your user to the docker group so you don't need sudo for every command
sudo usermod -aG docker $USER
```

**Log out and back in** so the new group membership takes effect:

```bash
exit
# then SSH back in
```

Verify you're in the `docker` group:

```bash
groups
```

You should see `docker` in the list.

---

## Step 5 — Install Portainer

Portainer is a clean web GUI for managing Docker — deploying containers, changing ports and volume paths, and so on. Run the install script:

```bash
./install_portainer.sh
```

**What that script actually does** — the manual equivalent:

```bash
# Create a config folder for Portainer's persistent data
sudo mkdir -p /portainer/Files/AppData/Config/portainer

# Pull the latest Portainer Community Edition image
sudo docker pull portainer/portainer-ce:latest

# Run it: web UI on 9000 (http) and 9443 (https), auto-restart,
# mount the Docker socket so Portainer can manage the host's Docker,
# and persist its data to the config folder above
sudo docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /portainer/Files/AppData/Config/portainer:/data \
  portainer/portainer-ce:latest
```

Then set it up in the browser:

1. Go to `http://<your-pi-ip>:9000`.
2. On first login, **create your admin username and password**.
3. Select the local **Docker** environment and click **Connect**.

You'll land in the Portainer dashboard with a single running container: Portainer itself.

---

## Step 6 — Load a bigger app-template catalog

Portainer's default **App Templates** list is small and generic. Swap in the community **SelfhostedPro** catalog for a much larger set of ready-to-deploy apps.

1. In Portainer, go to **Settings**.
2. Replace the **App Templates URL** with the SelfhostedPro **V2 (non-OMV)** template:

   ```
   https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/master/Template/portainer-v2.json
   ```

   > Use the plain V2 template, **not** the OMV variant, unless you're running OpenMediaVault.
3. Click **Save settings**.
4. Open **App Templates** again — you'll now see a far longer list of deployable services.

> This is just one community catalog; others exist. This one covers the services we'll install in later parts.

---

## Step 7 — Add Shell In A Box (browser-based SSH)

Shell In A Box gives you a web-based terminal, so you can jump into a shell from a browser instead of always opening an SSH client.

```bash
sudo apt install shellinabox
```

Access it in a browser — it requires **https**:

```
https://<your-pi-ip>:4200
```

Accept the self-signed certificate warning, then log in with your Pi credentials. You now have a web shell for quick config work.

---

## Where this leaves you

The base is done. You've got:

- Raspberry Pi OS Lite, fully updated, booting from a USB drive
- **Docker** installed
- **Portainer** running on port 9000, with an expanded app-template catalog
- **Shell In A Box** for browser-based terminal access

**Next up:** installing services into Portainer — starting with a dashboard (Homer) to tie everything together.

---

### A note on security

SSH is already locked to key-based auth from Step 2, which is a solid start. A few more things before exposing anything beyond your local network: use a strong Portainer admin password, keep the account password strong (it still guards `sudo`), and if you want to go further, confirm password SSH is off by checking that `PasswordAuthentication no` is set in `/etc/ssh/sshd_config` (or a file under `/etc/ssh/sshd_config.d/`). Never expose Portainer's ports directly to the internet — put it behind a VPN or reverse proxy if you need remote access.
