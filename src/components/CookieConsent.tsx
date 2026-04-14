"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "salt-safari-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-lg mx-auto bg-deep text-white rounded-xl shadow-2xl border border-white/10 p-5">
        <p className="text-sm leading-relaxed text-white/80">
          Salt Safari uses essential cookies for authentication and optional
          analytics cookies (Google Analytics) to improve the site.{" "}
          <Link
            href="/privacy#cookies"
            className="text-teal-300 hover:text-teal-200 underline underline-offset-2"
          >
            Learn more
          </Link>
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-coral-dark transition-colors"
          >
            Accept all
          </button>
          <button
            onClick={handleDecline}
            className="px-4 py-2 bg-white/10 text-white/80 text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
