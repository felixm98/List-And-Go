import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: February 6, 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to List-And-Go ("we," "our," or "us"). We are committed to protecting your privacy 
                and ensuring the security of your personal information. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our Etsy bulk listing 
                management application.
              </p>
              <p className="text-gray-700">
                By using List-And-Go, you agree to the collection and use of information in accordance 
                with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">2.1 Etsy Account Information</h3>
              <p className="text-gray-700 mb-4">
                When you connect your Etsy account, we receive and store:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Your Etsy Shop ID and Shop Name</li>
                <li>OAuth access tokens and refresh tokens (encrypted)</li>
                <li>Basic shop information necessary for listing management</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">2.2 Listing Data</h3>
              <p className="text-gray-700 mb-4">
                To provide our services, we process:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Product images you upload for listing creation</li>
                <li>Listing titles, descriptions, tags, and pricing information</li>
                <li>Shipping profiles, return policies, and shop sections from your Etsy account</li>
                <li>Listing presets and templates you create within our app</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3">2.3 Usage Data</h3>
              <p className="text-gray-700 mb-4">
                We may collect information about how you use our application, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Features accessed and actions taken</li>
                <li>Error logs and performance data</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Authenticate your Etsy account and maintain your session</li>
                <li>Create, manage, and publish listings on your behalf</li>
                <li>Create and manage listing content (titles, descriptions, tags)</li>
                <li>Store your presets and templates for future use</li>
                <li>Schedule listings for future publication</li>
                <li>Improve our services and user experience</li>
                <li>Provide customer support</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Token Encryption:</strong> All Etsy OAuth tokens are encrypted using Fernet 
                  symmetric encryption before storage</li>
                <li><strong>Secure Authentication:</strong> We use OAuth 2.0 with PKCE (Proof Key for 
                  Code Exchange) for secure Etsy authentication</li>
                <li><strong>HTTPS:</strong> All data transmission is encrypted using TLS/SSL</li>
                <li><strong>Password Hashing:</strong> Any stored credentials are hashed using secure 
                  algorithms</li>
                <li><strong>Access Controls:</strong> Your data is only accessible to you through your 
                  authenticated session</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We integrate with the following third-party services:</p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">5.1 Etsy API</h3>
              <p className="text-gray-700 mb-4">
                We use the official Etsy Open API to manage your listings. Your use of Etsy is also 
                governed by <a href="https://www.etsy.com/legal/privacy/" target="_blank" rel="noopener noreferrer" 
                className="text-brand-primary hover:underline">Etsy's Privacy Policy</a>.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3">5.2 Hosting (Render)</h3>
              <p className="text-gray-700">
                Our application is hosted on Render's cloud platform. Your data is stored securely 
                in accordance with Render's security practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your data for as long as your account is active or as needed to provide you 
                services. You can request deletion of your data at any time by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Disconnecting your Etsy account from within the app</li>
                <li>Contacting us to request complete account deletion</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon account deletion, we will remove all your personal data, presets, templates, and 
                stored tokens within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Revoke Access:</strong> Disconnect your Etsy account at any time</li>
                <li><strong>Data Portability:</strong> Request your data in a portable format</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not intended for individuals under the age of 18. We do not knowingly 
                collect personal information from children. If you believe we have collected information 
                from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                Your continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy or our data practices, please 
                contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> iggy.lundmark@telefonista.nu<br />
                  <strong>Subject:</strong> Privacy Policy Inquiry
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
