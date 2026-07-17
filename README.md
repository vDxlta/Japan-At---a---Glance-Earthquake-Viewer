# Japan At-a-Glance — Setup

## Live test sync (shared state across devices)
The test panel (gear icon on the live page) now pushes test data to a shared
`/api/state` endpoint instead of just changing the local URL — so every
device that has the bare page open (no query params) picks it up within ~4
seconds, not just the one that submitted the form.

This needs a Vercel KV database attached to the project, one-time setup:
1. Vercel dashboard → this project → **Storage** tab → **Create Database** → **KV**.
2. Accept the defaults and connect it to this project. Vercel automatically
   adds the required environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`,
   etc.) — no manual copying needed.
3. Redeploy (Vercel usually does this automatically once the KV store is linked).

Until that's done, `/api/state` will return a 500 error and the test panel/
live sync won't work — the rest of the site (idle/direct-link rendering) is
unaffected either way.

---

# JMA EEW Watcher — Setup

## 1. Install
```bash
pip install -r requirements.txt --break-system-packages   # Linux/Pi
# or just: pip install websockets
```

## 2. Fill in the config block at the top of `watch_eew.py`
- `SMTP_HOST` / `SMTP_PORT` — your email provider's outgoing server.
  Gmail: `smtp.gmail.com`, port `587`.
- `SMTP_USER` / `SMTP_PASS` — the account that SENDS the trigger email.
  **Don't use your real password.** Generate an app-specific password:
  Gmail → Google Account → Security → 2-Step Verification → App Passwords.
- `TO_ADDRESS` — the address your iOS Mail automation is watching.
- `MIN_INTENSITY_INDEX` — raise/lower this if you want more or fewer alerts.
  Index 3 = intensity "4" and above. Set to 0 to get everything.

## 3. Test it once manually
```bash
python3 watch_eew.py
```
Leave it running and watch the log. It'll print every EEW push it receives
(even ones below your intensity threshold, so you can confirm it's alive),
and only send an email when a new report clears the threshold.

You don't have to wait for a real quake to confirm the connection works —
if it logs "Connected. Listening for EEW pushes..." and stays running without
erroring, the pipeline itself is fine. The email-sending logic only fires
on real events, so testing THAT part still needs either a real quake or a
temporary change to `MIN_INTENSITY_INDEX = 0` combined with patience.

## 4. Run it 24/7
Option A — systemd (Raspberry Pi / Linux server), so it survives reboots
and restarts itself if it crashes:
```bash
sudo cp eew-watcher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable eew-watcher
sudo systemctl start eew-watcher
sudo journalctl -u eew-watcher -f   # watch live logs
```
Edit the `WorkingDirectory` / `ExecStart` paths in the .service file first
to match wherever you actually put the script.

Option B — plain background process (quick and dirty, doesn't survive reboot):
```bash
nohup python3 watch_eew.py > watcher.log 2>&1 &
```

## Notes
- `seen_events.json` gets created automatically next to the script — it's
  how the watcher avoids re-emailing you for the same event's later reports.
  Safe to delete if you want a clean slate.
- The email body is intentionally minimal — your Shortcut ignores it and
  pulls fresh data from `jma_eew.json` itself via the automation's "Get
  Contents of URL" step.
