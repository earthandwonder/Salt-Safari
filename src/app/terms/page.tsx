import type { Metadata } from "next";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using Salt Safari, including data attribution, user content, and limitation of liability.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-sand pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-deep tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-3 text-slate-500 text-sm">
              Last updated: 14 April 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="bg-white">
          <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-3xl">
            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-deep prose-headings:tracking-tight prose-a:text-coral prose-a:no-underline hover:prose-a:underline">
              <p className="text-slate-600 leading-relaxed">
                By accessing or using Salt Safari (&quot;the Service&quot;), you
                agree to be bound by these Terms of Service. If you do not
                agree, please do not use the Service.
              </p>

              <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                These terms are provided for informational purposes and should
                be reviewed by a qualified legal professional before relying on
                them.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                1. The Service
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Salt Safari is a platform that helps swimmers, snorkellers, and
                divers discover marine species at dive and snorkel locations
                across Australia. We provide species occurrence data, seasonal
                information, a species identification tool, and community
                sighting logs.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                2. Species Data — Informational Only
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Species occurrence data on Salt Safari is sourced from community
                science platforms and open-data aggregators including
                iNaturalist, Atlas of Living Australia (ALA), and OBIS.{" "}
                <strong>
                  This data is informational only and is not guaranteed to be
                  accurate, complete, or up-to-date.
                </strong>
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                You should not rely solely on Salt Safari data when making
                decisions about water safety, species identification (especially
                regarding dangerous species), or marine conservation. Always
                exercise caution and consult local authorities and expert
                resources.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                3. Data Attribution
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Species data is aggregated from the following sources, each with
                their own data licensing terms:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>iNaturalist</strong> — community science observations
                  (CC BY-NC)
                </li>
                <li>
                  <strong>Atlas of Living Australia</strong> — aggregated
                  biodiversity data from AIMS, CSIRO, and museum collections
                </li>
                <li>
                  <strong>OBIS</strong> — Ocean Biodiversity Information System
                </li>
                <li>
                  <strong>WoRMS</strong> — World Register of Marine Species
                  (taxonomy validation)
                </li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-2">
                All photos are sourced under appropriate Creative Commons or
                equivalent licenses. Attribution is provided on individual
                species pages and on our{" "}
                <Link href="/credits">Credits page</Link>.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                4. User Accounts
              </h2>
              <p className="text-slate-600 leading-relaxed">
                You are responsible for maintaining the security of your
                account. You must provide a valid email address and must not
                share your login credentials. We reserve the right to suspend
                accounts that violate these terms.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                5. User-Generated Content
              </h2>
              <p className="text-slate-600 leading-relaxed">
                When you submit sightings, log entries, or other content to Salt
                Safari, you retain ownership of that content. However, you grant
                Salt Safari a non-exclusive, worldwide, royalty-free license to
                use, display, and distribute your content as part of the
                Service.
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                You must not submit content that is illegal, defamatory,
                deliberately misleading, or that infringes on the intellectual
                property rights of others.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                6. Premium Features
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Some features (Species ID tool and species deep dives) require a
                one-off payment of A$9.99. Payments are processed by Stripe.
                Once purchased, premium access does not expire. Refunds may be
                provided at our discretion within 14 days of purchase.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                7. Prohibited Use
              </h2>
              <p className="text-slate-600 leading-relaxed">
                You must not:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  Use the Service for any unlawful purpose
                </li>
                <li>
                  Scrape or bulk-download data from the Service
                </li>
                <li>
                  Attempt to gain unauthorised access to our systems or other
                  users&apos; accounts
                </li>
                <li>
                  Submit false or misleading species sighting data
                </li>
                <li>
                  Interfere with the operation of the Service
                </li>
              </ul>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-slate-600 leading-relaxed">
                To the maximum extent permitted by Australian law, Salt Safari
                and its operators shall not be liable for any indirect,
                incidental, special, or consequential damages arising from your
                use of the Service. This includes, without limitation, damages
                arising from reliance on species identification data or
                occurrence information.
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                The Service is provided &quot;as is&quot; without warranties of
                any kind, express or implied.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                9. Intellectual Property
              </h2>
              <p className="text-slate-600 leading-relaxed">
                The Salt Safari name, logo, and original content (excluding
                user-generated content and third-party data) are the
                intellectual property of Salt Safari. You may not use our
                branding without written permission.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                10. Termination
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may suspend or terminate your access to the Service at any
                time for violation of these terms. You may delete your account
                at any time.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                11. Governing Law
              </h2>
              <p className="text-slate-600 leading-relaxed">
                These terms are governed by the laws of New South Wales,
                Australia. Any disputes will be subject to the jurisdiction of
                the courts of New South Wales.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                12. Changes to These Terms
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may update these terms from time to time. If we make material
                changes, we will notify users by email or via a notice on the
                site. Continued use of the Service after changes constitutes
                acceptance.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                13. Contact
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Questions about these terms? Contact us at{" "}
                <a href="mailto:hello@saltsafari.com.au">
                  hello@saltsafari.com.au
                </a>
                .
              </p>

              <div className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-400">
                See also:{" "}
                <Link href="/privacy" className="text-coral">
                  Privacy Policy
                </Link>{" "}
                &middot;{" "}
                <Link href="/dmca" className="text-coral">
                  DMCA & Takedown Policy
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
