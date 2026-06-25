# MikroTik Captive Portal — Google OAuth Hotspot

A fully **frontend-only** captive portal for MikroTik RouterOS HotSpot.  
Users authenticate via **Google OAuth 2.0** (implicit flow, no backend required).  
After Google verifies their identity, the portal submits directly to MikroTik's built-in hotspot login endpoint.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS + custom cyber theme |
| Animations | Framer Motion |
| Auth | `@react-oauth/google` (implicit flow) |
| Router | React Router DOM v6 |
| Deployment | MikroTik `/flash/hotspot/` static files |

---

## How It Works

```
User device connects to Wi-Fi
        │
        ▼
MikroTik intercepts HTTP request
        │
        ▼ redirect to hotspot login page with query params:
          ?link-login=http://...&link-orig=http://...&mac=XX:XX&ip=192.168.x.x
        │
        ▼
Custom login page (this app) loads from /flash/hotspot/login.html
        │
        ▼
User clicks "Continue with Google" → Google OAuth popup
        │
        ▼
Google returns access token (implicit flow — no server needed)
        │
        ▼
App fetches user profile from https://www.googleapis.com/oauth2/v3/userinfo
        │
        ▼
App POSTs form to MikroTik's link-login URL
  fields: username=user@gmail.com, password=<access_token>, dst=<original URL>
        │
        ▼
MikroTik RADIUS / User Manager authenticates the user
        │
        ▼
User is granted internet access → redirected to original destination
```

> **Note:** MikroTik's User Manager must have a matching user or a default open/trial profile configured to accept the login. See [MikroTik User Manager Setup](#4-mikrotik-user-manager-setup) below.

---

## Prerequisites

- **Node.js** 18 or higher
- **MikroTik router** running RouterOS v6.x or v7.x with HotSpot configured
- **Google Cloud project** with OAuth 2.0 Web Client ID
- **WinBox**, **SSH**, or **FTP** access to the router

---

## 1. Google OAuth Setup

### 1.1 Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name it (e.g. `MikroTik Hotspot Portal`)

### 1.2 Configure Authorised JavaScript Origins

Add every origin from which the portal will be loaded:

| Environment | Origin to add |
|------------|--------------|
| Local dev | `http://localhost:5173` |
| MikroTik hotspot IP | `http://192.168.88.1` *(your router IP)* |
| Custom hotspot hostname | `http://hotspot.yourdomain.com` |

> MikroTik serves the hotspot page over plain HTTP by default.  
> Add the exact IP/hostname users will see in their browser address bar.

### 1.3 Copy Your Client ID

After saving, copy the string that looks like:  
`123456789-abcdef.apps.googleusercontent.com`

---

## 2. Local Development

```bash
# Clone / open the project
cd mikrotik-page

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Edit `.env` and paste your Google Client ID:

```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
The hotspot query params (`mac`, `ip`, `link-login`, etc.) are optional in dev — the form will fallback to `/login` if `link-login` is absent.

---

## 3. Build for Production

```bash
npm run build
```

Output is placed in the `dist/` folder:

```
dist/
├── index.html          ← becomes login.html on the router
└── assets/
    ├── index-XXXX.js   ← all JS (bundled + minified)
    └── index-XXXX.css  ← all CSS (bundled + minified)
```

Because `vite.config.js` has `base: './'`, all asset paths are **relative** — required for MikroTik's hotspot web server.

---

## 4. Deploy to MikroTik Router

### 4.1 Enable HotSpot on Your Router

If HotSpot is not yet set up:

```routeros
# Run HotSpot Setup Wizard in WinBox:
#   IP → Hotspot → Hotspot Setup
# or via terminal:

/ip hotspot setup
```

Follow the wizard:
- Select the **LAN/bridge interface** (e.g. `bridge` or `ether2`)
- Set the **hotspot address** (e.g. `192.168.88.1/24`)
- Set the **DNS name** (e.g. `hotspot.local` or leave default)
- Choose a **certificate** (none for HTTP)
- Set the **SMTP server** (can leave blank)
- Set a **DNS server** (e.g. `8.8.8.8`)
- Create a **local user** (can delete later)

### 4.2 Upload Portal Files

#### Option A — WinBox (GUI)

1. Open WinBox → **Files**
2. Navigate to `flash/hotspot/`
3. Delete or rename the existing `login.html`
4. Drag and drop from your local machine:
   - `dist/index.html` → upload and **rename to `login.html`**
   - `dist/assets/` folder → upload the entire folder

#### Option B — SCP (command line)

Replace `admin` and `192.168.88.1` with your router credentials:

```bash
# Upload the assets folder
scp -r dist/assets/ admin@192.168.88.1:/flash/hotspot/

# Upload and rename index.html → login.html
scp dist/index.html admin@192.168.88.1:/flash/hotspot/login.html
```

#### Option C — FTP

```bash
# Using curl
curl -T dist/index.html ftp://192.168.88.1/flash/hotspot/login.html \
  --user admin:yourpassword

curl -T dist/assets/index-XXXX.js \
  ftp://192.168.88.1/flash/hotspot/assets/index-XXXX.js \
  --user admin:yourpassword

curl -T dist/assets/index-XXXX.css \
  ftp://192.168.88.1/flash/hotspot/assets/index-XXXX.css \
  --user admin:yourpassword
```

### 4.3 Set the HotSpot HTML Directory

Ensure the hotspot profile points to the directory with your files:

```routeros
/ip hotspot profile set [find name=hsprof1] html-directory=hotspot
```

Check current profile name:
```routeros
/ip hotspot profile print
```

### 4.4 Configure the Login Page Name

MikroTik looks for `login.html` by default — no extra config needed if you renamed `index.html` to `login.html`.

---

## 5. MikroTik User Manager Setup

Since this portal submits `username=user@gmail.com` and `password=<google_access_token>` directly to the router, you have two approaches:

### Option A — Trial / Open Access (simplest)

Allow any authenticated Google user without pre-registering them:

1. WinBox → **User Manager → Profiles** → create a profile named `google-users`
2. Set **Session time limit**, **data transfer limit**, etc. as desired
3. WinBox → **User Manager → Limitations** → create a limitation and assign to the profile
4. WinBox → **IP → HotSpot → Server Profiles** → set `Login By: Username or MAC`
5. Create a wildcard / default user that matches any login:

```routeros
/ip hotspot user add name=!!! password="" profile=google-users comment="Default Google user"
```

> `!!!` is a special MikroTik wildcard username that matches any login that doesn't have an explicit user entry.

### Option B — Pre-registered Google Users

Add each allowed Gmail address manually:

```routeros
/ip hotspot user add name="user@gmail.com" password="" profile=default
/ip hotspot user add name="another@gmail.com" password="" profile=default
```

Passwords are intentionally empty here because MikroTik in HTTP-CHAP mode won't match the Google access token. Set the profile to not check passwords, or use PAP with empty passwords:

```routeros
/ip hotspot server profile set [find name=hsprof1] login-by=http-pap
```

---

## 6. Walled Garden — Allow Google OAuth Before Login

Users need internet access to reach Google's auth servers **before** they are logged in. Add these to the Walled Garden:

```routeros
/ip hotspot walled-garden
add dst-host=accounts.google.com
add dst-host=*.google.com
add dst-host=*.googleapis.com
add dst-host=*.gstatic.com
add dst-host=fonts.googleapis.com
add dst-host=fonts.gstatic.com
add dst-host=oauth2.googleapis.com
```

Or via WinBox: **IP → HotSpot → Walled Garden** → add each host.

Also allow the fonts loaded in `index.html`:

```routeros
/ip hotspot walled-garden
add dst-host=fonts.googleapis.com
add dst-host=fonts.gstatic.com
```

---

## 7. HotSpot Profile — Full Recommended Config

```routeros
/ip hotspot profile set [find name=hsprof1] \
  login-by=http-pap \
  html-directory=hotspot \
  http-cookie-lifetime=1d \
  use-radius=yes \
  mac-auth-mode=mac-as-username
```

| Setting | Value | Reason |
|---------|-------|--------|
| `login-by` | `http-pap` | Sends plaintext password — needed to match the Google access token |
| `html-directory` | `hotspot` | Points to `/flash/hotspot/` |
| `http-cookie-lifetime` | `1d` | Keeps users logged in for 1 day |
| `use-radius` | `yes` | If using external RADIUS; `no` for local User Manager only |

---

## 8. File Structure on Router

After upload, `/flash/hotspot/` should look like:

```
/flash/hotspot/
├── login.html          ← dist/index.html (renamed)
├── assets/
│   ├── index-XXXX.js   ← built JS bundle
│   └── index-XXXX.css  ← built CSS bundle
├── alogin.html         ← MikroTik default (keep as-is)
├── rlogin.html         ← MikroTik default (keep as-is)
├── logout.html         ← MikroTik default (keep as-is)
├── status.html         ← MikroTik default (keep as-is)
├── error.html          ← MikroTik default (keep as-is)
└── md5.js              ← MikroTik default (keep as-is)
```

> Only replace `login.html` and add `assets/`. Leave all other MikroTik default files in place.

---

## 9. URL Parameters Passed by MikroTik

MikroTik appends these query parameters to the login page URL automatically:

| Parameter | Description |
|-----------|-------------|
| `link-login` | Full URL to POST the login form to |
| `link-orig` / `dst` | The original URL the user was trying to reach |
| `link-logout` | URL to call to log out the user |
| `mac` | Client device MAC address |
| `ip` | Client device IP address |
| `username` | Previously used username (if any) |
| `error` | Error message from a failed login attempt |
| `chap-id` | CHAP challenge ID (for CHAP login — not used in this portal) |
| `chap-challenge` | CHAP challenge (for CHAP login — not used in this portal) |

This portal reads all of them via `useHotspotParams()` in `LoginPage.jsx`.

---

## 10. Troubleshooting

### Portal page not loading / shows default MikroTik page

- Confirm `login.html` exists at `/flash/hotspot/login.html`
- Check the hotspot profile `html-directory` is set to `hotspot`
- Clear browser cache or test in incognito mode

### Blank white page after upload

- Ensure the `assets/` folder was uploaded with the correct filenames
- In WinBox → Files, check that `/flash/hotspot/assets/index-XXXX.js` exists
- The filenames change each build (content hash) — always re-upload after `npm run build`

### Google OAuth popup blocked

- Add a walled garden entry for `accounts.google.com` and `*.googleapis.com`
- Some browsers block popups — the Google login uses a popup; ensure popups are allowed for the hotspot domain

### `Missing required parameter client_id` error

- `.env` file is missing or `VITE_GOOGLE_CLIENT_ID` is set to the placeholder value
- Run `npm run build` after fixing `.env` — the value is baked in at build time

### Users redirected to login repeatedly (cookie not saved)

- Increase `http-cookie-lifetime` in the hotspot server profile
- Check that the hotspot DNS name resolves correctly on client devices

### Login fails silently (form submits but user stays unauthenticated)

- Change hotspot profile `login-by` to `http-pap` (plaintext password)
- Verify the user exists in User Manager or a wildcard `!!!` user is configured
- Check `/log print` on the router for hotspot authentication errors:
  ```routeros
  /log print where topics~"hotspot"
  ```

---

## 11. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | Google OAuth 2.0 Web Client ID |

Only `VITE_` prefixed variables are embedded into the built bundle by Vite.  
The value is baked into `dist/assets/index-XXXX.js` at build time — no runtime `.env` needed on the router.

---

## 12. Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server at `http://localhost:5173` |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## 13. Re-deploying After Changes

Whenever you change the source code or update the Google Client ID:

```bash
# 1. Edit .env if needed
# 2. Rebuild
npm run build

# 3. Upload new files — delete old assets first to avoid stale chunks
# Via WinBox: delete /flash/hotspot/assets/ then re-upload dist/assets/
# Via SCP:
scp -r dist/assets/ admin@192.168.88.1:/flash/hotspot/
scp dist/index.html admin@192.168.88.1:/flash/hotspot/login.html
```

---

## Security Notes

- Google access tokens are short-lived (~1 hour) — they are used only to submit the MikroTik login form and are never stored
- The portal runs entirely in the browser — no secrets are stored server-side
- The `VITE_GOOGLE_CLIENT_ID` is a **public** identifier — it is safe to include in the built bundle
- The hotspot is served over HTTP (MikroTik default). For HTTPS, configure a certificate in the hotspot server profile and use `RouterOS Let's Encrypt` or a self-signed cert
- Restrict router access: ensure WinBox / SSH / FTP are not accessible from the hotspot guest network

---

*Built with React + Vite + Tailwind CSS · Designed for MikroTik RouterOS HotSpot*
