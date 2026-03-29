# Color Theme Migration: Purple/Slate → Blue/Teal

## Overview
Migration from dark purple/slate theme to light blue/teal theme to match the new Verkspay logo.

## Color Mapping

### Primary Colors
- **Old:** `purple-600` → **New:** `blue-600`
- **Old:** `slate-950/900/800` → **New:** `white/blue-50/blue-100`
- **Old:** Text: `text-white` → **New:** `text-blue-900`

### Accent Colors
- **Old:** `from-purple-600 to-purple-600` → **New:** `from-blue-600 to-cyan-500`
- **Old:** `shadow-purple` → **New:** `shadow-blue`

### Background Gradient
- **Old:** `from-slate-950 via-slate-900 to-slate-950`
- **New:** `from-white via-blue-50 to-white`

## File Update Priority

### High Priority (Customer-Facing)
1. `src/app/(landing)/page.tsx` - Homepage
2. `src/app/login/page.tsx` - Login page
3. `src/app/signup/page.tsx` - Signup page
4. `src/app/pricing/page.tsx` - Pricing page
5. `src/app/dashboard/page.tsx` - Main dashboard

### Medium Priority (Core Features)
6. `src/app/invoices/page.tsx`
7. `src/app/proposals/page.tsx`
8. `src/app/settings/page.tsx`
9. `src/components/Navigation.tsx`
10. `src/components/Sidebar.tsx`

### Low Priority (Utility)
11. Other component pages
12. Modal/overlay components
13. Email templates (if applicable)

## Current Status
✅ globals.css - Base colors updated
✅ tailwind.config.ts - Custom colors added
✅ layout.tsx - Light mode enabled, gradient updated
✅ Button.tsx - Updated primary gradient to blue→cyan

⏳ Remaining files need component-level updates

## Next Steps
1. Update Navigation.tsx (header/branding)
2. Update key page headers
3. Update card backgrounds
4. Test in browser
5. Verify all text is readable on light background

## Notes
- Avoid bulk replace - test each file individually
- Check contrast ratios (WCAG AA compliance)
- Update hover states to work with light theme
- Verify glass-morphism looks good on light background
