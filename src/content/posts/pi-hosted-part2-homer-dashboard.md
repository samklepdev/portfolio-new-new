---
title: 'Installing the Homer Dashboard on Your Raspberry Pi Server (Portainer)'
excerpt: 'Part 2 of the self-hosted Raspberry Pi mini-server series: deploy Homer, a lightweight dashboard, through Portainer so every service you install lands in one clean, clickable place.'
publishedAt: '2026-10-25'
tags:
  - Raspberry Pi
  - Docker
  - Self-Hosting
status: 'draft'
---

## What you'll need

- A working Part 1 setup: **Portainer** running on port `9000`, with the **SelfhostedPro V2 app templates** already loaded
- **Shell In A Box** available at `https://<your-pi-ip>:4200` (we'll use it to edit config files in the browser)
- Your Pi's IP address (examples below use `<your-pi-ip>`)

> **About Homer:** it's a dead-simple static homepage driven entirely by a single `config.yml` file. There's no settings GUI — all customization happens by editing that YAML file, which we'll do over Shell In A Box.

---

## Step 1 — Deploy Homer from the app template

1. In Portainer, go to **App Templates** and click **Homer**.
2. Before deploying, open the container's details so you understand the two settings that matter:
   - **Port** — Homer listens on `8080` *inside* the container. Since `8080` is a very common port, the template remaps it to **`8902`** on the host (`8902:8080`). That means you'll reach Homer at `http://<your-pi-ip>:8902`.
   - **Volume / data folder** — inside the container, Homer keeps everything in `/www/assets`. The template binds that to the host at:
     ```
     /portainer/Files/AppData/Config/Homer/assets
     ```
     You can change this to anywhere you like (even your home folder), but if you do, mirror the same base path for the config bind. We'll leave the defaults.
   - **Image** — `b4bz/homer:latest`
3. Click **Deploy the container**. Portainer pulls the image, wires up the volume, and starts it.

You should now have **two** running containers: Portainer itself and Homer.

---

## Step 2 — Open Homer

In a browser, go to:

```
http://<your-pi-ip>:8902
```

You'll see Homer's default demo dashboard. There's a light/dark theme toggle in the corner (dark looks great). Everything else — the title, the service tiles, the colors — is configured in `config.yml`, which is what the rest of this guide covers.

---

## Step 3 — Open the config file

Homer has no right-click/settings menu, so jump into a shell to edit `config.yml`.

1. Open Shell In A Box at `https://<your-pi-ip>:4200` (remember it needs **https**; accept the self-signed cert warning) and log in.
2. Move into Homer's `assets` folder (tab-completion helps here):

   ```bash
   cd /portainer/Files/AppData/Config/Homer/assets
   ```

   Inside you'll find `config.yml` plus two folders worth knowing about:
   - **`icons/`** — favicons (the maskable / Safari-pinned-tab images)
   - **`tools/`** — sample app logos (`.png` files); this is where your custom service icons go

3. Open the config for editing. Editing these container-owned files requires root:

   ```bash
   sudo nano config.yml
   ```

> Save in nano with **`Ctrl` + `O`** then **Enter**. After each save, refresh the Homer tab in your browser to see the change.

---

## Step 4 — Set the title, subtitle, and logo

Near the top of `config.yml`:

- **`title`** — change the demo title to something like `Raspberry Pi Server`
- **`subtitle`** — the smaller text up top; set it to `Pi Hosted`
- **`logo` / `icon`** — you can keep the default logo, or swap in a [Font Awesome](https://fontawesome.com/) icon instead. For example, uncomment the `icon:` line and set it to a skull-and-crossbones (`fas fa-skull-crossbones`), and comment out the `logo:` line. Comment/uncomment by adding or removing the leading `#`.

Save (`Ctrl` + `O`, Enter) and refresh to confirm it applied.

**A couple of cleanups while you're here:**

- **Themes** — under the theme section you'll find `default`, `light`, and `dark`, with all colors as hex values. To fully re-theme, change those hex codes. (A palette generator is handy if you don't have a color scheme in mind.)
- **The demo message banner** — there's an optional `message:` block that renders the green "this is a dummy homepage" banner. Unless you want a broadcast message for multiple users, delete that block to reclaim the space, then save and refresh.
- **Top-right links** — the `links:` section controls the nav links in the header. Comment them out or customize them; it's a fine template to build from.

---

## Step 5 — Add your services

The `services:` section is where each app tile comes from. **This is a YAML file, so indentation is significant — spaces only, never tabs.** Match the existing spacing exactly (note the alternating two-space / one-space indentation); the easiest approach is to copy an existing item and rename its fields.

Each service entry uses fields like `name`, `subtitle`, `tag`, `url`, `target`, and `logo` (or `icon`).

**Add Shell In A Box** as your first tile:

```yaml
- name: "Shell In A Box"
  subtitle: "Web SSH"
  tag: "app"
  url: "https://<your-pi-ip>:4200"
  target: "_blank"
```

> `target: "_blank"` opens the service in a **new tab**. Without it, clicking the tile replaces the current Homer page.

**Add Portainer** as a second tile — note this one is **`http`**, not `https`, on port `9000`:

```yaml
- name: "Portainer"
  subtitle: "Docker"
  tag: "app"
  url: "http://<your-pi-ip>:9000"
  target: "_blank"
```

Save and refresh — both tiles should now be live and clickable. As you install more services in later parts, you'll keep adding entries here (and can group them into new categories by copying an existing `items:` block and following the same spacing).

---

## Step 6 — Use custom icons

Homer ships with a couple of sample logos in `assets/tools/`. To use your own, you just need a `.png`.

**Option A — grab it directly on the Pi** (handy if you can copy the image's direct URL):

```bash
cd /home/<your-username>
wget <direct-image-url>
mv <downloaded-file>.png term.png          # rename to something tidy
sudo mv term.png /portainer/Files/AppData/Config/Homer/assets/tools/
```

**Option B** — download the PNG on your desktop and drop it into that same `assets/tools/` folder however you prefer.

Then reference it in the service entry in `config.yml`:

```yaml
- name: "Shell In A Box"
  subtitle: "Web SSH"
  tag: "app"
  url: "https://<your-pi-ip>:4200"
  target: "_blank"
  logo: "assets/tools/term.png"
```

Save (`Ctrl` + `O`, Enter) and refresh — your tile now shows the custom icon.

---

## Where this leaves you

You've got a real dashboard now: Homer running on port `8902`, branded, with working tiles for Shell In A Box and Portainer, and a repeatable pattern for adding more.

**Next up:** we start filling the dashboard out — deploying actual services from the app-template catalog and wiring each one into Homer as we go.

---

### Quick reference

| Item | Value |
|------|-------|
| Homer image | `b4bz/homer:latest` |
| Host port → container port | `8902` → `8080` |
| Homer URL | `http://<your-pi-ip>:8902` |
| Assets/config folder (host) | `/portainer/Files/AppData/Config/Homer/assets` |
| Config file | `config.yml` (edit with `sudo nano`) |
| Custom logos folder | `assets/tools/` |
| Save in nano | `Ctrl` + `O`, then Enter |

> **YAML reminder:** spaces, not tabs — and keep the indentation consistent with the existing entries or Homer won't parse the file.
