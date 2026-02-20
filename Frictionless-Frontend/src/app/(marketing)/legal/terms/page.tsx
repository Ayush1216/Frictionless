'use client';

import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Frictionless Intelligence platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, users, and others who access or use the Service.`,
  },
  {
    title: '2. Description of Service',
    content: `Frictionless Intelligence provides an AI-powered investment Frictionless platform that includes Frictionless scoring, investor matching, AI chat assistance, task management, data room hosting, and analytics tools ("Platform"). The Service is designed to help startups prepare for and execute fundraising activities, and to help investors discover and evaluate investment opportunities.`,
  },
  {
    title: '3. User Accounts',
    content: `To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.`,
  },
  {
    title: '4. Subscription and Payments',
    content: `Some features of the Service require a paid subscription. By subscribing to a paid plan, you agree to pay the applicable fees. Fees are billed in advance on a monthly or annual basis depending on your selected plan. All fees are non-refundable except as expressly set forth in these Terms or as required by applicable law. We reserve the right to change our prices upon 30 days' notice.`,
  },
  {
    title: '5. User Content and Data',
    content: `You retain all rights to the content you upload, submit, or display through the Service ("User Content"). By uploading User Content, you grant us a limited license to process, store, and display your content solely for the purpose of providing the Service. We do not claim ownership over your User Content. You are solely responsible for the legality, reliability, and appropriateness of your User Content.`,
  },
  {
    title: '6. AI-Generated Content',
    content: `The Service uses artificial intelligence to generate Frictionless scores, investor matches, recommendations, and other content. AI-generated content is provided for informational purposes only and should not be considered as financial, legal, or investment advice. We make no guarantees regarding the accuracy, completeness, or reliability of AI-generated content. You acknowledge that investment decisions should be made with the assistance of qualified professional advisors.`,
  },
  {
    title: '7. Data Room and Confidentiality',
    content: `Data rooms created through the Service are subject to the access controls you configure. We implement industry-standard security measures to protect data room contents but cannot guarantee absolute security. You are responsible for managing access permissions to your data rooms and for ensuring that sensitive information is shared only with authorized parties.`,
  },
  {
    id: 'security',
    title: '8. Security',
    content: `We implement appropriate technical and organizational measures to protect your data, including encryption at rest and in transit, regular security audits, and SOC 2 Type II compliance. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.`,
  },
  {
    title: '9. Prohibited Uses',
    content: `You agree not to use the Service to: (a) violate any applicable law or regulation; (b) upload malicious code or attempt to breach security measures; (c) impersonate any person or entity; (d) use the Service for any purpose that is fraudulent or deceptive; (e) interfere with or disrupt the Service; (f) scrape, data mine, or extract data from the Service in an automated manner; or (g) use the Service to send unsolicited communications to investors or other users.`,
  },
  {
    title: '10. Intellectual Property',
    content: `The Service and its original content (excluding User Content), features, and functionality are owned by Frictionless Intelligence, Inc. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Our trademarks may not be used in connection with any product or service without our prior written consent.`,
  },
  {
    title: '11. Limitation of Liability',
    content: `In no event shall Frictionless Intelligence, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of the Service. Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the twelve months preceding the claim.`,
  },
  {
    title: '12. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service and updating the "Last Updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you should discontinue use of the Service.`,
  },
  {
    title: '13. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware.`,
  },
  {
    title: '14. Contact',
    content: `If you have any questions about these Terms, please contact us at legal@frictionless.ai or by mail at Frictionless Intelligence, Inc., 548 Market Street, Suite 36879, San Francisco, CA 94104.`,
  },
];

export default function TermsPage() {
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
            Terms of Service
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
              <p className="text-obsidian-400 font-body text-sm md:text-base leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
