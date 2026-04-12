"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

/* ============================================================
   PLACEHOLDER DATA — replace with Supabase queries
   ============================================================ */

const LOCATIONS = [
  { id: "bare-island", name: "Bare Island", region: "Sydney" },
  { id: "shelly-beach", name: "Shelly Beach", region: "Sydney" },
  { id: "cabbage-tree-bay", name: "Cabbage Tree Bay Aquatic Reserve", region: "Sydney" },
  { id: "clovelly-beach", name: "Clovelly Beach", region: "Sydney" },
  { id: "magic-point", name: "Magic Point", region: "Sydney" },
  { id: "gordons-bay", name: "Gordon's Bay", region: "Sydney" },
  { id: "toowoon-bay", name: "Toowoon Bay Beach", region: "Central Coast" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SIZES = [
  {
    id: "tiny",
    label: "Tiny",
    desc: "Shrimp, nudibranch",
    scale: 0.5,
  },
  {
    id: "small",
    label: "Small",
    desc: "Hand-sized — blenny, seahorse",
    scale: 0.7,
  },
  {
    id: "medium",
    label: "Medium",
    desc: "Forearm — leatherjacket, cuttlefish",
    scale: 0.85,
  },
  {
    id: "large",
    label: "Large",
    desc: "Arm length — groper, octopus",
    scale: 1.0,
  },
  {
    id: "very_large",
    label: "Very large",
    desc: "Body+ — shark, dolphin, turtle",
    scale: 1.2,
  },
];

const COLOURS = [
  { id: "blue", label: "Blue", hex: "#2563EB" },
  { id: "green", label: "Green", hex: "#16A34A" },
  { id: "yellow", label: "Yellow", hex: "#EAB308" },
  { id: "orange", label: "Orange", hex: "#EA580C" },
  { id: "red", label: "Red", hex: "#DC2626" },
  { id: "brown", label: "Brown", hex: "#92400E" },
  { id: "black", label: "Black", hex: "#1C1917" },
  { id: "white", label: "White", hex: "#F8FAFC", border: true },
  { id: "grey", label: "Grey", hex: "#6B7280" },
  { id: "silver", label: "Silver", hex: "#CBD5E1", border: true },
  { id: "spotted", label: "Spotted", hex: "#A3A3A3", pattern: true },
  { id: "striped", label: "Striped", hex: "#737373", pattern: true },
];

const HABITATS = [
  { id: "reef", label: "On the reef", icon: "🪸" },
  { id: "sand", label: "On sand", icon: "🏖" },
  { id: "open_water", label: "Open water", icon: "🌊" },
  { id: "surface", label: "At the surface", icon: "☀️" },
  { id: "crevice", label: "In a crevice or cave", icon: "🕳" },
  { id: "seagrass", label: "In seagrass", icon: "🌿" },
  { id: "rocky_bottom", label: "Rocky bottom", icon: "🪨" },
  { id: "kelp", label: "In kelp", icon: "🌱" },
];

const MOCK_RESULTS = [
  {
    name: "Blue Groper",
    confidence: "Very likely",
    gradient: "from-blue-700 to-indigo-800",
  },
  {
    name: "Cuttlefish",
    confidence: "Likely",
    gradient: "from-amber-800 to-orange-900",
  },
  {
    name: "Wobbegong",
    confidence: "Possible",
    gradient: "from-yellow-800 to-stone-700",
  },
  {
    name: "Blue-ringed Octopus",
    confidence: "Possible",
    gradient: "from-sky-700 to-blue-900",
  },
];

/* ============================================================
   STEPS
   ============================================================ */

type StepId = "location" | "month" | "size" | "colours" | "habitat";

const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  {
    id: "location",
    title: "Where did you see it?",
    subtitle: "Pick the location or region",
  },
  {
    id: "month",
    title: "When?",
    subtitle: "Which month did you see it?",
  },
  {
    id: "size",
    title: "How big was it?",
    subtitle: "Rough body size, not including tail",
  },
  {
    id: "colours",
    title: "What colours did you see?",
    subtitle: "Select up to 3 main colours",
  },
  {
    id: "habitat",
    title: "Where was it?",
    subtitle: "What kind of environment?",
  },
];

/* ============================================================
   WIZARD
   ============================================================ */

export default function SpeciesIdPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<{
    location: string | null;
    month: number | null;
    size: string | null;
    colours: string[];
    habitat: string | null;
  }>({
    location: null,
    month: new Date().getMonth(), // Pre-select current month
    size: null,
    colours: [],
    habitat: null,
  });

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canAdvance = () => {
    switch (step.id) {
      case "location":
        return answers.location !== null;
      case "month":
        return answers.month !== null;
      case "size":
        return answers.size !== null;
      case "colours":
        return answers.colours.length > 0;
      case "habitat":
        return answers.habitat !== null;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setShowResults(false);
    setAnswers({
      location: null,
      month: new Date().getMonth(),
      size: null,
      colours: [],
      habitat: null,
    });
  };

  const toggleColour = (colourId: string) => {
    setAnswers((prev) => ({
      ...prev,
      colours: prev.colours.includes(colourId)
        ? prev.colours.filter((c) => c !== colourId)
        : prev.colours.length < 3
          ? [...prev.colours, colourId]
          : prev.colours,
    }));
  };

  /* ──────────────────────────────────────────
     RENDER
     ────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      {/* Dark top bar with progress */}
      <div className="bg-deep pt-20 pb-8 px-6">
        <div className="max-w-2xl mx-auto">
          {!showResults ? (
            <>
              <p className="text-teal-400 text-sm font-medium tracking-wider uppercase mb-1">
                Step {currentStep + 1} of {STEPS.length}
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-white mb-1">
                {step.title}
              </h1>
              <p className="text-white/50 text-sm">{step.subtitle}</p>

              {/* Progress bar */}
              <div className="flex gap-1.5 mt-5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i <= currentStep ? "bg-teal-400 w-full" : "w-0"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-teal-400 text-sm font-medium tracking-wider uppercase mb-1">
                Results
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-white">
                We found some matches
              </h1>
            </>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {!showResults ? (
          <div className="animate-fade-up">
            {/* STEP: Location */}
            {step.id === "location" && (
              <div className="space-y-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() =>
                      setAnswers({ ...answers, location: loc.id })
                    }
                    className={`step-option w-full text-left ${
                      answers.location === loc.id ? "selected" : ""
                    }`}
                  >
                    <p className="font-medium text-slate-800">{loc.name}</p>
                    <p className="text-sm text-slate-400">{loc.region}</p>
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Month */}
            {step.id === "month" && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {MONTHS.map((month, i) => (
                  <button
                    key={month}
                    onClick={() => setAnswers({ ...answers, month: i })}
                    className={`step-option text-center ${
                      answers.month === i ? "selected" : ""
                    }`}
                  >
                    <p className="font-medium text-slate-700">{month}</p>
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Size */}
            {step.id === "size" && (
              <div className="space-y-3">
                {SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() =>
                      setAnswers({ ...answers, size: size.id })
                    }
                    className={`step-option w-full text-left flex items-center justify-between ${
                      answers.size === size.id ? "selected" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{size.label}</p>
                      <p className="text-sm text-slate-400">{size.desc}</p>
                    </div>
                    {/* Scaled fish silhouette */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-slate-300"
                      style={{
                        width: `${size.scale * 40}px`,
                        height: `${size.scale * 40}px`,
                      }}
                    >
                      <ellipse cx="10" cy="12" rx="8" ry="5" />
                      <polygon points="18,12 24,7 24,17" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* STEP: Colours */}
            {step.id === "colours" && (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  {answers.colours.length}/3 selected
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {COLOURS.map((colour) => (
                    <button
                      key={colour.id}
                      onClick={() => toggleColour(colour.id)}
                      className={`step-option-multi flex flex-col items-center gap-2 ${
                        answers.colours.includes(colour.id) ? "selected" : ""
                      }`}
                    >
                      {colour.pattern ? (
                        <div
                          className="w-8 h-8 rounded-full border border-slate-200"
                          style={{
                            background:
                              colour.id === "spotted"
                                ? "radial-gradient(circle 3px, #555 30%, #ccc 31%)"
                                : `repeating-linear-gradient(45deg, #555, #555 2px, #ccc 2px, #ccc 4px)`,
                          }}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full ${
                            colour.border ? "border-2 border-slate-200" : ""
                          }`}
                          style={{ backgroundColor: colour.hex }}
                        />
                      )}
                      <span className="text-xs text-slate-600 font-medium">
                        {colour.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP: Habitat */}
            {step.id === "habitat" && (
              <div className="grid grid-cols-2 gap-3">
                {HABITATS.map((hab) => (
                  <button
                    key={hab.id}
                    onClick={() =>
                      setAnswers({ ...answers, habitat: hab.id })
                    }
                    className={`step-option text-center ${
                      answers.habitat === hab.id ? "selected" : ""
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{hab.icon}</span>
                    <p className="font-medium text-sm text-slate-700">
                      {hab.label}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10">
              <button
                onClick={handleBack}
                className={`text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors ${
                  currentStep === 0 ? "invisible" : ""
                }`}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className={`px-8 py-3 rounded-full font-medium transition-all ${
                  canAdvance()
                    ? "bg-teal-500 hover:bg-teal-600 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {currentStep === STEPS.length - 1 ? "Show Results" : "Next"}
              </button>
            </div>

            {/* Skip link */}
            {step.id !== "location" && (
              <div className="text-center mt-4">
                <button
                  onClick={handleNext}
                  className="text-sm text-slate-400 hover:text-slate-500 transition-colors"
                >
                  Skip this step
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ──────────────────────────────────────
             RESULTS
             ────────────────────────────────────── */
          <div className="animate-fade-up">
            <div className="space-y-4 mb-10">
              {MOCK_RESULTS.map((result, i) => (
                <Link
                  key={result.name}
                  href={`/species/${result.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="card-lift block bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Species photo placeholder */}
                    <div
                      className={`w-20 h-20 rounded-xl bg-gradient-to-br ${result.gradient} flex-shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-semibold text-deep">
                        {result.name}
                      </h3>
                      <p
                        className={`text-sm font-medium mt-0.5 ${
                          i === 0
                            ? "text-emerald-600"
                            : i === 1
                              ? "text-teal-600"
                              : "text-slate-400"
                        }`}
                      >
                        {result.confidence}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-300 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* Premium upsell */}
            <div className="bg-deep/5 rounded-2xl p-5 text-center mb-8">
              <p className="font-display text-lg font-semibold text-deep mb-1">
                Want the full story?
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Unlock deep dives into every species — behaviour, fun facts, and
                identification tips.
              </p>
              <Link
                href="/premium"
                className="inline-block bg-coral hover:bg-coral-dark text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleReset}
                className="text-teal-600 hover:text-teal-700 font-medium text-sm transition-colors"
              >
                Start over
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleBack}
                className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
              >
                Adjust last answer
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
