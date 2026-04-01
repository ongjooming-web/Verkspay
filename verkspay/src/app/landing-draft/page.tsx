'use client'

export default function LandingDraft() {
  return (
    <div style={{ fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap');
          
          * {
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          
          body {
            background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f8fafc);
            color: #111827;
          }
          
          /* Liquid Glass Effect */
          .glass-card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 20px 40px -15px rgba(0, 0, 0, 0.05);
          }
          
          /* Premium Diffusion Shadow */
          .premium-shadow {
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05);
          }
          
          /* Spring Animation */
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          
          .float-animation {
            animation: float 6s ease-in-out infinite;
          }
          
          /* Stagger Animation */
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .stagger-item {
            animation: slideInUp 0.6s ease-out forwards;
          }
          
          .stagger-item:nth-child(1) { animation-delay: 0.1s; }
          .stagger-item:nth-child(2) { animation-delay: 0.2s; }
          .stagger-item:nth-child(3) { animation-delay: 0.3s; }
          .stagger-item:nth-child(4) { animation-delay: 0.4s; }
          .stagger-item:nth-child(5) { animation-delay: 0.5s; }
          
          /* Button Animations */
          .btn-primary {
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
          }
          
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px -15px rgba(16, 185, 129, 0.3);
          }
          
          .btn-primary:active {
            transform: scale(0.98);
          }
          
          /* Accent Color (Emerald) */
          .accent-emerald {
            color: #10b981;
          }
          
          .accent-emerald-bg {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          }
          
          /* Typography Scale */
          .text-display {
            font-size: clamp(2.5rem, 8vw, 4rem);
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
          }
          
          .text-headline {
            font-size: 1.875rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            line-height: 1.2;
          }
          
          .text-subheading {
            font-size: 1.125rem;
            font-weight: 600;
            letter-spacing: -0.005em;
          }
          
          /* Feature Grid Zig-Zag */
          @media (min-width: 1024px) {
            .feature-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 2rem;
            }
            
            .feature-grid > :nth-child(4) {
              grid-column: 1 / 2;
            }
            
            .feature-grid > :nth-child(5) {
              grid-column: 2 / 4;
            }
          }
          
          /* Pricing Table */
          .pricing-item {
            display: grid;
            grid-template-columns: auto 1fr auto auto;
            gap: 2rem;
            align-items: center;
            padding: 2rem;
            border-bottom: 1px solid rgba(229, 231, 235, 0.3);
            transition: background 0.3s ease;
          }
          
          .pricing-item:hover {
            background: rgba(16, 185, 129, 0.03);
          }
          
          .pricing-item.featured {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
            border-left: 4px solid #10b981;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .pricing-item {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            
            .feature-grid {
              grid-template-columns: 1fr !important;
            }
          }

          .max-w-7xl {
            max-width: 80rem;
            margin-left: auto;
            margin-right: auto;
          }

          .max-w-4xl {
            max-width: 56rem;
            margin-left: auto;
            margin-right: auto;
          }

          .grid {
            display: grid;
          }

          .gap-8 {
            gap: 2rem;
          }

          .gap-6 {
            gap: 1.5rem;
          }

          .gap-4 {
            gap: 1rem;
          }

          .gap-2 {
            gap: 0.5rem;
          }

          .md\\:grid-cols-2 {
            @media (min-width: 768px) {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          .md\\:grid-cols-3 {
            @media (min-width: 768px) {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          .md\\:grid-cols-4 {
            @media (min-width: 768px) {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }

          .lg\\:grid-cols-2 {
            @media (min-width: 1024px) {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          .lg\\:col-span-2 {
            @media (min-width: 1024px) {
              grid-column: span 2 / span 2;
            }
          }

          .rounded-2xl {
            border-radius: 1rem;
          }

          .rounded-lg {
            border-radius: 0.5rem;
          }

          .rounded-full {
            border-radius: 9999px;
          }

          .p-10 {
            padding: 2.5rem;
          }

          .p-8 {
            padding: 2rem;
          }

          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }

          .py-24 {
            padding-top: 6rem;
            padding-bottom: 6rem;
          }

          .py-16 {
            padding-top: 4rem;
            padding-bottom: 4rem;
          }

          .py-12 {
            padding-top: 3rem;
            padding-bottom: 3rem;
          }

          .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }

          .px-8 {
            padding-left: 2rem;
            padding-right: 2rem;
          }

          .px-10 {
            padding-left: 2.5rem;
            padding-right: 2.5rem;
          }

          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }

          .px-3 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }

          .mb-20 {
            margin-bottom: 5rem;
          }

          .mb-16 {
            margin-bottom: 4rem;
          }

          .mb-12 {
            margin-bottom: 3rem;
          }

          .mb-8 {
            margin-bottom: 2rem;
          }

          .mb-6 {
            margin-bottom: 1.5rem;
          }

          .mb-4 {
            margin-bottom: 1rem;
          }

          .mb-2 {
            margin-bottom: 0.5rem;
          }

          .mt-16 {
            margin-top: 4rem;
          }

          .mt-12 {
            margin-top: 3rem;
          }

          .mt-8 {
            margin-top: 2rem;
          }

          .mt-4 {
            margin-top: 1rem;
          }

          .mt-2 {
            margin-top: 0.5rem;
          }

          .mx-auto {
            margin-left: auto;
            margin-right: auto;
          }

          .border {
            border: 1px solid;
          }

          .border-b {
            border-bottom: 1px solid;
          }

          .border-t {
            border-top: 1px solid;
          }

          .border-l {
            border-left: 4px solid;
          }

          .border-gray-200 {
            border-color: #e5e7eb;
          }

          .border-gray-100 {
            border-color: #f3f4f6;
          }

          .border-gray-300 {
            border-color: #d1d5db;
          }

          .space-y-1 > * + * {
            margin-top: 0.25rem;
          }

          .space-y-2 > * + * {
            margin-top: 0.5rem;
          }

          .space-y-4 > * + * {
            margin-top: 1rem;
          }

          .space-y-6 > * + * {
            margin-top: 1.5rem;
          }

          .space-y-8 > * + * {
            margin-top: 2rem;
          }

          .flex {
            display: flex;
          }

          .flex-col {
            flex-direction: column;
          }

          .items-center {
            align-items: center;
          }

          .items-start {
            align-items: flex-start;
          }

          .justify-between {
            justify-content: space-between;
          }

          .justify-center {
            justify-content: center;
          }

          .gap-12 {
            gap: 3rem;
          }

          .gap-10 {
            gap: 2.5rem;
          }

          .flex-wrap {
            flex-wrap: wrap;
          }

          .w-full {
            width: 100%;
          }

          .h-full {
            height: 100%;
          }

          .h-96 {
            height: 24rem;
          }

          .text-center {
            text-align: center;
          }

          .text-lg {
            font-size: 1.125rem;
          }

          .text-sm {
            font-size: 0.875rem;
          }

          .text-xs {
            font-size: 0.75rem;
          }

          .text-xl {
            font-size: 1.25rem;
          }

          .text-3xl {
            font-size: 1.875rem;
          }

          .text-2xl {
            font-size: 1.5rem;
          }

          .text-5xl {
            font-size: 3rem;
          }

          .font-bold {
            font-weight: 700;
          }

          .font-semibold {
            font-weight: 600;
          }

          .leading-relaxed {
            line-height: 1.625;
          }

          .leading-tight {
            line-height: 1.25;
          }

          .text-white {
            color: white;
          }

          .text-gray-900 {
            color: #111827;
          }

          .text-gray-600 {
            color: #4b5563;
          }

          .text-gray-500 {
            color: #6b7280;
          }

          .text-emerald-600 {
            color: #059669;
          }

          .text-emerald-700 {
            color: #047857;
          }

          .hover\\:border-emerald-600:hover {
            border-color: #059669;
          }

          .hover\\:text-emerald-600:hover {
            color: #059669;
          }

          .transition {
            transition-property: all;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 300ms;
          }

          .shadow-lg {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }

          .bg-emerald-100 {
            background-color: #d1fae5;
          }

          .bg-white {
            background-color: white;
          }

          .bg-gray-50 {
            background-color: #f9fafb;
          }

          .sticky {
            position: sticky;
          }

          .top-0 {
            top: 0;
          }

          .z-40 {
            z-index: 40;
          }

          .relative {
            position: relative;
          }

          .inset-0 {
            inset: 0;
          }

          .absolute {
            position: absolute;
          }

          .min-h-screen {
            min-height: 100vh;
          }

          .min-h-\\[90vh\\] {
            min-height: 90vh;
          }

          .hidden {
            display: none;
          }

          .lg\\:block {
            @media (min-width: 1024px) {
              display: block;
            }
          }

          .sm\\:block {
            @media (min-width: 640px) {
              display: block;
            }
          }

          .sm\\:flex-row {
            @media (min-width: 640px) {
              flex-direction: row;
            }
          }

          .overflow-hidden {
            overflow: hidden;
          }

          .whitespace-nowrap {
            white-space: nowrap;
          }

          .inline-block {
            display: inline-block;
          }

          .max-w-\\[50ch\\] {
            max-width: 50ch;
          }

          .max-w-\\[60ch\\] {
            max-width: 60ch;
          }

          .md\\:flex-row {
            @media (min-width: 768px) {
              flex-direction: row;
            }
          }

          .z-10 {
            z-index: 10;
          }
        `}</style>
        {/* Navigation */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>Verkspay</div>
            <button style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Sign In
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto', width: '100%', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#111827' }}>
                Get paid 3 days faster
              </h1>
              
              <p style={{ fontSize: '1.125rem', color: '#4b5563', maxWidth: '50ch', lineHeight: 1.625 }}>
                Invoicing built for freelancers and growing businesses. Smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button className="btn-primary" style={{ padding: '1rem 2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 600, fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}>
                  Start Free Trial
                </button>
                <button style={{ padding: '1rem 2rem', borderRadius: '0.5rem', border: '2px solid #d1d5db', fontWeight: 600, color: '#111827', background: 'none', cursor: 'pointer' }}>
                  See it in action
                </button>
              </div>
              
              <div style={{ paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>Trusted by freelancers worldwide</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>2.3M+ invoices processed</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>•</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>42% faster collection</span>
                </div>
              </div>
            </div>
            
            {/* Right Visual */}
            <div style={{ display: 'none' }} className="lg:block">
              <div className="float-animation glass-card" style={{ borderRadius: '1.5rem', overflow: 'hidden', height: '24rem' }}>
                <div style={{ height: '100%', background: 'linear-gradient(to bottom right, #f0fdf4, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                    <p style={{ color: '#4b5563', fontWeight: 600 }}>Invoice sent & paid in 24h</p>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>Real-time payment tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ paddingTop: '6rem', paddingBottom: '6rem', padding: '0 1.5rem' }}>
          <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: '#111827', marginBottom: '1rem' }}>Built for your workflow</h2>
              <p style={{ fontSize: '1.125rem', color: '#4b5563', maxWidth: '60ch', marginLeft: 'auto', marginRight: 'auto' }}>
                Everything you need to get paid faster and manage clients better
              </p>
            </div>
            
            <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div className="stagger-item glass-card" style={{ borderRadius: '1rem', padding: '2.5rem' }}>
                <div style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>🔔</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Smart Reminders</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.625 }}>Automated follow-ups at 3, 7, and 14 days overdue. Stop chasing manually.</p>
              </div>
              
              <div className="stagger-item glass-card" style={{ borderRadius: '1rem', padding: '2.5rem' }}>
                <div style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>💸</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Partial Payments</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.625 }}>Collect deposits upfront, track the remainder automatically.</p>
              </div>
              
              <div className="stagger-item glass-card" style={{ borderRadius: '1rem', padding: '2.5rem' }}>
                <div style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>💳</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Stripe Payments</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.625 }}>Send a payment link, get paid instantly into your account.</p>
              </div>
              
              <div className="stagger-item glass-card" style={{ borderRadius: '1rem', padding: '2.5rem' }}>
                <div style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>🤖</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>AI-Powered CRM</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.625 }}>Client health scores, AI summaries, smart follow-up suggestions.</p>
              </div>
              
              <div className="stagger-item glass-card" style={{ borderRadius: '1rem', padding: '2.5rem' }}>
                <div style={{ fontSize: '1.875rem', marginBottom: '1rem' }}>📋</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Proposals & Contracts</h3>
                <p style={{ color: '#4b5563', lineHeight: 1.625 }}>Create professional proposals, win clients, and convert to invoices with one click.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section style={{ paddingTop: '6rem', paddingBottom: '6rem', padding: '0 1.5rem', backgroundColor: '#f9fafb' }}>
          <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>Simple, transparent pricing</h2>
              <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>Choose the plan that fits your needs</p>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)' }}>
              <div className="pricing-item" style={{ padding: '2rem', borderBottom: '1px solid rgba(229, 231, 235, 0.3)', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '2rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>Starter</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>For freelancers</p>
                </div>
                <div>
                  <ul style={{ fontSize: '0.875rem', color: '#4b5563', listStyle: 'none', padding: 0 }}>
                    <li>✓ Up to 20 invoices/month</li>
                    <li>✓ Stripe payments</li>
                    <li>✓ Smart reminders</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>$19</div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>/month</p>
                </div>
                <button style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontWeight: 600, color: '#111827', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start Free
                </button>
              </div>
              
              <div className="pricing-item featured" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '2rem', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', borderLeft: '4px solid #10b981' }}>
                <div>
                  <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#d1fae5', color: '#047857', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>Most Popular</div>
                  <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>Pro</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>For growing freelancers</p>
                </div>
                <div>
                  <ul style={{ fontSize: '0.875rem', color: '#4b5563', listStyle: 'none', padding: 0 }}>
                    <li>✓ Unlimited invoices</li>
                    <li>✓ Partial payments</li>
                    <li>✓ Recurring invoices</li>
                    <li>✓ Proposals</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>$49</div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>/month</p>
                </div>
                <button style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start Free
                </button>
              </div>
              
              <div className="pricing-item" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '2rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>Enterprise</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>For teams & agencies</p>
                </div>
                <div>
                  <ul style={{ fontSize: '0.875rem', color: '#4b5563', listStyle: 'none', padding: 0 }}>
                    <li>✓ Everything in Pro</li>
                    <li>✓ Revenue forecasting</li>
                    <li>✓ Team management</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>$89</div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>/month</p>
                </div>
                <button style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontWeight: 600, color: '#111827', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start Free
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ paddingTop: '6rem', paddingBottom: '6rem', padding: '0 1.5rem', background: 'linear-gradient(to bottom right, #f0fdf4, #eff6ff)' }}>
          <div style={{ maxWidth: '56rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>Start free. Upgrade when you're ready.</h2>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '2rem', maxWidth: '50ch', marginLeft: 'auto', marginRight: 'auto' }}>
              No credit card required. 14-day free trial. Cancel anytime.
            </p>
            <button className="btn-primary" style={{ padding: '1rem 2.5rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 600, fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}>
              Start Free Today
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #e5e7eb', backgroundColor: 'white', paddingTop: '3rem', paddingBottom: '3rem', padding: '0 1.5rem' }}>
          <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <h4 style={{ fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>Verkspay</h4>
                <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>Get paid faster. Chase invoices less.</p>
              </div>
              <div>
                <h4 style={{ fontWeight: 600, color: '#111827', marginBottom: '1rem', fontSize: '0.875rem' }}>Product</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ fontSize: '0.875rem', color: '#4b5563', textDecoration: 'none' }}>Features</a></li>
                  <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ fontSize: '0.875rem', color: '#4b5563', textDecoration: 'none' }}>Pricing</a></li>
                  <li><a href="#" style={{ fontSize: '0.875rem', color: '#4b5563', textDecoration: 'none' }}>Security</a></li>
                </ul>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              <p>© 2026 Verkspay. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
  )
}
