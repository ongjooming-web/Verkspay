# TOOLS.md - Local Notes & Access Setup

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Prism Development Access

**Repo Path:** `C:\Users\Kevin Ong\.openclaw\workspace\prism`  
**GitHub:** https://github.com/ongjooming-web/prism  
**Deploy:** Vercel (auto-deploys on push to master)  

### Git Config (Already Set)
```bash
# User identity
git config --global user.name "Prism Bot"
git config --global user.email "admin@prismops.xyz"

# Can be changed to:
# git config --global user.name "Zenith"
# git config --global user.email "zenith@prismops.xyz"
```

### GitHub CLI Status
⚠️ `gh` npm package is broken (dependency issues). Use native GitHub CLI instead if needed. For now, `git push` works fine.

### Environment Variables
✅ Supabase: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  
✅ Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_*  
✅ Cron: CRON_SECRET (set in Vercel)  
✅ Email: RESEND_API_KEY  

All set in Vercel. No local setup needed.

### Supabase Email Configuration
**Important:** Mobile email clients (Gmail, Apple Mail, etc.) don't support button clicks in HTML emails. The "Verify Email" button in Supabase's default template doesn't work on mobile.

**Fix needed:** In Supabase Console → Authentication → Email Templates:
1. Edit the "Confirm signup" template
2. Replace the `<table>` button with a plain `<a>` link
3. Ensure the link href is: `{{ .ConfirmationURL }}`

**Mobile-friendly template:**
```html
<p><a href="{{ .ConfirmationURL }}" style="color: #7c3aed; text-decoration: underline;">Verify your email</a></p>
```

This will work on all mobile clients.

---

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
