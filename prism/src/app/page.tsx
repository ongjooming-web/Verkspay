'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [isDark, setIsDark] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light'
    const isDarkMode = savedTheme === 'dark'
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode')
    }
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    document.documentElement.classList.toggle('dark-mode')
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
  }

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      alert('Thanks! We\'ll notify you when Prism launches.')
      setEmail('')
    }
  }

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary: #667eea;
          --primary-dark: #764ba2;
          --accent-red: #ff6b6b;
          --accent-orange: #ff9f6b;
          --accent-yellow: #ffd93d;
          --accent-green: #6bdb77;
          --accent-blue: #4d96ff;
          --accent-purple: #b565d8;
          
          /* Light mode */
          --bg-primary: #ffffff;
          --bg-secondary: #f5f7fa;
          --bg-tertiary: #eef1f5;
          --text-primary: #1a1a1a;
          --text-secondary: #666666;
          --text-tertiary: #999999;
          --border-color: rgba(0, 0, 0, 0.1);
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.15);
        }

        html.dark-mode {
          --bg-primary: #0f0f0f;
          --bg-secondary: #1a1a1a;
          --bg-tertiary: #2d2d2d;
          --text-primary: #ffffff;
          --text-secondary: #cccccc;
          --text-tertiary: #999999;
          --border-color: rgba(255, 255, 255, 0.1);
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          line-height: 1.6;
          color: var(--text-primary);
          background: var(--bg-secondary);
          transition: background-color 0.3s, color 0.3s;
        }

        /* ===== HEADER ===== */
        header {
          background: var(--bg-primary);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: background-color 0.3s, border-color 0.3s;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          text-decoration: none;
        }

        .hex-logo {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        nav {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        nav a {
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 500;
          transition: color 0.3s;
          cursor: pointer;
        }

        nav a:hover {
          color: var(--primary);
        }

        .theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          transition: color 0.3s;
        }

        .theme-toggle:hover {
          color: var(--primary);
        }

        .cta-button {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .cta-button.secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .cta-button.secondary:hover {
          background: var(--border-color);
        }

        /* ===== HERO SECTION ===== */
        .hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .hero-content h1 {
          font-size: 3.2rem;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          font-weight: 900;
        }

        .hero-content .tagline {
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
          line-height: 1.7;
        }

        .hero-cta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .hero-cta .cta-button {
          padding: 1rem 2rem;
          font-size: 1.05rem;
        }

        .hero-visual {
          background: linear-gradient(135deg, 
            rgba(102, 126, 234, 0.1) 0%,
            rgba(118, 75, 162, 0.1) 50%,
            rgba(255, 107, 107, 0.05) 100%
          );
          border-radius: 16px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .hero-visual::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, 
            var(--accent-red),
            var(--accent-orange),
            var(--accent-yellow),
            var(--accent-green),
            var(--accent-blue),
            var(--accent-purple)
          );
          border-radius: 50%;
          opacity: 0.15;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }

        .dashboard-mockup {
          position: relative;
          z-index: 1;
          width: 90%;
          max-width: 350px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: var(--shadow-lg);
        }

        .mockup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .mockup-header h3 {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .mockup-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1rem 0;
          padding: 0.75rem 0;
        }

        .mockup-stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .mockup-stat-value {
          font-size: 1.3rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ===== CRYPTO FEATURE ===== */
        .crypto-banner {
          background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
          color: white;
          padding: 3rem 2rem;
          text-align: center;
          margin: 4rem 2rem;
          border-radius: 16px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .crypto-banner h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .crypto-banner .usdc-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          margin: 1rem 0;
        }

        .crypto-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .crypto-feature {
          text-align: center;
        }

        .crypto-feature-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .crypto-feature h4 {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        /* ===== FEATURES GRID ===== */
        .features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }

        .section-title {
          text-align: center;
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .section-subtitle {
          text-align: center;
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 3rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature {
          background: var(--bg-primary);
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
        }

        .feature:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          color: white;
        }

        .feature-icon svg {
          width: 24px;
          height: 24px;
        }

        .feature h3 {
          font-size: 1.2rem;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
          font-weight: 700;
        }

        .feature p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* ===== PRICING ===== */
        .pricing {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }

        .pricing h2 {
          text-align: center;
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .pricing-subtitle {
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 3rem;
          font-size: 1.1rem;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
        }

        .pricing-card {
          background: var(--bg-primary);
          padding: 2.5rem;
          border-radius: 12px;
          border: 2px solid var(--border-color);
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s;
          position: relative;
        }

        .pricing-card:hover {
          border-color: var(--primary);
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .pricing-card.featured {
          border-color: var(--primary);
          transform: scale(1.05);
        }

        .pricing-card h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
          font-weight: 700;
        }

        .pricing-card .subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }

        .price {
          font-size: 2.8rem;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 1rem 0;
        }

        .price-period {
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 500;
        }

        .pricing-card ul {
          list-style: none;
          margin: 2rem 0;
          text-align: left;
        }

        .pricing-card li {
          padding: 0.75rem 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .pricing-card li::before {
          content: '✓';
          color: var(--accent-green);
          font-weight: 700;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .pricing-card li.disabled {
          opacity: 0.5;
        }

        .pricing-card li.disabled::before {
          content: '✗';
          color: var(--accent-red);
        }

        .pricing-card .cta-button {
          width: 100%;
          margin-top: 2rem;
        }

        /* ===== CTA SECTION ===== */
        .cta-section {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
          margin: 4rem 2rem;
          border-radius: 16px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-section h2 {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          font-weight: 800;
        }

        .cta-section p {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.95;
        }

        .email-signup {
          display: flex;
          gap: 0.5rem;
          max-width: 450px;
          margin: 0 auto;
          flex-wrap: wrap;
          justify-content: center;
        }

        .email-signup input {
          flex: 1;
          min-width: 240px;
          padding: 0.85rem 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transition: all 0.3s;
        }

        .email-signup input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .email-signup input:focus {
          outline: none;
          border-color: white;
          background: rgba(255, 255, 255, 0.15);
        }

        .email-signup button {
          padding: 0.85rem 2rem;
          background: white;
          color: var(--primary);
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .email-signup button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .email-disclaimer {
          margin-top: 1.5rem;
          font-size: 0.9rem;
          opacity: 0.85;
        }

        /* ===== FOOTER ===== */
        footer {
          background: var(--bg-primary);
          color: var(--text-secondary);
          text-align: center;
          padding: 3rem 2rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        footer a {
          color: var(--primary);
          text-decoration: none;
          transition: color 0.3s;
        }

        footer a:hover {
          color: var(--primary-dark);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .hero {
            grid-template-columns: 1fr;
            padding: 3rem 2rem;
            gap: 2rem;
          }

          .hero-content h1 {
            font-size: 2rem;
          }

          .hero-visual {
            height: 300px;
          }

          header {
            padding: 1rem 1.5rem;
          }

          nav {
            gap: 1rem;
            font-size: 0.85rem;
          }

          .section-title {
            font-size: 1.8rem;
          }

          .pricing-card.featured {
            transform: scale(1);
          }

          .email-signup {
            flex-direction: column;
          }

          .email-signup input,
          .email-signup button {
            width: 100%;
          }

          .crypto-banner {
            margin: 2rem 0;
            padding: 2rem 1.5rem;
          }

          .cta-section {
            margin: 2rem 0;
            padding: 2.5rem 1.5rem;
          }
        }

        @media (max-width: 480px) {
          body {
            font-size: 14px;
          }

          header {
            flex-direction: column;
            gap: 1rem;
          }

          nav {
            width: 100%;
            justify-content: center;
            gap: 0.75rem;
          }

          .hero-content h1 {
            font-size: 1.5rem;
          }

          .section-title {
            font-size: 1.5rem;
          }

          .features {
            grid-template-columns: 1fr;
          }

          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* HEADER */}
      <header>
        <Link href="/" className="logo">
          <svg className="hex-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                <stop offset="16.67%" style={{ stopColor: '#ff9f6b', stopOpacity: 1 }} />
                <stop offset="33.33%" style={{ stopColor: '#ffd93d', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#6bdb77', stopOpacity: 1 }} />
                <stop offset="66.67%" style={{ stopColor: '#4d96ff', stopOpacity: 1 }} />
                <stop offset="83.33%" style={{ stopColor: '#b565d8', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <polygon points="50,5 93.3,28.33 93.3,75 50,98.33 6.7,75 6.7,28.33" 
                     fill="url(#rainbowGradient)" 
                     stroke="url(#rainbowGradient)" 
                     strokeWidth="1.5"/>
            <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                  dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
          </svg>
          Prism
        </Link>

        <nav>
          <a href="#features">Features</a>
          <a href="#crypto">Crypto</a>
          <a href="#pricing">Pricing</a>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
            {isDark ? (
              <svg className="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg className="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <h1>Proposals, contracts, invoices — and crypto. Finally together.</h1>
          <p className="tagline">
            Manage your entire freelance operation in one place. Get paid in USDC instantly. No middlemen, no delays.
          </p>
          <div className="hero-cta">
            <Link href="/app/signup" className="cta-button">Start for Free</Link>
            <Link href="/app/dashboard" className="cta-button secondary">View Demo</Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <h3>Dashboard</h3>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
            </div>
            <div className="mockup-stat">
              <span className="mockup-stat-label">Revenue</span>
              <span className="mockup-stat-value">$12.5K</span>
            </div>
            <div className="mockup-stat">
              <span className="mockup-stat-label">Invoices</span>
              <span className="mockup-stat-value">24</span>
            </div>
            <div className="mockup-stat">
              <span className="mockup-stat-label">Clients</span>
              <span className="mockup-stat-value">8</span>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Paid in USDC ✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* CRYPTO BANNER */}
      <section className="crypto-banner" id="crypto">
        <h2>Crypto Payments Built In</h2>
        <div className="usdc-badge">💙 USDC on Base, Ethereum & Polygon</div>
        <p style={{ marginTop: '1rem', fontSize: '1rem' }}>
          Get paid instantly. No payment processors, no 3% fees, no waiting. Settle anywhere in the world in seconds.
        </p>
        <div className="crypto-features">
          <div className="crypto-feature">
            <div className="crypto-feature-icon">⚡</div>
            <h4>Instant Settlement</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.95 }}>Funds arrive in seconds</p>
          </div>
          <div className="crypto-feature">
            <div className="crypto-feature-icon">🌍</div>
            <h4>Global</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.95 }}>Borderless payments</p>
          </div>
          <div className="crypto-feature">
            <div className="crypto-feature-icon">💰</div>
            <h4>No Fees</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.95 }}>Keep more of what you earn</p>
          </div>
          <div className="crypto-feature">
            <div className="crypto-feature-icon">🔒</div>
            <h4>Secure</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.95 }}>Your keys, your money</p>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section" id="features">
        <h2 className="section-title">Everything You Need</h2>
        <p className="section-subtitle">Built specifically for freelancers and agencies. From contracts to cash flow.</p>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <h3>Proposals & Contracts</h3>
            <p>Create professional proposals in minutes. Sign, store, and track every contract. Templates built-in.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3>Client CRM</h3>
            <p>Keep all client info, contact history, and project notes organized. Never lose a conversation.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>Team Management</h3>
            <p>Collaborate with teammates. Assign tasks, track progress, and manage permissions.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3>Invoicing</h3>
            <p>Create, send, and track invoices instantly. Know what's owed, when it's due, and payment status.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
              </svg>
            </div>
            <h3>Crypto Payments</h3>
            <p>Accept USDC instantly. No payment processors, no fees, no delays. Settle on your terms.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3>Dashboard & Analytics</h3>
            <p>Real-time visibility into revenue, pipeline, and cash flow. Know your business at a glance.</p>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="pricing" id="pricing">
        <h2>Simple Pricing That Scales</h2>
        <p className="pricing-subtitle">Start free. Upgrade when you're ready.</p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Free</h3>
            <p className="subtitle">Perfect for testing</p>
            <div className="price">$0<span className="price-period">/mo</span></div>
            <ul>
              <li>3 active clients</li>
              <li>5 invoices/month</li>
              <li>Basic CRM</li>
              <li className="disabled">Contract templates</li>
              <li className="disabled">Crypto payments</li>
            </ul>
            <button className="cta-button secondary">Get Started</button>
          </div>

          <div className="pricing-card featured">
            <h3>Pro</h3>
            <p className="subtitle">For growing freelancers</p>
            <div className="price">$49<span className="price-period">/mo</span></div>
            <ul>
              <li>Unlimited clients</li>
              <li>Unlimited invoices</li>
              <li>Advanced CRM</li>
              <li>Contract templates</li>
              <li>Crypto payments (USDC)</li>
            </ul>
            <button className="cta-button">Start Free Trial</button>
          </div>

          <div className="pricing-card">
            <h3>Agency</h3>
            <p className="subtitle">For growing agencies</p>
            <div className="price">$299<span className="price-period">/mo</span></div>
            <ul>
              <li>Everything in Pro</li>
              <li>Team management</li>
              <li>Advanced reporting</li>
              <li>White label option</li>
              <li>Priority support</li>
            </ul>
            <button className="cta-button">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <h2>Ready to Simplify Your Ops?</h2>
        <p>Get early access and exclusive updates.</p>
        <form className="email-signup" onSubmit={handleEmailSignup}>
          <input 
            type="email" 
            placeholder="your@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Notify Me</button>
        </form>
        <p className="email-disclaimer">No spam, ever. Unsubscribe anytime.</p>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Or <Link href="/app/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>sign up now</Link> to start using Prism today.
        </p>
      </section>

      {/* FOOTER */}
      <footer>
        <p>&copy; 2026 Prism. <a href="#">Status</a> • <a href="#">Twitter</a> • <a href="#">Contact</a></p>
      </footer>
    </>
  )
}
