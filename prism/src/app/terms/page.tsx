export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/10 to-orange-500/5 border-b border-orange-400/20 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-400 text-lg">Effective Date: March 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Intro */}
        <section>
          <p className="text-gray-300 text-lg leading-relaxed">
            By using Prism, you agree to these Terms of Service. Please read them carefully. If you don't agree with any part, you may not use Prism.
          </p>
        </section>

        {/* What is Prism */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">What is Prism?</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-3">
              Prism is invoicing and payment tracking software designed for freelancers and small businesses. It helps you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Create and send invoices to clients</li>
              <li>Track payment status and send reminders</li>
              <li>Accept online payments via Stripe</li>
              <li>Manage client information</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400 italic">
              <strong>Important:</strong> Prism is invoicing software, NOT a payment processor. We do not process payments directly—we integrate with Stripe for payment processing.
            </p>
          </div>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Acceptable Use</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="font-semibold text-white mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Create invoices for illegal goods or services</li>
              <li>Use Prism to commit fraud or deceive clients</li>
              <li>Engage in money laundering or financing illegal activities</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Attempt to hack, bypass, or reverse-engineer Prism</li>
              <li>Use Prism to send spam or unsolicited emails</li>
              <li>Violate any applicable laws in your jurisdiction</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Violation of these rules may result in immediate account termination.
            </p>
          </div>
        </section>

        {/* Subscription Terms */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Subscription Terms</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 space-y-4 text-gray-300">
            <div>
              <p className="font-semibold text-white mb-2">Billing & Auto-Renewal</p>
              <p className="text-sm">
                Prism subscriptions are billed monthly. Your subscription will automatically renew each month unless you cancel it. You will be charged on the same day each month.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Cancellation</p>
              <p className="text-sm">
                You can cancel your subscription anytime from your account settings. Your subscription will remain active until the end of the current billing period. No refund for the current month will be issued.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Price Changes</p>
              <p className="text-sm">
                We may change subscription prices with 30 days' notice. Changes will apply on your next billing date.
              </p>
            </div>
          </div>
        </section>

        {/* Refund Policy */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Refund Policy</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-4">
              We offer pro-rata refunds within <strong>7 days of your initial charge</strong> if:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
              <li>You believe the charge was made in error</li>
              <li>You request a refund within 7 days of being charged</li>
              <li>You have not accessed paid features extensively</li>
            </ul>
            <p className="text-sm text-gray-400">
              To request a refund, email support@prismops.xyz with your invoice number and reason. Refunds are processed within 5-10 business days.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              After 7 days, no refunds are available. You may cancel at any time to avoid future charges.
            </p>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Limitation of Liability</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-4 font-semibold text-white">Important Disclaimer:</p>
            <p className="mb-4">
              Prism is a tool for creating and sending invoices. We are <strong>NOT responsible for</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
              <li>Payment disputes between you and your clients</li>
              <li>Late payments or non-payment by your clients</li>
              <li>Accuracy of information you enter into invoices</li>
              <li>Client disputes or chargebacks on Stripe</li>
              <li>Tax or accounting issues related to your invoices</li>
              <li>Data loss due to account deletion or technical failures</li>
            </ul>
            <p className="text-sm text-gray-400">
              To the fullest extent permitted by law, Prism's liability is limited to the amount you paid for your subscription in the last 12 months.
            </p>
          </div>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Account Termination</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-4">
              We reserve the right to terminate your account <strong>immediately and without warning</strong> if:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>You violate these Terms of Service</li>
              <li>You engage in fraud, illegal activity, or abuse</li>
              <li>Your account is used for illegal purposes</li>
              <li>You violate Stripe's or any payment processor's terms</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Upon termination, you lose access to Prism. Archived invoices may be retained for legal compliance.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Disclaimer</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-3">Prism is provided "AS IS" without warranties:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>We do not guarantee uninterrupted service</li>
              <li>We do not guarantee data security (though we work hard on it)</li>
              <li>We do not guarantee the accuracy of payment processing</li>
              <li>We do not provide legal or accounting advice</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              You are responsible for backing up important invoice data and ensuring your account security.
            </p>
          </div>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Governing Law & Jurisdiction</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-3">
              These Terms of Service are governed by the laws of <strong>Malaysia</strong>. Any legal disputes will be handled in Malaysian courts.
            </p>
            <p className="text-sm text-gray-400">
              For non-Malaysian users: You agree to comply with your local laws and acknowledge that Prism may not be available in all jurisdictions due to legal restrictions.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-3xl font-bold mb-4 text-orange-400">Questions?</h2>
          <div className="glass rounded-lg p-6 border border-orange-400/20 text-gray-300">
            <p className="mb-2">For questions about these Terms, please contact:</p>
            <p className="text-orange-400 font-semibold">support@prismops.xyz</p>
          </div>
        </section>

        {/* Last Updated */}
        <div className="border-t border-white/10 pt-8 text-gray-400 text-sm">
          <p>Last updated: March 2026</p>
          <p>We may update these terms periodically. Continued use of Prism after changes constitute acceptance.</p>
        </div>
      </div>
    </div>
  )
}
