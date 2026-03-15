# Prism Quick Start Guide

**Waiting For:**
- [ ] Gmail account created (Zeerac)
- [ ] prismops.io domain purchased (Zeerac)

**Once Ready, Execute In Order:**

---

## Phase 1: Setup (Day 1-2)

### 1. Create Twitter Account @prismops
```
Email: [Gmail from Zeerac]
Password: [Strong password]
Handle: @prismops
Bio: "One platform for freelance ops. Contracts, proposals, CRM, payments. Crypto-native."
Profile image: Prism logo (blue/purple gradient with ⚡)
Link: https://prismops.io (once domain ready)
```

**Share credentials with Zeerac in Discord DM after creation.**

### 2. Set Up Domain DNS
```
Domain: prismops.io
Registrar: Namecheap / GoDaddy / other
Nameservers: Point to Vercel
  - ns1.vercel.com
  - ns2.vercel.com
MX Records: Gmail (for email forwarding)
```

### 3. Deploy Landing Page
```bash
# Create Vercel project
vercel link prismops.io

# Deploy landing page
vercel deploy

# Set domain in Vercel dashboard
# → prismops.io is live
```

### 4. Set Up Email
```
Email: support@prismops.io (forwarded to Gmail)
Optional: Create email templates for outreach
```

---

## Phase 2: Validation (Day 3-7)

### 5. Start Validation Outreach

**Twitter (Tier 1 Priority)**
- Search: "#buildingpublic freelance", "#crypto builders", "YC founders"
- DM template: [See outreach-templates.md]
- Goal: 5-7 interviews
- Timeline: 3 days

**Indie Hackers (Tier 2)**
- Find "Freelance Ops" threads
- Reply with outreach message
- Goal: 3-5 interviews
- Timeline: 2-3 days

**Discord Communities (Tier 2)**
- Crypto DAOs (Gitcoin, Bankless, etc.)
- Builder communities
- Post in #introductions or #partners
- Goal: 2-3 interviews
- Timeline: 2-3 days

### 6. Schedule & Run Interviews
```
Goal: 10-15 interviews in 1 week
Format: 20-30 min Zoom call
Questions: [See validation-research.md]
Recording: Optional (easier to transcribe later)
Notes: Document key insights in validation-research.md
```

### 7. Tally Validation Score

After 10+ interviews, score:
- ✅ **PMF Signal** — Do 7+ say they'd buy?
- ✅ **Price Sensitivity** — Do 8+ say $29/mo is reasonable?
- ✅ **Crypto Acceptance** — Do 6+ say crypto payments are OK?
- ✅ **Urgency** — Do 5+ want to use in next 2 weeks?

**Go threshold:** YES on all 4 → Build MVP  
**No-go threshold:** NO on 2+ → Pivot to different vertical

---

## Phase 3: Build (Week 2-3)

### 8. Start MVP Development

```bash
# Create GitHub repo
gh repo create prism --public

# Clone
git clone https://github.com/[you]/prism.git
cd prism

# Set up Next.js project
npx create-next-app@latest prism --typescript --tailwind

# Install dependencies
npm install @prisma/client next-auth zod axios qrcode

# Set up Prisma + Vercel Postgres
npx prisma init

# Add DATABASE_URL to .env
DATABASE_URL="postgresql://..."

# Create schema (use TECH-STACK.md schema)
# → Copy schema into prisma/schema.prisma

# Run migrations
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

### 9. Build Features in Order
1. **Auth** (login/signup with magic links)
2. **Dashboard** (basic layout)
3. **Clients CRM** (add/list clients)
4. **Invoices** (create/list invoices)
5. **Bankr Integration** (payment detection)
6. **Templates** (contract/proposal templates)

---

## Phase 4: Launch (Week 4)

### 10. Soft Launch

```
Timeline: 1 week before "public" launch
Audience: Early validation interviewees + crypto Twitter
Goal: Get 10-20 early customers + feedback

Channels:
[ ] Twitter thread (ship in public)
[ ] Indie Hackers post
[ ] Discord announcements (communities you reached out to)
[ ] Email validation list
[ ] Direct DMs to people who said "yes" in interviews
```

### 11. Pricing & First Customers

```
Offer early customers:
[ ] Lifetime 50% discount (lock in $15/mo instead of $29/mo)
[ ] Direct support (email/Discord)
[ ] Feature voting (tell us what to build next)

Sign up via Stripe (temporary) or USDC (preferred)
```

### 12. Iterate Based on Feedback

```
Daily:
[ ] Check Twitter replies
[ ] Answer customer questions
[ ] Log bugs/feature requests

Weekly:
[ ] Review usage analytics
[ ] Prioritize next features
[ ] Ship small updates (ship multiple times/day)

Monthly:
[ ] Monthly revenue update (share with Zeerac)
[ ] Major feature release
[ ] Analyze retention + churn
```

---

## Success Metrics (Timeline)

| Milestone | Target | Date |
|-----------|--------|------|
| **Validation** |
| 10+ interviews | Week 1 | 2026-03-22 |
| Go/no-go decision | Week 1 | 2026-03-22 |
| **MVP** |
| MVP complete | Week 3-4 | 2026-04-05 |
| Soft launch | Week 4 | 2026-04-12 |
| **Revenue** |
| First paying customer | Week 5 | 2026-04-19 |
| $500 MRR | Week 6 | 2026-04-26 |
| $1K MRR | Week 8 | 2026-05-10 |
| $5K MRR | Month 2-3 | 2026-05-31 |
| $100K cumulative | Month 6 | 2026-09-15 |

---

## File Reference

**Essential Docs:**
- `MVP-SPEC.md` — Full product spec
- `TECH-STACK.md` — Tech stack + dev guide
- `validation-research.md` — Market data + interview guide
- `PROGRESS.md` — Real-time tracking
- `outreach-templates.md` — Copy-paste outreach
- `landing-page.html` — Landing page (ready to deploy)

**Daily Usage:**
```bash
# See progress
cat PROGRESS.md

# See validation findings
cat validation-research.md

# Run development
npm run dev

# Check git status
git status

# Commit work
git add .
git commit -m "feat: add invoice creation"
git push origin main
```

---

## Capital Allocation (Tracking)

```
Budget: $1,000
├── Domain (prismops.io): $40 ✅ (Zeerac)
├── Validation ads: $100 (Twitter ads for outreach)
├── Hosting + tools: $50 (Vercel, database, etc.)
├── Reserved for launch: $500
└── Buffer: $310
```

**Report to Zeerac:**
- Weekly: What I shipped, traction, learnings
- Monthly: Revenue, burn rate, next month plan
- Go/no-go: Validation results + build decision

---

## You're Ready 🚀

Everything is prepped. Just waiting on email + domain, then it's full execution mode.

Estimated timeline: Validation (1 week) → Build (2-3 weeks) → Launch (1 week) = $100K mission underway by early June.
