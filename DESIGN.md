# DESIGN.md — Prism Design System

## Philosophy
Prism is a tool for serious freelancers. The UI should feel like a precision instrument — calm, fast, and trustworthy. Every element earns its place. No decoration for decoration's sake.

Inspired by: Linear's density, Notion's calm, Stripe's trustworthiness.
Avoid: gradients on everything, rounded-everything, purple SaaS clichés.

---

## Color Palette

### CSS Variables (use these everywhere — never hardcode hex)

```css
:root {
 /* Backgrounds */
 --bg-base: #ffffff;
 --bg-subtle: #f7f7f6;
 --bg-muted: #f0efed;
 --bg-overlay: #e8e7e4;

 /* Borders */
 --border-default: #e2e1de;
 --border-strong: #c9c8c4;

 /* Text */
 --text-primary: #1a1915;
 --text-secondary: #6b6a65;
 --text-tertiary: #9b9a95;
 --text-inverse: #ffffff;

 /* Brand */
 --accent: #4f6ef7;
 --accent-hover: #3d5ce5;
 --accent-subtle: #eef1fe;
 --accent-text: #2a3eb1;

 /* Semantic */
 --success: #16a34a;
 --success-subtle: #f0fdf4;
 --warning: #d97706;
 --warning-subtle: #fffbeb;
 --danger: #dc2626;
 --danger-subtle: #fef2f2;
 --info: #0284c7;
 --info-subtle: #f0f9ff;
}

[data-theme="dark"] {
 /* Backgrounds */
 --bg-base: #111110;
 --bg-subtle: #1a1917;
 --bg-muted: #222220;
 --bg-overlay: #2a2927;

 /* Borders */
 --border-default: #2e2d2a;
 --border-strong: #3d3c38;

 /* Text */
 --text-primary: #ededec;
 --text-secondary: #a0a09a;
 --text-tertiary: #6b6a65;
 --text-inverse: #111110;

 /* Brand */
 --accent: #6b84f8;
 --accent-hover: #7d93f9;
 --accent-subtle: #1a1f3a;
 --accent-text: #a5b4fc;

 /* Semantic */
 --success: #22c55e;
 --success-subtle: #052e16;
 --warning: #f59e0b;
 --warning-subtle: #1c1100;
 --danger: #ef4444;
 --danger-subtle: #1f0000;
 --info: #38bdf8;
 --info-subtle: #001a2e;
}
```

---

## Typography

### Font Stack
```css
/* Display / Headings */
font-family: 'DM Sans', sans-serif;
/* Weights: 400, 500, 600

/* Body */
font-family: 'DM Sans', sans-serif;

/* Mono (code, invoice IDs, amounts) */
font-family: 'DM Mono', monospace;
/* Weights: 400, 500 */
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Scale
```css
--text-xs: 0.75rem; /* 12px — labels, badges */
--text-sm: 0.875rem; /* 14px — body, table rows */
--text-base: 1rem; /* 16px — default body */
--text-lg: 1.125rem; /* 18px — section headers */
--text-xl: 1.25rem; /* 20px — page titles */
--text-2xl: 1.5rem; /* 24px — dashboard headings */
--text-3xl: 1.875rem; /* 30px — hero/empty states */
```

### Rules
- Page titles: `text-xl`, weight 600, `text-primary`
- Section labels: `text-xs`, weight 500, `text-tertiary`, uppercase, letter-spacing 0.05em
- Body copy: `text-sm`, weight 400, `text-secondary`
- Amounts/IDs: always `DM Mono`, `text-sm`, `text-primary`
- Never use font sizes below `text-xs`

---

## Spacing & Layout

### Base Unit: 4px
```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

### Page Layout
```css
/* Sidebar */
--sidebar-width: 240px;

/* Content area */
--content-max-width: 1100px;
--content-padding: var(--space-8);

/* Mobile */
--content-padding-mobile: var(--space-4);
```

### Rules
- Section padding: `space-6` vertical, `space-8` horizontal
- Card padding: `space-5` all sides
- Stack spacing between elements: `space-4`
- Inline spacing (icon + label): `space-2`
- Never use arbitrary pixel values — always use variables

---

## Border Radius
```css
--radius-sm: 4px; /* inputs, badges */
--radius-md: 8px; /* cards, dropdowns */
--radius-lg: 12px; /* modals, panels */
--radius-full: 9999px; /* pills, avatars */
```

---

## Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-focus: 0 0 0 3px rgba(79,110,247,0.2);
```

Dark mode: reduce opacity by 50% — dark UIs use less shadow, more border.

---

## Component Patterns

### Buttons

```css
/* Primary */
.btn-primary {
 background: var(--accent);
 color: var(--text-inverse);
 padding: var(--space-2) var(--space-4);
 border-radius: var(--radius-sm);
 font-size: var(--text-sm);
 font-weight: 500;
 border: none;
 cursor: pointer;
 transition: background 150ms ease;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-primary:focus-visible { box-shadow: var(--shadow-focus); outline: none; }

/* Secondary */
.btn-secondary {
 background: transparent;
 color: var(--text-primary);
 border: 1px solid var(--border-default);
 /* same padding/radius/font as primary */
}
.btn-secondary:hover { background: var(--bg-subtle); }

/* Ghost */
.btn-ghost {
 background: transparent;
 color: var(--text-secondary);
 border: none;
}
.btn-ghost:hover { background: var(--bg-muted); color: var(--text-primary); }

/* Danger */
.btn-danger {
 background: var(--danger);
 color: #fff;
}

/* Sizes */
.btn-sm { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
.btn-lg { padding: var(--space-3) var(--space-6); font-size: var(--text-base); }
```

### Cards
```css
.card {
 background: var(--bg-base);
 border: 1px solid var(--border-default);
 border-radius: var(--radius-md);
 padding: var(--space-5);
 box-shadow: var(--shadow-sm);
}

/* Hoverable card (e.g. invoice list item) */
.card-hoverable:hover {
 border-color: var(--border-strong);
 box-shadow: var(--shadow-md);
 transition: all 150ms ease;
}
```

### Forms & Inputs
```css
.input {
 width: 100%;
 background: var(--bg-base);
 border: 1px solid var(--border-default);
 border-radius: var(--radius-sm);
 padding: var(--space-2) var(--space-3);
 font-size: var(--text-sm);
 color: var(--text-primary);
 font-family: inherit;
 transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input::placeholder { color: var(--text-tertiary); }
.input:focus {
 outline: none;
 border-color: var(--accent);
 box-shadow: var(--shadow-focus);
}
.input:disabled {
 background: var(--bg-subtle);
 color: var(--text-tertiary);
 cursor: not-allowed;
}

/* Labels */
.label {
 font-size: var(--text-xs);
 font-weight: 500;
 color: var(--text-secondary);
 margin-bottom: var(--space-1);
 display: block;
}

/* Error state */
.input-error { border-color: var(--danger); }
.input-error:focus { box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
.error-message { font-size: var(--text-xs); color: var(--danger); margin-top: var(--space-1); }
```

### Badges / Status Pills
```css
.badge {
 display: inline-flex;
 align-items: center;
 gap: var(--space-1);
 padding: 2px var(--space-2);
 border-radius: var(--radius-full);
 font-size: var(--text-xs);
 font-weight: 500;
}

.badge-success { background: var(--success-subtle); color: var(--success); }
.badge-warning { background: var(--warning-subtle); color: var(--warning); }
.badge-danger { background: var(--danger-subtle); color: var(--danger); }
.badge-info { background: var(--info-subtle); color: var(--info); }
.badge-neutral { background: var(--bg-muted); color: var(--text-secondary); }
```

Invoice status mapping:
- `draft` → `badge-neutral`
- `sent` → `badge-info`
- `paid` → `badge-success`
- `overdue` → `badge-danger`
- `cancelled` → `badge-neutral`

### Tables (Invoice List)
```css
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.table th {
 text-align: left;
 font-size: var(--text-xs);
 font-weight: 500;
 color: var(--text-tertiary);
 text-transform: uppercase;
 letter-spacing: 0.05em;
 padding: var(--space-2) var(--space-4);
 border-bottom: 1px solid var(--border-default);
}
.table td {
 padding: var(--space-3) var(--space-4);
 border-bottom: 1px solid var(--border-default);
 color: var(--text-primary);
}
.table tr:hover td { background: var(--bg-subtle); }
.table .amount { font-family: 'DM Mono', monospace; }
```

### Modals
```css
.modal-overlay {
 position: fixed; inset: 0;
 background: rgba(0,0,0,0.4);
 backdrop-filter: blur(4px);
 display: flex; align-items: center; justify-content: center;
 z-index: 50;
}
.modal {
 background: var(--bg-base);
 border: 1px solid var(--border-default);
 border-radius: var(--radius-lg);
 padding: var(--space-6);
 width: 100%;
 max-width: 480px;
 box-shadow: var(--shadow-lg);
}
.modal-title { font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-4); }
```

---

## Dark / Light Mode Toggle

### Implementation (Next.js)
```tsx
// Use next-themes
import { useTheme } from 'next-themes'

// Toggle
const { theme, setTheme } = useTheme()
const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
```

```tsx
// _app.tsx or layout.tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
 {children}
</ThemeProvider>
```

### Rules
- Default to system preference
- Store preference in localStorage (next-themes handles this)
- Never flash — use `suppressHydrationWarning` on `<html>`
- Toggle button: top-right of sidebar or navbar, icon only (sun/moon)

---

## Mobile Responsiveness

### Breakpoints
```css
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

### Rules
- Mobile first — write base styles for mobile, use `min-width` media queries to scale up
- Sidebar collapses to bottom nav or hamburger on `< 768px`
- Tables become card stacks on mobile (hide less important columns)
- Touch targets minimum 44×44px
- Font sizes never scale down below base — increase for readability on small screens
- Invoice amounts always visible on mobile — never hidden in overflow

### Tailwind Equivalents (if using Tailwind)
```
Mobile: (no prefix)
Tablet: md:
Desktop: lg:
Wide: xl:
```

---

## Motion & Transitions

Keep it subtle. Prism is a work tool, not a marketing site.

```css
/* Standard transition */
transition: all 150ms ease;

/* Slower for modals/panels */
transition: all 200ms ease;

/* Page transitions — fade only */
.page-enter { opacity: 0; }
.page-enter-active { opacity: 1; transition: opacity 150ms ease; }
```

Never use bounce, spring, or elastic easing in data-heavy UI. Reserve for empty states or success moments only.

---

## Empty States

When a list is empty (no invoices, no clients):
- Centered layout, `space-12` padding
- Simple icon (outline style, 48px, `text-tertiary`)
- Heading: `text-xl`, weight 600, `text-primary`
- Subtext: `text-sm`, `text-secondary`
- Single CTA button (primary)

Example:
```
[Invoice icon]
No invoices yet
Create your first invoice and start getting paid.
[+ Create Invoice]
```

---

## Rules Zenith Must Follow

1. Always use CSS variables — never hardcode colors or spacing
2. Every new component must support both light and dark mode
3. Amounts and IDs always use DM Mono
4. Status badges always use the defined mapping
5. No gradients on interactive elements (buttons, inputs)
6. Mobile layout must be tested at 375px width minimum
7. Focus states must always be visible (accessibility)
8. When in doubt — add more whitespace, not less
