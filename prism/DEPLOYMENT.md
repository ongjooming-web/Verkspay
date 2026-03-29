# Deployment Guide

## Live at: app.Verkspayops.xyz

## Vercel Setup (One-time)

### 1. Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select GitHub and authorize
4. Find and select `ongjooming-web/Verkspay` repository
5. Click "Import"

### 2. Environment Variables
In Vercel project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://fqdipubbyvekhipknxnr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZGlwdWJieXZla2hpcGtueG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Mjk2NzEsImV4cCI6MjA4OTIwNTY3MX0.ojs6k3NTLXx6TQOCRQbTaEIvY1Xaeo8H--mkov_bBRQ
```

### 3. Configure Custom Domain
1. In Vercel dashboard, go to Settings → Domains
2. Add domain: `app.Verkspayops.xyz`
3. Choose "Using external nameservers"
4. Add DNS records to your domain provider

#### DNS Records:
- **Type:** CNAME
- **Name:** app
- **Target:** cname.vercel-dns.com
- **TTL:** 3600

### 4. Deploy
Once domain is verified:
1. Click "Deploy" in Vercel
2. Wait for build to complete
3. App will be live at `https://app.Verkspayops.xyz`

## Supabase Configuration

### 1. Google OAuth Setup
If not already done:

1. Go to Supabase console → Authentication → Providers
2. Enable Google provider
3. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://fqdipubbyvekhipknxnr.supabase.co/auth/v1/callback`
4. Paste credentials into Supabase provider settings

### 2. Database Setup
Run this in Supabase SQL Editor:

```sql
-- Paste contents of supabase-schema.sql here
```

Or use CLI:
```bash
supabase link --project-ref fqdipubbyvekhipknxnr
supabase db push
```

### 3. Update OAuth Redirect URL (Important!)
After Vercel deployment, update Supabase OAuth settings:

1. Go to Supabase → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://app.Verkspayops.xyz/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## Health Checks

### Post-Deployment Checklist

- [ ] Login page loads at `https://app.Verkspayops.xyz/login`
- [ ] Can create account with email/password
- [ ] Can login with email/password
- [ ] Google OAuth button appears and works
- [ ] Dashboard loads after login
- [ ] Can create a client
- [ ] Can create an invoice
- [ ] Can create a proposal
- [ ] Can logout
- [ ] Protected routes redirect to login when not authenticated

### Monitoring

Monitor Vercel dashboard for:
- Build success/failure
- Function performance
- Error rates

Monitor Supabase console for:
- Database performance
- Auth events
- Real-time updates

## Troubleshooting

### App won't deploy
- Check environment variables are set in Vercel
- Verify package.json has correct build script
- Check build logs for errors

### Can't login after deployment
- Verify OAuth redirect URL in Supabase matches exactly
- Check environment variables in Vercel
- Clear browser cache and try incognito window

### Database operations fail
- Ensure database schema is created in Supabase
- Verify RLS policies are enabled
- Check Supabase credentials match those in Vercel env vars

### Domain not working
- Wait 24-48 hours for DNS propagation
- Check DNS records at your domain provider
- Verify CNAME record points to `cname.vercel-dns.com`
- Test with: `nslookup app.Verkspayops.xyz`

## Auto-Deployment

Once connected to Vercel:
- Every push to `master` branch triggers automatic deployment
- Deployments complete in ~2-3 minutes
- Old deployments are kept for rollback

## Rollback

If needed, rollback to previous deployment:
1. Go to Vercel dashboard
2. Find desired deployment in Deployments tab
3. Click three dots menu
4. Click "Promote to Production"

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Next Steps

- [ ] Set up custom domain
- [ ] Configure Vercel project settings
- [ ] Deploy to production
- [ ] Test all features
- [ ] Set up monitoring/alerts
- [ ] Plan Phase 2 features
