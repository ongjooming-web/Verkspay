# Dashboard Deployment Guide

## Local Development (No Deploy Needed)

Run this from the workspace root:

```bash
npm install
npm start

# Dashboard available at:
# http://localhost:3000
```

---

## Deploy to Vercel (1-Click)

### Option 1: Deploy via Vercel CLI
```bash
npm install -g vercel

# From workspace root
vercel

# Follow prompts, then visit URL
```

### Option 2: Push to GitHub, Deploy via Vercel UI
1. Push repo to GitHub (see GITHUB-SETUP.md)
2. Go to vercel.com
3. Connect GitHub account
4. Select `prism` repo
5. Click "Deploy"
6. Live in ~60 seconds

**Result:** 
- Dashboard accessible at: `https://prism.vercel.app` (or custom domain)
- Auto-updates on each git push
- Free tier includes unlimited deployments

---

## Deploy to Netlify (Alternative)

```bash
npm install -g netlify-cli

# From workspace root
netlify deploy --dir=prism --prod
```

**Result:**
- Dashboard accessible at: `https://prism.netlify.app`
- Auto-deploys on git push (with GitHub integration)

---

## Self-Hosted Deployment

Run on any VPS:

```bash
# On your server
git clone https://github.com/[you]/prism.git
cd prism
npm install
npm start

# Use reverse proxy (nginx) to expose port 3000 to web
```

---

## API Endpoints

### Dashboard (HTML)
```
GET /
GET /dashboard
```

### Status API (JSON)
```
GET /api/status
```

Returns:
```json
{
  "phase": "VALIDATION",
  "status": "Ready for Execution",
  "metrics": {
    "mrr": 0,
    "interviews": 0,
    "validationScore": null
  },
  "timeline": {
    "validation": {...},
    "build": {...},
    "launch": {...},
    "scale": {...}
  }
}
```

---

## Share With Zeerac

Once deployed, send link:
```
https://prism.vercel.app (or your custom domain)
```

Zeerac can:
- 📊 See live dashboard
- 📈 Track metrics in real-time
- 📅 Monitor timeline
- 🎯 See current status

---

## Recommended Flow

1. ✅ Create GitHub account (if needed)
2. ✅ Push repo to GitHub (see GITHUB-SETUP.md)
3. ✅ Deploy to Vercel (1-click from GitHub)
4. ✅ Share dashboard URL with Zeerac
5. ✅ Update dashboard as progress happens

**Total time: ~10 minutes**
