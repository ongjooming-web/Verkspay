# Prism - Invoicing & Proposal Management

A clean, simple invoicing and proposal management app for freelancers and agencies.

**Status:** Phase 1 (Auth + Dashboard) ✅

## Tech Stack

- **Frontend:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS + custom components
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** Vercel
- **Auth:** Email/password + Google OAuth

## Project Structure

```
prism/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   ├── login/        # Login page
│   │   ├── signup/       # Signup page
│   │   ├── dashboard/    # Main dashboard (protected)
│   │   ├── clients/      # Client management (protected)
│   │   ├── invoices/     # Invoice management (protected)
│   │   ├── proposals/    # Proposal management (protected)
│   │   ├── settings/     # User settings (protected)
│   │   └── auth/callback # OAuth callback handler
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities (auth, Supabase client)
│   └── middleware.ts     # Route protection middleware
├── supabase-schema.sql   # Database schema
├── tailwind.config.ts    # Tailwind configuration
└── next.config.js        # Next.js configuration
```

## Features Implemented

### Phase 1: Auth + Dashboard ✅

#### Authentication
- ✅ Email/password signup
- ✅ Email/password login
- ✅ Google OAuth integration
- ✅ Protected routes (auto-redirect to login)
- ✅ Session management
- ✅ Logout functionality

#### Dashboard
- ✅ Welcome screen with user name
- ✅ Real-time stats cards (revenue, clients, invoices, proposals)
- ✅ Quick action buttons
- ✅ Recent activity feed (mock data)
- ✅ Responsive design

#### Client Management
- ✅ View all clients
- ✅ Create new client (name, email, company, phone)
- ✅ Delete client
- ✅ Client list with details

#### Invoice Management
- ✅ Create invoice (client, amount, due date, status)
- ✅ View all invoices
- ✅ Status indicators (draft, sent, paid, overdue)
- ✅ Delete invoice
- ✅ Auto-generated invoice numbers

#### Proposal Management
- ✅ Create proposal (client, title, amount, status)
- ✅ View all proposals
- ✅ Status indicators (draft, sent, accepted, declined)
- ✅ Delete proposal
- ✅ Auto-generated proposal numbers

#### Settings
- ✅ View account information
- ✅ Display current plan
- ✅ Plan features list
- ✅ Placeholder for delete account

### UI Components
- ✅ Button (variants: primary, secondary, outline)
- ✅ Card (with header, body, footer sections)
- ✅ Navigation bar
- ✅ Form inputs with validation
- ✅ Status badges
- ✅ Responsive design (mobile-first)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (provided)

### Installation

1. **Clone and install:**
```bash
cd prism
npm install
```

2. **Set up environment variables:**

The `.env.local` file is already configured with Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

3. **Set up Supabase database:**

Login to your Supabase console and run the SQL from `supabase-schema.sql`:
1. Go to SQL Editor
2. Create new query
3. Paste the contents of `supabase-schema.sql`
4. Run the query

Alternatively, use the Supabase CLI:
```bash
supabase link
supabase db push
```

4. **Configure Google OAuth (optional but recommended):**

In Supabase dashboard:
1. Go to Authentication → Providers
2. Enable Google
3. Add your OAuth credentials from Google Cloud Console
4. Add authorized redirect URI: `https://fqdipubbyvekhipknxnr.supabase.co/auth/v1/callback`

### Development

```bash
npm run dev
```

Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push to GitHub:
```bash
git add .
git commit -m "Phase 1: Auth + Dashboard"
git push origin main
```

2. Deploy to Vercel:
   - Connect your GitHub repo to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy!

3. Configure custom domain:
   - Add `app.prismops.xyz` in Vercel project settings
   - Update DNS records

## Database Schema

### Tables

- **profiles** - Extended user info (email, full_name, avatar)
- **clients** - Client information (name, email, company, contact details)
- **invoices** - Invoice records (amount, status, due_date, client_id)
- **proposals** - Proposal records (title, amount, status, client_id)
- **contracts** - Contract records (title, dates, value, client_id)

All tables include:
- User isolation (user_id foreign key)
- Row-level security (RLS) policies
- Timestamps (created_at, updated_at)

## Security

- ✅ Row-level security (RLS) enabled on all tables
- ✅ Protected routes with middleware
- ✅ Environment variables for sensitive data
- ✅ User data isolation (can only see own data)
- ✅ Auth state management via Supabase

## Next Steps (Phase 2)

- [ ] Invoice PDF generation
- [ ] Email notifications
- [ ] Payment integration (Stripe)
- [ ] Invoice reminders
- [ ] Template management
- [ ] Contract management UI
- [ ] Advanced reporting
- [ ] Dark mode
- [ ] Mobile app

## API Endpoints (Future)

- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `PATCH /api/invoices/{id}` - Update invoice
- `DELETE /api/invoices/{id}` - Delete invoice
- (Similar for clients, proposals, contracts)

## Troubleshooting

### Can't login?
- Check Supabase credentials in `.env.local`
- Verify email exists in Supabase auth
- Check browser console for errors

### Database operations not working?
- Ensure Supabase schema is set up
- Check RLS policies are enabled
- Verify user_id is passed in requests

### Google OAuth not working?
- Verify OAuth provider is enabled in Supabase
- Check redirect URI matches exactly
- Ensure Google Cloud credentials are valid

## Contributing

This is a personal project. For bugs or improvements, create an issue or PR.

## License

MIT

---

**Built by:** Zenith (AI Agent)
**Started:** 2026-03-15
**Target:** Ship by 2026-03-16 morning
