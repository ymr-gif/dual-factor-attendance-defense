# Hosting

## GitHub Pages (Primary)

### One-Time Setup

1. Create a new GitHub repository
   - Name: `ppt-safe` or `yourusername.github.io`
   - Public visibility

2. Push the project files
   ```bash
   cd /home/scylla/dev/ppt-js
   git init
   git add .
   git commit -m "Initial commit: S.A.F.E. presentation"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. Enable GitHub Pages
   - Go to repo Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` / `/ (root)`
   - Save

4. Your presentation is live at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

### Updates

After any change:
```bash
git add . && git commit -m "Update: description" && git push
```
GitHub Pages auto-deploys within ~30 seconds.

---

## Local File (Offline Fallback)

No server needed. Open directly:
```
Open index.html in Chrome
```
All assets use relative paths — works offline.

---

## Presentation Day Checklist

### Before the Day
- [ ] Test GitHub Pages URL loads on laptop
- [ ] Test local `index.html` loads offline
- [ ] Verify fullscreen works (F11 or button)
- [ ] Verify keyboard navigation (←→ Space)
- [ ] Test on projector resolution (1920x1080)

### Day Of
- [ ] Chrome browser available
- [ ] Test URL one more time
- [ ] Have local fallback ready
- [ ] Backup ZIP on USB drive
- [ ] Close unnecessary tabs/apps
- [ ] Disable notifications (Do Not Disturb)
- [ ] Test click navigation (some projectors = touch)

### Backup Plan
1. GitHub Pages URL (primary)
2. Local `index.html` (offline)
3. USB drive with project ZIP

---

## Repository Structure for Pages

GitHub Pages serves from repo root. Ensure `index.html` is at root:
```
repo/
├── index.html          ← Pages serves this
├── src/
│   ├── css/
│   ├── js/
│   └── assets/
└── docs/               ← Not served (docs only)
```
