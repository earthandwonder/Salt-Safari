import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-deep text-white/80">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-teal-400"
              >
                <path
                  d="M2 20C6 16 10 24 16 20C22 16 26 24 30 20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M2 14C6 10 10 18 16 14C22 10 26 18 30 14"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
              <span className="font-display text-lg font-semibold text-white group-hover:text-teal-300 transition-colors">
                Salt Safari
              </span>
            </Link>
            <p className="mt-3 text-sm text-white/50 leading-relaxed">
              Discover what lives beneath the surface at Australia&apos;s best dive and snorkel sites.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/locations" className="text-sm hover:text-teal-300 transition-colors">
                  Locations
                </Link>
              </li>
              <li>
                <Link href="/species" className="text-sm hover:text-teal-300 transition-colors">
                  Species
                </Link>
              </li>
              <li>
                <Link href="/id" className="text-sm hover:text-teal-300 transition-colors">
                  Species ID Tool
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Account
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="text-sm hover:text-teal-300 transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm hover:text-teal-300 transition-colors">
                  Create account
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm hover:text-teal-300 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-teal-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Data attribution + copyright */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-xs text-white/40 leading-relaxed">
            Species data sourced from{" "}
            <a
              href="https://www.inaturalist.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-teal-300 transition-colors"
            >
              iNaturalist
            </a>
            ,{" "}
            <a
              href="https://www.ala.org.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-teal-300 transition-colors"
            >
              Atlas of Living Australia
            </a>
            , and{" "}
            <a
              href="https://obis.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-teal-300 transition-colors"
            >
              OBIS
            </a>
            . Taxonomy verified by{" "}
            <a
              href="https://www.marinespecies.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-teal-300 transition-colors"
            >
              WoRMS
            </a>
            .
          </p>
          <p className="mt-2 text-xs text-white/30">
            &copy; {new Date().getFullYear()} Salt Safari. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
