import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Link */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-brand-primary hover:text-brand-dark mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: February 6, 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using List-And-Go ("the Service"), you agree to be bound by these Terms 
                of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
              </p>
              <p className="text-gray-700">
                These Terms apply to all users of the Service, including Etsy sellers who connect their 
                shops to our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                List-And-Go is a listing management tool designed to help Etsy sellers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Create and manage product listings in bulk</li>
                <li>Generate AI-powered titles, descriptions, and tags</li>
                <li>Upload multiple product images efficiently</li>
                <li>Schedule listings for future publication</li>
                <li>Save listing presets and templates for reuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Etsy Account Requirements</h2>
              <p className="text-gray-700 mb-4">
                To use List-And-Go, you must:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Have an active Etsy seller account with an established shop</li>
                <li>Authorize List-And-Go to access your Etsy account via OAuth</li>
                <li>Comply with Etsy's Terms of Use, Seller Policy, and API Terms of Use</li>
                <li>Maintain accurate and up-to-date account information</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You are responsible for maintaining the security of your Etsy account credentials and 
                for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 mb-4">By using our Service, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use the Service only for lawful purposes and in compliance with all applicable laws</li>
                <li>Not upload content that infringes on intellectual property rights</li>
                <li>Not use the Service to create fraudulent, misleading, or deceptive listings</li>
                <li>Review all AI-generated content before publishing to ensure accuracy</li>
                <li>Take responsibility for all listings created through the Service</li>
                <li>Not attempt to reverse engineer, hack, or disrupt the Service</li>
                <li>Not use automated tools to access the Service beyond intended functionality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. AI-Generated Content</h2>
              <p className="text-gray-700 mb-4">
                Our Service uses artificial intelligence to generate listing content. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-generated content is provided as a starting point and may require editing</li>
                <li>You are solely responsible for reviewing and approving all content before publishing</li>
                <li>AI suggestions may not always be accurate or appropriate for your products</li>
                <li>We do not guarantee that AI-generated content will result in sales or rankings</li>
                <li>You retain full ownership and responsibility for all published content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">6.1 Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain all rights to the images, text, and other content you upload to the Service. 
                By uploading content, you grant us a limited license to process and display your content 
                solely for the purpose of providing the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">6.2 Our Content</h3>
              <p className="text-gray-700">
                The Service, including its design, features, and underlying technology, is owned by 
                List-And-Go and protected by intellectual property laws. You may not copy, modify, or 
                distribute any part of the Service without our written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>The Service is provided "as is" without warranties of any kind</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>We are not responsible for Etsy API availability or changes to Etsy's platform</li>
                <li>We are not liable for lost sales, revenue, or business opportunities</li>
                <li>Our total liability shall not exceed the amount you paid for the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless List-And-Go, its officers, directors, employees, 
                and agents from any claims, damages, losses, or expenses (including legal fees) arising 
                from your use of the Service, your violation of these Terms, or your violation of any 
                rights of a third party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain continuous service availability, but we do not guarantee 
                uninterrupted access. The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Scheduled maintenance and updates</li>
                <li>Etsy API downtime or rate limiting</li>
                <li>Technical issues beyond our control</li>
                <li>Force majeure events</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Account Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate your access to the Service at any time, 
                with or without cause, including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violation of these Terms</li>
                <li>Violation of Etsy's policies</li>
                <li>Fraudulent or illegal activity</li>
                <li>Abuse of the Service or its users</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You may terminate your account at any time by disconnecting your Etsy account and 
                discontinuing use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Modifications to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms at any time by posting the updated Terms on this page. 
                Your continued use of the Service after changes are posted constitutes acceptance 
                of the modified Terms. We encourage you to review the Terms periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the 
                jurisdiction in which List-And-Go operates, without regard to its conflict of law 
                provisions. Any disputes arising from these Terms or the Service shall be resolved 
                through binding arbitration or in the courts of the applicable jurisdiction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is found to be unenforceable or invalid, that 
                provision shall be limited or eliminated to the minimum extent necessary, and 
                the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-700">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> iggy.lundmark@telefonista.nu<br />
                  <strong>Subject:</strong> Terms of Service Inquiry
                </p>
              </div>
            </section>

            <section className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> By connecting your Etsy account to List-And-Go, you also agree 
                to comply with <a href="https://www.etsy.com/legal/terms-of-use" target="_blank" 
                rel="noopener noreferrer" className="underline">Etsy's Terms of Use</a> and 
                <a href="https://www.etsy.com/legal/api" target="_blank" rel="noopener noreferrer" 
                className="underline ml-1">Etsy's API Terms of Use</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
