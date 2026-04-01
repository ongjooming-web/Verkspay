'use client'

export default function LandingDraft() {
  return (
    <div style={{ fontFamily: "'Geist', system-ui, -apple-system, sans-serif", background: '#ffffff', color: '#1a1a1a' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f8f8f8 100%);
        }

        /* Premium Typography */
        .serif {
          font-family: 'Georgia', 'Garamond', serif;
        }

        /* Smooth Transitions */
        * {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Navigation - Minimal & Elegant */
        nav {
          border-bottom: 1px solid #e8e8e8;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
        }

        /* Hero - Asymmetric & Spacious */
        .hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          padding: 6rem 3rem;
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        }

        .hero h1 {
          font-size: clamp(3.5rem, 6vw, 5.5rem);
          font-weight: 300;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: #0a0a0a;
        }

        .hero-accent {
          font-weight: 700;
          color: #1a1a1a;
        }

        .hero p {
          font-size: 1.1rem;
          color: #666;
          line-height: 1.8;
          max-width: 50ch;
          font-weight: 300;
          margin-top: 1.5rem;
        }

        /* Buttons - Minimal & Premium */
        .btn {
          display: inline-block;
          padding: 0.875rem 2.25rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.95rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.4s ease;
        }

        .btn-primary {
          background: #000;
          color: #fff;
        }

        .btn-primary:hover {
          background: #1a1a1a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .btn-secondary {
          background: transparent;
          color: #000;
          border: 1px solid #d0d0d0;
        }

        .btn-secondary:hover {
          border-color: #000;
          background: #f8f8f8;
        }

        /* Stats - Minimalist */
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
          margin-top: 3rem;
          padding-top: 3rem;
          border-top: 1px solid #e8e8e8;
        }

        .stat {
          text-align: left;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #000;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #999;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Hero Visual - Luxury Card */
        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .luxury-card {
          width: 100%;
          max-width: 400px;
          aspect-ratio: 1;
          background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
          border: 1px solid #e8e8e8;
          border-radius: 0.75rem;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .card-emoji {
          font-size: 4rem;
        }

        .card-text {
          text-align: center;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0a0a0a;
          margin-bottom: 0.5rem;
        }

        .card-desc {
          font-size: 0.95rem;
          color: #666;
          font-weight: 300;
        }

        /* Features - Grid & Minimal */
        .features {
          padding: 8rem 3rem;
          background: #ffffff;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
          margin-top: 4rem;
        }

        .feature-card {
          padding: 2.5rem;
          border: 1px solid #f0f0f0;
          border-radius: 0.5rem;
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
          transition: all 0.4s ease;
          cursor: default;
        }

        .feature-card:hover {
          border-color: #e8e8e8;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          transform: translateY(-4px);
        }

        .feature-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #0a0a0a;
          margin-bottom: 0.75rem;
        }

        .feature-desc {
          font-size: 0.95rem;
          color: #666;
          line-height: 1.6;
          font-weight: 300;
        }

        /* Section Heading */
        .section-heading {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-title {
          font-size: 3rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          color: #0a0a0a;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #666;
          font-weight: 300;
          max-width: 50ch;
          margin: 0 auto;
        }

        /* Pricing - Luxury & Minimal */
        .pricing {
          padding: 8rem 3rem;
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }

        .pricing-card {
          padding: 3rem;
          border: 1px solid #e8e8e8;
          border-radius: 0.75rem;
          background: #ffffff;
          transition: all 0.4s ease;
          display: flex;
          flex-direction: column;
        }

        .pricing-card.featured {
          border: 1.5px solid #000;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
          transform: scale(1.02);
        }

        .pricing-card:hover:not(.featured) {
          border-color: #d0d0d0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .pricing-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #000;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
          border-radius: 0.25rem;
          width: fit-content;
        }

        .pricing-name {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin-bottom: 0.5rem;
        }

        .pricing-desc {
          font-size: 0.9rem;
          color: #999;
          margin-bottom: 2rem;
          flex-grow: 1;
        }

        .pricing-price {
          font-size: 3rem;
          font-weight: 300;
          color: #0a0a0a;
          margin-bottom: 0.25rem;
        }

        .pricing-period {
          font-size: 0.85rem;
          color: #999;
          margin-bottom: 2rem;
        }

        .pricing-features {
          list-style: none;
          margin-bottom: 2rem;
          flex-grow: 1;
        }

        .pricing-features li {
          padding: 0.5rem 0;
          font-size: 0.95rem;
          color: #666;
          padding-left: 1.5rem;
          position: relative;
        }

        .pricing-features li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #000;
          font-weight: 700;
        }

        /* CTA Section - Full Impact */
        .cta {
          padding: 8rem 3rem;
          background: #000;
          color: #fff;
          text-align: center;
        }

        .cta-title {
          font-size: 3rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
        }

        .cta-subtitle {
          font-size: 1.1rem;
          color: #ccc;
          font-weight: 300;
          max-width: 50ch;
          margin: 0 auto 2rem;
        }

        /* Footer - Minimal */
        footer {
          background: #fff;
          border-top: 1px solid #e8e8e8;
          padding: 4rem 3rem;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 2rem;
        }

        .footer-col h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #0a0a0a;
          margin-bottom: 1rem;
        }

        .footer-col a {
          display: block;
          font-size: 0.9rem;
          color: #666;
          text-decoration: none;
          margin-bottom: 0.75rem;
          transition: color 0.3s;
        }

        .footer-col a:hover {
          color: #000;
        }

        .footer-bottom {
          border-top: 1px solid #e8e8e8;
          padding-top: 2rem;
          text-align: center;
          font-size: 0.85rem;
          color: #999;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero {
            grid-template-columns: 1fr;
            padding: 3rem 1.5rem;
            gap: 2rem;
          }

          .hero h1 {
            font-size: 2.5rem;
          }

          .stats {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .section-title {
            font-size: 2rem;
          }

          .cta-title {
            font-size: 2rem;
          }

          .pricing-card.featured {
            transform: scale(1);
          }

          nav {
            padding: 1rem 1.5rem;
          }
        }

        /* Container */
        .container {
          max-width: 1400px;
          margin: 0 auto;
        }
      `}</style>

      {/* Navigation */}
      <nav style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#000' }}>Verkspay</div>
        <button className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>Sign In</button>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div>
          <h1>
            Get paid <span className="hero-accent">3 days faster</span>
          </h1>
          <p>
            Invoicing built for freelancers and growing businesses. Smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary">Start Free Trial</button>
            <button className="btn btn-secondary">See it in action</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-number">2.3M+</div>
              <div className="stat-label">Invoices Processed</div>
            </div>
            <div className="stat">
              <div className="stat-number">42%</div>
              <div className="stat-label">Faster Collection</div>
            </div>
            <div className="stat">
              <div className="stat-number">4.9★</div>
              <div className="stat-label">User Rating</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="luxury-card">
            <div className="card-emoji">💰</div>
            <div className="card-text">
              <div className="card-title">Invoice Paid</div>
              <div className="card-desc">In just 24 hours</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-title">Built for your workflow</h2>
            <p className="section-subtitle">Everything you need to get paid faster and manage clients better</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-title">Smart Reminders</h3>
              <p className="feature-desc">Automated follow-ups at 3, 7, and 14 days overdue. Stop chasing manually.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💸</div>
              <h3 className="feature-title">Partial Payments</h3>
              <p className="feature-desc">Collect deposits upfront, track the remainder automatically.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3 className="feature-title">Stripe Payments</h3>
              <p className="feature-desc">Send a payment link, get paid instantly into your account.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3 className="feature-title">AI-Powered CRM</h3>
              <p className="feature-desc">Client health scores, AI summaries, smart follow-up suggestions.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">Proposals</h3>
              <p className="feature-desc">Create professional proposals and convert to invoices with one click.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3 className="feature-title">Recurring Invoices</h3>
              <p className="feature-desc">Auto-generated for retainer clients. Review and send on your schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing">
        <div className="container">
          <div className="section-heading">
            <h2 className="section-title">Simple pricing</h2>
            <p className="section-subtitle">Choose the plan that scales with your business</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-name">Starter</div>
              <p className="pricing-desc">Perfect for solo freelancers</p>
              <div className="pricing-price">$19</div>
              <div className="pricing-period">/month</div>
              <ul className="pricing-features">
                <li>Up to 20 invoices</li>
                <li>Stripe payments</li>
                <li>Smart reminders</li>
                <li>Basic CRM</li>
              </ul>
              <button className="btn btn-secondary" style={{ width: '100%' }}>Start Free</button>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-name">Pro</div>
              <p className="pricing-desc">For growing freelancers</p>
              <div className="pricing-price">$49</div>
              <div className="pricing-period">/month</div>
              <ul className="pricing-features">
                <li>Unlimited invoices</li>
                <li>Partial payments</li>
                <li>Recurring invoices</li>
                <li>Proposals</li>
                <li>Advanced CRM</li>
                <li>30 AI insights</li>
              </ul>
              <button className="btn btn-primary" style={{ width: '100%' }}>Start Free</button>
            </div>

            <div className="pricing-card">
              <div className="pricing-name">Enterprise</div>
              <p className="pricing-desc">For teams and agencies</p>
              <div className="pricing-price">$89</div>
              <div className="pricing-period">/month</div>
              <ul className="pricing-features">
                <li>Everything in Pro</li>
                <li>Revenue forecasting</li>
                <li>Team management</li>
                <li>Custom branding</li>
                <li>100 AI insights</li>
              </ul>
              <button className="btn btn-secondary" style={{ width: '100%' }}>Start Free</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <h2 className="cta-title">Ready to get paid faster?</h2>
          <p className="cta-subtitle">Start free. Upgrade when you're ready. No credit card required.</p>
          <button className="btn btn-primary">Start Free Today</button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Verkspay</h4>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Get paid faster. Chase invoices less.</p>
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
        </div>
      </footer>
    </div>
  )
}
