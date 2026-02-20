'use client';

import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Introduction',
    content: `Frictionless Intelligence, Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services. Please read this Privacy Policy carefully. By using the Service, you consent to the data practices described in this policy.`,
  },
  {
    title: '2. Information We Collect',
    content: `We collect information that you provide directly to us, including:

• Account Information: Name, email address, company name, role, and password when you create an account.
• Profile Information: Company details, fundraising stage, industry, and other business information you provide.
• Financial Data: Revenue metrics, financial projections, and other data submitted for Frictionless scoring.
• Documents: Files you upload to data rooms, including pitch decks, financial models, and legal documents.
• Communications: Messages sent through our AI chat assistant and any correspondence with our team.
• Payment Information: Billing details processed securely through our payment provider (Stripe).

We also automatically collect certain information, including:
• Usage Data: Pages viewed, features used, clicks, and time spent on the platform.
• Device Information: Browser type, operating system, device type, and IP address.
• Cookies and Tracking: Information collected through cookies, pixels, and similar technologies.`,
  },
  {
    title: '3. How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve the Service
• Generate Frictionless scores and investor matches
• Power our AI chat assistant with contextual responses
• Send you technical notices, updates, and administrative messages
• Respond to your comments, questions, and customer service requests
• Monitor and analyze usage trends and preferences
• Detect, investigate, and prevent fraudulent or unauthorized activities
• Comply with legal obligations and enforce our Terms of Service

We do not sell your personal information to third parties. We do not use your uploaded documents or financial data for any purpose other than providing the Service to you.`,
  },
  {
    title: '4. AI and Machine Learning',
    content: `Our AI systems process your data to generate Frictionless scores, investor matches, and recommendations. We may use aggregated, anonymized data to improve our AI models. Your individual data is never shared with other users or used to train models in a way that could expose your confidential information. You can request deletion of your data and its exclusion from our training datasets at any time.`,
  },
  {
    title: '5. Data Sharing and Disclosure',
    content: `We may share your information in the following circumstances:

• With Your Consent: When you explicitly authorize sharing, such as when you grant investor access to your data room.
• Service Providers: With third-party vendors who perform services on our behalf (hosting, analytics, payment processing), subject to confidentiality obligations.
• Legal Requirements: When required by law, subpoena, or legal process, or to protect our rights, privacy, safety, or property.
• Business Transfers: In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.

We require all third parties to respect the security of your personal data and to treat it in accordance with applicable law.`,
  },
  {
    id: 'cookies',
    title: '6. Cookies and Tracking Technologies',
    content: `We use cookies and similar tracking technologies to collect and track information about your use of the Service. Cookies are small data files stored on your device.

• Essential Cookies: Required for the Service to function (authentication, security).
• Analytics Cookies: Help us understand how users interact with the Service (Google Analytics).
• Preference Cookies: Remember your settings and preferences.

You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of the Service may not function properly without cookies.`,
  },
  {
    title: '7. Data Security',
    content: `We implement industry-standard security measures including:

• AES-256 encryption for data at rest
• TLS 1.3 encryption for data in transit
• SOC 2 Type II compliance
• Regular penetration testing and security audits
• Role-based access controls and multi-factor authentication
• Data centers in SOC 2 compliant facilities

Despite our efforts, no security measures are perfect or impenetrable. We cannot guarantee the absolute security of your data.`,
  },
  {
    title: '8. Data Retention',
    content: `We retain your information for as long as your account is active or as needed to provide you the Service. You can request deletion of your account and data at any time by contacting us at privacy@frictionless.ai. Upon account deletion, we will delete or anonymize your data within 30 days, except where retention is required by law or for legitimate business purposes (such as resolving disputes).`,
  },
  {
    title: '9. Your Rights',
    content: `Depending on your location, you may have the following rights regarding your personal data:

• Access: Request a copy of the personal data we hold about you.
• Correction: Request correction of inaccurate or incomplete data.
• Deletion: Request deletion of your personal data.
• Portability: Request a copy of your data in a machine-readable format.
• Objection: Object to certain processing of your data.
• Restriction: Request restriction of processing in certain circumstances.

To exercise any of these rights, contact us at privacy@frictionless.ai. We will respond within 30 days.`,
  },
  {
    title: '10. International Data Transfers',
    content: `Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for international transfers, including Standard Contractual Clauses approved by the European Commission where applicable.`,
  },
  {
    title: '11. Children\'s Privacy',
    content: `The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal data, please contact us immediately.`,
  },
  {
    title: '12. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.`,
  },
  {
    title: '13. Contact Us',
    content: `If you have questions about this Privacy Policy or our data practices, please contact us at:

Frictionless Intelligence, Inc.
Privacy Team
548 Market Street, Suite 36879
San Francisco, CA 94104
Email: privacy@frictionless.ai`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-32 px-4">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold mb-4">
            Privacy Policy
          </h1>
          <p className="text-obsidian-500 font-body text-sm">
            Last updated: January 15, 2025
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.title}
              id={('id' in section && section.id) || undefined}
              className="scroll-mt-24"
            >
              <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-4">
                {section.title}
              </h2>
              <div className="text-obsidian-400 font-body text-sm md:text-base leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
