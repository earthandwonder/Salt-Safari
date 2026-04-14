import type { Metadata } from "next";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Salt Safari collects, uses, and protects your personal information. Compliant with the Australian Privacy Act 1988.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-sand pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-deep tracking-tight">
              Privacy Policy
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
                Salt Safari (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
                committed to protecting your privacy. This policy explains what
                personal information we collect and how we use it. Salt Safari
                is operated from Australia and complies with the Australian
                Privacy Act 1988 (Cth) and the Australian Privacy Principles
                (APPs).
              </p>

              <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                This policy is provided for informational purposes and should be
                reviewed by a qualified legal professional before relying on it.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                1. Information We Collect
              </h2>
              <h3 className="text-lg font-semibold mt-6 mb-2">
                Account information
              </h3>
              <p className="text-slate-600 leading-relaxed">
                When you create an account, we collect your email address. We
                use Supabase Auth to manage authentication — your password is
                hashed and stored securely by Supabase, not by us directly.
              </p>
              <h3 className="text-lg font-semibold mt-6 mb-2">
                Sightings and activity
              </h3>
              <p className="text-slate-600 leading-relaxed">
                If you log species sightings, we store the species, location,
                date, and any notes you provide. This data is associated with
                your account.
              </p>
              <h3 className="text-lg font-semibold mt-6 mb-2">
                Usage analytics
              </h3>
              <p className="text-slate-600 leading-relaxed">
                We use Google Analytics to understand how visitors use the site.
                This collects anonymous usage data such as pages visited, time
                on site, and referral source. Google Analytics uses cookies — see
                Section 5 below.
              </p>
              <h3 className="text-lg font-semibold mt-6 mb-2">
                Payment information
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Payments are processed by Stripe. We do not store your credit
                card details. Stripe&apos;s privacy policy applies to payment
                data.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>To provide and maintain the Salt Safari service</li>
                <li>To manage your account and authenticate your identity</li>
                <li>To process purchases and unlock premium features</li>
                <li>To send species alerts you have subscribed to</li>
                <li>To improve the site based on usage patterns</li>
                <li>To respond to support requests</li>
              </ul>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                3. Data Sharing
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We do <strong>not</strong> sell your personal information. We
                share data only with the following service providers, who act as
                data processors on our behalf:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>Supabase</strong> — database hosting and
                  authentication
                </li>
                <li>
                  <strong>Vercel</strong> — website hosting
                </li>
                <li>
                  <strong>Stripe</strong> — payment processing
                </li>
                <li>
                  <strong>Google Analytics</strong> — usage analytics
                </li>
                <li>
                  <strong>Resend</strong> — transactional emails
                </li>
                <li>
                  <strong>Cloudflare</strong> — image storage (R2)
                </li>
              </ul>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                4. Data Retention
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your account data for as long as your account is
                active. If you delete your account, we will remove your personal
                information within 30 days. Anonymised, aggregated analytics
                data may be retained indefinitely.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                5. Cookies
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Salt Safari uses the following types of cookies:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>Essential cookies</strong> — required for
                  authentication and session management. These cannot be
                  disabled.
                </li>
                <li>
                  <strong>Analytics cookies</strong> — used by Google Analytics
                  to collect anonymous usage data. You can decline these via the
                  cookie consent banner.
                </li>
              </ul>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                6. Your Rights
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Under the Australian Privacy Act, you have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account and associated data</li>
                <li>
                  Complain to the Office of the Australian Information
                  Commissioner (OAIC) if you believe your privacy has been
                  breached
                </li>
              </ul>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                7. Data Security
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We use industry-standard security measures including encrypted
                connections (HTTPS), hashed passwords, and row-level security
                policies on our database. However, no method of transmission
                over the internet is 100% secure.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                8. Third-Party Links
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Salt Safari links to external sites (iNaturalist, Atlas of
                Living Australia, etc.) for data attribution. We are not
                responsible for the privacy practices of these sites.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this policy from time to time. Material changes
                will be communicated via email or a notice on the site.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                10. Contact Us
              </h2>
              <p className="text-slate-600 leading-relaxed">
                If you have questions about this privacy policy or wish to
                exercise your rights, contact us at{" "}
                <a href="mailto:hello@saltsafari.com.au">
                  hello@saltsafari.com.au
                </a>
                .
              </p>

              <div className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-400">
                See also:{" "}
                <Link href="/terms" className="text-coral">
                  Terms of Service
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
