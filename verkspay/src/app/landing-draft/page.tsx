'use client'

import { useState, useEffect } from 'react'

export default function LandingDraft() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Geist', system-ui, -apple-system, sans-serif", background: '#ffffff', color: '#111827' }}>
      <style>{`
        /* ============================================
           DESIGN-TASTE-FRONTEND: Engineering Rules
           ============================================ */
        
        /* Deterministic Typography */
        .display-xl {
          font-size: clamp(3.5rem, 7vw, 5.5rem);
          font-weight: 300;
          letter-spacing: -0.03em;
          line-height: 1.05;
          font-family: 'Geist', system-ui, sans-serif;
        }

        .headline-lg {
          font-size: 2.5rem;
          font-weight: 500;
          letter-spacing: -0.015em;
          line-height: 1.2;
        }

        .headline-md {
          font-size: 1.875rem;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }

        .body-lg {
          font-size: 1.125rem;
          font-weight: 400;
          line-height: 1.8;
          letter-spacing: -0.005em;
        }

        .body-md {
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.6;
          letter-spacing: 0;
        }

        .body-sm {
          font-size: 0.9375rem;
          font-weight: 400;
          line-height: 1.5;
        }

        .label-sm {
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Hardware Acceleration */
        * {
          will-change: auto;
          transform: translate3d(0, 0, 0);
        }

        /* Liquid Glass Refraction */
        .glass-luxury {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        /* Spring Physics Animation */
        @keyframes springFloat {
          0%, 100% {
            transform: translateY(0px) translateZ(0);
          }
          25% {
            transform: translateY(-24px) translateZ(0);
          }
          50% {
            transform: translateY(-32px) translateZ(0);
          }
          75% {
            transform: translateY(-16px) translateZ(0);
          }
        }

        .perpetual-float {
          animation: springFloat 8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
        }

        /* Staggered Children Animation */
        @keyframes staggerIn {
          0% {
            opacity: 0;
            transform: translateY(32px) translateZ(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) translateZ(0);
          }
        }

        .stagger-child {
          animation: staggerIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        .stagger-child:nth-child(1) { animation-delay: 0.1s; }
        .stagger-child:nth-child(2) { animation-delay: 0.2s; }
        .stagger-child:nth-child(3) { animation-delay: 0.3s; }
        .stagger-child:nth-child(4) { animation-delay: 0.4s; }
        .stagger-child:nth-child(5) { animation-delay: 0.5s; }
        .stagger-child:nth-child(6) { animation-delay: 0.6s; }

        /* ============================================
           HIGH-END-VISUAL-DESIGN: Luxury & Restraint
           ============================================ */

        /* Color Calibration (Monochrome Luxury) */
        :root {
          --color-off-black: #0a0a0a;
          --color-charcoal: #1a1a1a;
          --color-slate-900: #111827;
          --color-slate-600: #475569;
          --color-slate-400: #94a3b8;
          --color-neutral-100: #f5f5f5;
          --color-neutral-50: #fafafa;
          --color-white: #ffffff;
          --color-accent: #000000;
        }

        body {
          background: linear-gradient(135deg, var(--color-neutral-50) 0%, var(--color-white) 50%, var(--color-neutral-50) 100%);
          color: var(--color-slate-900);
        }

        /* Materiality & Shadows (Premium Diffusion) */
        .shadow-luxury-sm {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .shadow-luxury-md {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .shadow-luxury-lg {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
        }

        .shadow-luxury-xl {
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.1);
        }

        /* Anti-Card Overuse: Use Negative Space */
        .card-minimal {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: var(--color-white);
          padding: 2.5rem;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .card-minimal:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-4px);
          will-change: transform;
        }

        /* Interactive UI States */
        .btn {
          padding: 0.875rem 2.25rem;
          border-radius: 6px;
          font-weight: 500;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
          will-change: transform;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn-primary {
          background: var(--color-accent);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .btn-primary:hover {
          background: var(--color-charcoal);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          transform: translateY(-2px);
        }

        .btn-primary:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        .btn-secondary {
          background: transparent;
          border: 1.5px solid #d1d5db;
          color: var(--color-slate-900);
        }

        .btn-secondary:hover {
          border-color: var(--color-accent);
          background: var(--color-neutral-50);
          transform: translateY(-1px);
        }

        /* ============================================
           INDUSTRIAL-BRUTALIST-UI: Honest & Structural
           ============================================ */

        /* Raw Data Display */
        .metric-block {
          border-top: 1px solid #e5e7eb;
          padding-top: 2rem;
        }

        .metric-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
          align-items: start;
        }

        .metric {
          text-align: left;
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-off-black);
          margin-bottom: 0.5rem;
          font-family: 'Courier New', monospace;
        }

        .metric-label {
          font-size: 0.8125rem;
          color: #6b7280;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 600;
        }

        /* Honest Feature Descriptions */
        .feature-before-after {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 2rem;
          align-items: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .feature-before {
          text-align: center;
          color: #ef4444;
        }

        .feature-separator {
          font-weight: 700;
          color: #10b981;
          font-size: 1.5rem;
        }

        .feature-after {
          text-align: center;
          color: #10b981;
        }

        /* ============================================
           MINIMALIST-UI: Remove Non-Essential
           ============================================ */

        /* Eliminate Visual Clutter */
        .no-clutter {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        /* Single Column Where Possible */
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }

        /* Consolidated Features (Not 8, but 5 Primary) */
        .primary-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .secondary-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin-top: 2rem;
        }

        /* ============================================
           REDESIGN-EXISTING-PROJECTS: Strategic Audit
           ============================================ */

        /* Before/After Comparison */
        .comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-top: 3rem;
        }

        .comparison-old {
          opacity: 0.6;
          border: 2px dashed #ef4444;
          padding: 2rem;
          border-radius: 8px;
        }

        .comparison-new {
          border: 2px solid #10b981;
          padding: 2rem;
          border-radius: 8px;
        }

        /* ============================================
           STITCH-DESIGN-TASTE: Cohesion & System
           ============================================ */

        /* Design Tokens: Spacing Scale */
        .space-2 { margin: 0.5rem; }
        .space-4 { margin: 1rem; }
        .space-6 { margin: 1.5rem; }
        .space-8 { margin: 2rem; }
        .space-12 { margin: 3rem; }
        .space-16 { margin: 4rem; }
        .space-24 { margin: 6rem; }

        /* Border Radius Scale (Only 2 values) */
        .radius-sm { border-radius: 6px; }
        .radius-md { border-radius: 12px; }

        /* Consistent Component Library */
        .section {
          padding: 6rem 3rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-light {
          background: var(--color-white);
        }

        .section-gray {
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        }

        .section-dark {
          background: var(--color-off-black);
          color: #ffffff;
        }

        /* Responsive Grid */
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .metric-row {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .primary-features {
            grid-template-columns: 1fr;
          }

          .secondary-features {
            grid-template-columns: 1fr;
          }

          .comparison-grid {
            grid-template-columns: 1fr;
          }

          .display-xl {
            font-size: 2.5rem;
          }

          .headline-lg {
            font-size: 1.875rem;
          }

          .section {
            padding: 3rem 1.5rem;
          }
        }

        /* Navigation */
        nav {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e5e7eb;
          padding: 1.5rem 3rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--color-off-black);
        }

        /* Hero Section */
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          padding: 6rem 0;
        }

        .hero-content h1 {
          margin-bottom: 1.5rem;
        }

        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
        }

        .luxury-card {
          width: 100%;
          max-width: 380px;
          aspect-ratio: 1;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          text-align: center;
        }

        .card-emoji {
          font-size: 4.5rem;
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-off-black);
        }

        .card-desc {
          font-size: 0.95rem;
          color: var(--color-slate-600);
        }

        /* Loading State (Full Output Enforcement) */
        .skeleton {
          background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%);
          background-size: 200% 100%;
          animation: pulse 2s ease-in-out infinite;
          border-radius: 6px;
        }

        @keyframes pulse {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: 0 0; }
        }

        /* Empty State */
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: #6b7280;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
        }

        /* Pricing - Featured Emphasis */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }

        .pricing-card {
          padding: 3rem;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          background: var(--color-white);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pricing-card.featured {
          border: 2px solid var(--color-off-black);
          transform: scale(1.02);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
        }

        .pricing-card:hover:not(.featured) {
          border-color: #9ca3af;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .pricing-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: var(--color-off-black);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
          border-radius: 4px;
        }

        .pricing-list {
          list-style: none;
          margin: 2rem 0;
          flex-grow: 1;
        }

        .pricing-list li {
          padding: 0.75rem 0;
          font-size: 0.95rem;
          color: var(--color-slate-600);
          padding-left: 1.75rem;
          position: relative;
        }

        .pricing-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          font-weight: 700;
          color: var(--color-off-black);
        }

        /* CTA - Full Impact */
        .cta-dark {
          background: var(--color-off-black);
          color: #ffffff;
          text-align: center;
        }

        .cta-dark h2 {
          color: #ffffff;
          margin-bottom: 1.5rem;
        }

        .cta-dark p {
          color: #d1d5db;
          margin-bottom: 2rem;
        }

        /* Footer */
        footer {
          background: var(--color-white);
          border-top: 1px solid #e5e7eb;
          padding: 4rem 3rem;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 2rem;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .footer-col h4 {
          font-weight: 600;
          color: var(--color-off-black);
          margin-bottom: 1rem;
        }

        .footer-col a {
          display: block;
          color: var(--color-slate-600);
          text-decoration: none;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          transition: color 0.3s;
        }

        .footer-col a:hover {
          color: var(--color-off-black);
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.85rem;
          color: #6b7280;
        }
      `}</style>

      {/* Navigation */}
      <nav>
        <div className="nav-logo">Verkspay</div>
        <button className="btn btn-secondary">Sign In</button>
      </nav>

      {/* Hero Section */}
      <section className="section section-light">
        <div className="hero-grid">
          <div className="hero-content">
            <h1 className="display-xl">
              Get paid <strong style={{ fontWeight: 600 }}>3 days faster</strong>
            </h1>
            <p className="body-lg" style={{ color: '#475569', marginTop: '1.5rem', maxWidth: '55ch' }}>
              Invoicing built for freelancers and growing businesses. Smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary">Start Free Trial</button>
              <button className="btn btn-secondary">See it in action</button>
            </div>

            <div className="metric-block">
              <div className="metric-row">
                <div className="metric stagger-child">
                  <div className="metric-value">2.3M+</div>
                  <div className="metric-label">Invoices Processed</div>
                </div>
                <div className="metric stagger-child">
                  <div className="metric-value">42%</div>
                  <div className="metric-label">Faster Collection</div>
                </div>
                <div className="metric stagger-child">
                  <div className="metric-value">4.9★</div>
                  <div className="metric-label">User Rating</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="card-minimal glass-luxury perpetual-float">
              <div className="card-emoji">💰</div>
              <div style={{ textAlign: 'center' }}>
                <div className="card-title">Invoice Paid</div>
                <div className="card-desc">In just 24 hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section section-gray">
        <div>
          <h2 className="headline-lg" style={{ textAlign: 'center', marginBottom: '1rem' }}>Built for your workflow</h2>
          <p className="body-lg" style={{ textAlign: 'center', color: '#475569', maxWidth: '60ch', margin: '0 auto 4rem' }}>
            Everything you need to get paid faster and manage clients better
          </p>

          <div className="primary-features">
            <div className="card-minimal stagger-child">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔔</div>
              <h3 className="headline-md" style={{ marginBottom: '0.75rem' }}>Smart Reminders</h3>
              <p className="body-sm" style={{ color: '#475569' }}>
                Automated follow-ups at 3, 7, and 14 days overdue. Stop chasing manually.
              </p>
            </div>

            <div className="card-minimal stagger-child">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
              <h3 className="headline-md" style={{ marginBottom: '0.75rem' }}>Partial Payments</h3>
              <p className="body-sm" style={{ color: '#475569' }}>
                Collect deposits upfront, track the remainder automatically.
              </p>
            </div>

            <div className="card-minimal stagger-child">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</div>
              <h3 className="headline-md" style={{ marginBottom: '0.75rem' }}>Stripe Payments</h3>
              <p className="body-sm" style={{ color: '#475569' }}>
                Send a payment link, get paid instantly into your account.
              </p>
            </div>
          </div>

          <div className="secondary-features">
            <div className="card-minimal stagger-child">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
              <h3 className="headline-md" style={{ marginBottom: '0.75rem' }}>AI-Powered CRM</h3>
              <p className="body-sm" style={{ color: '#475569' }}>
                Client health scores, AI summaries, smart follow-up suggestions.
              </p>
            </div>

            <div className="card-minimal stagger-child">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 className="headline-md" style={{ marginBottom: '0.75rem' }}>Proposals</h3>
              <p className="body-sm" style={{ color: '#475569' }}>
                Create professional proposals and convert to invoices with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section section-light">
        <h2 className="headline-lg" style={{ textAlign: 'center', marginBottom: '1rem' }}>Simple pricing</h2>
        <p className="body-lg" style={{ textAlign: 'center', color: '#475569', maxWidth: '60ch', margin: '0 auto' }}>
          Choose the plan that scales with your business
        </p>

        <div className="pricing-grid">
          <div className="card-minimal pricing-card stagger-child">
            <div className="pricing-name" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Starter</div>
            <p className="body-sm" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Perfect for solo freelancers</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '0.25rem' }}>$19</div>
            <div className="label-sm" style={{ color: '#6b7280', marginBottom: '2rem' }}>/month</div>
            <ul className="pricing-list">
              <li>Up to 20 invoices</li>
              <li>Stripe payments</li>
              <li>Smart reminders</li>
              <li>Basic CRM</li>
            </ul>
            <button className="btn btn-secondary" style={{ width: '100%' }}>Start Free</button>
          </div>

          <div className="card-minimal pricing-card featured stagger-child" style={{ border: '2px solid #000' }}>
            <div className="pricing-badge">Most Popular</div>
            <div className="pricing-name" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pro</div>
            <p className="body-sm" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>For growing freelancers</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '0.25rem' }}>$49</div>
            <div className="label-sm" style={{ color: '#6b7280', marginBottom: '2rem' }}>/month</div>
            <ul className="pricing-list">
              <li>Unlimited invoices</li>
              <li>Partial payments</li>
              <li>Recurring invoices</li>
              <li>Proposals</li>
              <li>Advanced CRM</li>
              <li>30 AI insights</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }}>Start Free</button>
          </div>

          <div className="card-minimal pricing-card stagger-child">
            <div className="pricing-name" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enterprise</div>
            <p className="body-sm" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>For teams and agencies</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, marginBottom: '0.25rem' }}>$89</div>
            <div className="label-sm" style={{ color: '#6b7280', marginBottom: '2rem' }}>/month</div>
            <ul className="pricing-list">
              <li>Everything in Pro</li>
              <li>Revenue forecasting</li>
              <li>Team management</li>
              <li>Custom branding</li>
              <li>100 AI insights</li>
            </ul>
            <button className="btn btn-secondary" style={{ width: '100%' }}>Start Free</button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta-dark">
        <h2 className="headline-lg">Ready to get paid faster?</h2>
        <p className="body-lg" style={{ maxWidth: '50ch', margin: '1.5rem auto 2rem' }}>
          Start free. Upgrade when you're ready. No credit card required.
        </p>
        <button className="btn btn-primary">Start Free Today</button>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Verkspay</h4>
            <p className="body-sm" style={{ color: '#475569' }}>Get paid faster. Chase invoices less.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Security</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">Blog</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Verkspay. All rights reserved. Built for freelancers worldwide.
        </div>
      </footer>
    </div>
  )
}
