"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";

interface AlertSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesId: string;
  speciesName: string;
  locationId: string;
  locationName: string;
  /** Called after successful subscription */
  onSubscribed?: (alertId: string) => void;
}

export function AlertSubscribeModal({
  isOpen,
  onClose,
  speciesId,
  speciesName,
  locationId,
  locationName,
  onSubscribed,
}: AlertSubscribeModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubscribe = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId, locationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      const data = await res.json();
      setStatus("success");
      onSubscribed?.(data.alert.id);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset after animation
        setTimeout(() => setStatus("idle"), 300);
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [speciesId, locationId, onClose, onSubscribed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <h2 className="font-display text-lg font-semibold text-deep">
                    Get season alerts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-6">
                {status === "success" ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
                      <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <motion.polyline
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          points="20 6 9 17 4 12"
                        />
                      </motion.svg>
                    </div>
                    <p className="text-sm font-semibold text-deep">Alert set!</p>
                    <p className="text-xs text-slate-500 mt-1">
                      We&apos;ll email you when {speciesName} comes into season.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We&apos;ll send you an email when{" "}
                      <span className="font-semibold text-deep">{speciesName}</span>{" "}
                      comes into season at{" "}
                      <span className="font-semibold text-deep">{locationName}</span>.
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Based on historical observation data. You&apos;ll only be notified when
                      the species transitions into season, not every month.
                    </p>

                    {status === "error" && (
                      <p className="text-xs text-red-600 mt-3 bg-red-50 rounded-lg px-3 py-2">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      onClick={handleSubscribe}
                      disabled={status === "loading"}
                      className="w-full mt-5 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {status === "loading" ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                          Notify me
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
