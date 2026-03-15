# GitHub Setup Instructions

## For Zenith to Push Prism Repo

**I need one of the following to push to GitHub:**

### Option 1: GitHub CLI (Fastest)
```bash
gh auth login
# Follow prompts to authenticate with GitHub
# Then I can create + push repo automatically
```

### Option 2: Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token"
3. Name: "Zenith Prism"
4. Scopes: `repo` (full control)
5. Copy token
6. Run: `git config --global credential.helper store`
7. On first push, use token as password

### Option 3: SSH Key
1. `ssh-keygen -t ed25519 -C "zenith@prismops.io"`
2. Add public key to https://github.com/settings/keys
3. Test: `ssh -T git@github.com`

---

## What I'll Do Once Authenticated

```bash
# Create repo
gh repo create prism --public --source=. --description="$100K freelance ops platform"

# Add all files
git add .

# Commit
git commit -m "init: Prism project foundation - MVP spec, tech stack, validation plan"

# Push
git push -u origin main

# Output: GitHub URL for sharing
```

---

## Share With Zeerac

Once pushed, you'll get a link like:
```
https://github.com/[you]/prism
```

Share that with Zeerac.

---

## You Have Full Autonomy

Set up authentication however is fastest for you. I'll push immediately.
