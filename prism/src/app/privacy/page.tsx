export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/10 to-blue-500/5 border-b border-blue-400/20 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-lg">Effective Date: March 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Intro */}
        <section>
          <p className="text-gray-300 text-lg leading-relaxed">
            At Prism, we take your privacy seriously. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your information.
          </p>
        </section>

        {/* What Data We Collect */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-blue-400">What Data We Collect</h2>
          <div className="glass rounded-lg p-6 border border-blue-400/20 space-y-4 text-gray-300">
            <div>
              <p className="font-semibold text-white mb-2">Account Information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your name and email address</li>
                <li>Business name and logo (optional)</li>
                <li>Payment details (bank account, DuitNow ID)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Business Data:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Invoices you create (amounts, descriptions, dates)</li>
                <li>Client information (name, email, payment history)</li>
                <li>Line items and project descriptions</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Usage Data:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>How you interact with Prism (features used, login times)</li>
                <li>Device information (browser type, IP address)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Your Data */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-blue-400">How We Use Your Data</h2>
          <div className="glass rounded-lg p-6 border border-blue-400/20 space-y-3 text-gray-300">
            <p className="font-semibold text-white">We use your data to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Provide invoicing and payment tracking services</li>
              <li>Send payment reminders to your clients</li>
              <li>Process payments through our payment providers</li>
              <li>Authenticate your account and prevent fraud</li>
              <li>Improve Prism's features and performance</li>
              <li>Communicate with you about your account and service updates</li>
            </ul>
          </div>
        </section>

        {/* Who We Share It With */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-blue-400">Who We Share Your Data With</h2>
          <div className="glass rounded-lg p-6 border border-blue-400/20 space-y-4 text-gray-300">
            <p className="font-semibold text-white mb-4">We only share your data with:</p>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-white mb-1">Stripe</p>
                <p className="text-sm text-gray-400">For processing credit card payments. Your card details are never stored on our servers.</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Resend</p>
                <p className="text-sm text-gray-400">For sending payment reminder emails to your clients.</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Supabase</p>
                <p className="text-sm text-gray-400">For secure database storage and authentication.</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              These providers are contractually obligated to protect your data and use it only for the purposes we've specified.
            </p>
          </div>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-blue-400">How Long We Keep Your Data</h2>
          <div className="glass rounded-lg p-6 border border-blue-400/20 text-gray-300">
            <p className="mb-3">
              We keep your data for as long as your account is active. When you delete your account:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Your personal information is permanently deleted</li>
              <li>Your invoices and client data are retained for 7 years (for legal/tax compliance)</li>
              <li>Backup copies are retained for 30 days for disaster recovery</li>
            </ul>
          </div>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-blue-400">Your Privacy Rights</h2>
          <div className="glass rounded-lg p-6 border border-blue-400/20 space-y-3 text-gray-300">
            <p className="font-semibold text-white mb-3">Under Malaysian PDPA and GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct any inaccurate information</li>
              <li><strong>Deletion:</strong> Request permanent deletion of your account and associated data</li>
              <li><strong>Portability:</strong> Export your data in a standard format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails anytime</li>
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              To exercise any of these rights, email us at support@prismops.xyz with "Privacy Request" in the subject line.
            </p>
          </div>
        </section>

        {/* Contact & Governing Law */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-blue-400">Contact & Governing Law</h2>
            <div className="glass rounded-lg p-6 border border-blue-400/20 text-gray-300">
              <p className="mb-4">
                This Privacy Policy is governed by Malaysian law and complies with the <strong>PDPA (Personal Data Protection Act)</strong> and <strong>GDPR</strong> where applicable.
              </p>
              <p className="font-semibold text-white mb-2">For privacy questions or concerns:</p>
              <p className="text-blue-400 font-semibold">support@prismops.xyz</p>
            </div>
          </div>
        </section>

        {/* Last Updated */}
        <div className="border-t border-white/10 pt-8 text-gray-400 text-sm">
          <p>Last updated: March 2026</p>
          <p>This policy may be updated periodically. We'll notify you of significant changes via email.</p>
        </div>
      </div>
    </div>
  )
}
