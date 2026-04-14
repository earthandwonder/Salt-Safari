import type { Metadata } from "next";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DMCA & Takedown Policy",
  description:
    "How to request removal of copyrighted content from Salt Safari. We respond to all valid takedown requests within 48 hours.",
};

export default function DmcaPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-sand pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-deep tracking-tight">
              DMCA & Takedown Policy
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
                Salt Safari respects the intellectual property rights of
                photographers, artists, and content creators. All photos on Salt
                Safari are sourced under appropriate Creative Commons or public
                domain licenses, with full attribution provided.
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                If you believe that content on Salt Safari infringes your
                copyright, please follow the process below. We are committed to
                responding to all valid takedown requests within{" "}
                <strong>48 hours</strong>.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                How to Submit a Takedown Request
              </h2>
              <p className="text-slate-600 leading-relaxed">
                To request removal of content, send an email to{" "}
                <a href="mailto:hello@saltsafari.com.au">
                  hello@saltsafari.com.au
                </a>{" "}
                with the subject line &quot;Takedown Request&quot; and include
                the following information:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600 mt-4">
                <li>
                  <strong>Your name and contact information</strong> — so we can
                  reach you if we have questions.
                </li>
                <li>
                  <strong>
                    The URL(s) of the content you want removed
                  </strong>{" "}
                  — direct links to the page(s) where the content appears on
                  Salt Safari.
                </li>
                <li>
                  <strong>
                    A description of the copyrighted work
                  </strong>{" "}
                  — identify the original work and provide a link to the
                  original if possible.
                </li>
                <li>
                  <strong>
                    Why you believe the use is infringing
                  </strong>{" "}
                  — e.g., the license terms were changed, the attribution is
                  incorrect, or the content was uploaded to the source platform
                  without your permission.
                </li>
                <li>
                  <strong>A statement of good faith</strong> — confirm that you
                  are the copyright holder or authorised to act on their behalf,
                  and that the information in your request is accurate.
                </li>
              </ol>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                What Happens Next
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>
                  We will acknowledge your request within{" "}
                  <strong>48 hours</strong>.
                </li>
                <li>
                  We will review the content and its licensing. If the takedown
                  is valid, we will remove the content promptly.
                </li>
                <li>
                  If the content is sourced from a third-party platform (e.g.,
                  Wikimedia Commons, Flickr), we will also notify them of the
                  licensing issue.
                </li>
                <li>
                  We will confirm removal to you by email.
                </li>
              </ol>

              <h2 className="text-xl font-semibold mt-10 mb-4">
                Our Commitment
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Salt Safari self-hosts all photos (we never hotlink) and
                maintains a full license audit trail for every image. We take
                copyright seriously and aim to resolve all disputes quickly and
                fairly.
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                If you notice incorrect attribution (wrong photographer name,
                wrong license type) but don&apos;t need the image removed,
                please still let us know — we want to get it right.
              </p>

              <h2 className="text-xl font-semibold mt-10 mb-4">Contact</h2>
              <p className="text-slate-600 leading-relaxed">
                For all copyright and takedown enquiries:{" "}
                <a href="mailto:hello@saltsafari.com.au">
                  hello@saltsafari.com.au
                </a>
              </p>

              <div className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-400">
                See also:{" "}
                <Link href="/privacy" className="text-coral">
                  Privacy Policy
                </Link>{" "}
                &middot;{" "}
                <Link href="/terms" className="text-coral">
                  Terms of Service
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
