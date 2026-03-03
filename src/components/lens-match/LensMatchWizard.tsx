"use client";

import { useState, useCallback, useEffect } from "react";
import { QuizQuestion, type QuizOption } from "./QuizQuestion";
import { QuizProgress } from "./QuizProgress";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { ResultsPage } from "./ResultsPage";
import { submitLensQuiz } from "@/lib/actions/lens-match";
import type { Recommendation } from "@/lib/utils/lens-packages";

// ─── Quiz definitions ────────────────────────────────────────────────────────

interface QuizStep {
  key: string;
  question: string;
  subtitle?: string;
  options: QuizOption[];
}

const QUESTIONS: QuizStep[] = [
  {
    key: "primaryUse",
    question: "What do you mainly use your glasses for?",
    subtitle: "Pick the one that best describes your day.",
    options: [
      { value: "ALL_DAY", label: "All-day wear", description: "Glasses stay on from morning to night" },
      { value: "WORK_SCREENS", label: "Work & screens", description: "Computer, phone, and office tasks" },
      { value: "DRIVING", label: "Driving", description: "Mainly for distance and driving" },
      { value: "READING", label: "Reading & close-up", description: "Books, menus, and detail work" },
      { value: "SPORTS", label: "Sports & outdoors", description: "Active lifestyle and outdoor activities" },
    ],
  },
  {
    key: "wearTime",
    question: "How many hours a day do you wear glasses?",
    options: [
      { value: "HEAVY", label: "7+ hours", description: "All day, every day" },
      { value: "MODERATE", label: "3–6 hours", description: "Part of the day" },
      { value: "LIGHT", label: "Under 3 hours", description: "Only when I need them" },
    ],
  },
  {
    key: "frustration",
    question: "What bothers you most about your current glasses?",
    subtitle: "Or what you want to avoid.",
    options: [
      { value: "NEVER_RIGHT", label: "They never feel right", description: "I've never been fully happy with my lenses" },
      { value: "HEADACHES", label: "Eye strain or headaches", description: "Especially after screen time" },
      { value: "BLURRY_EDGES", label: "Blurry edges", description: "Only clear in the center" },
      { value: "HEAVY_THICK", label: "Heavy or thick lenses", description: "They look and feel bulky" },
      { value: "NO_ISSUES", label: "No major complaints", description: "I just need a fresh pair" },
    ],
  },
  {
    key: "currentGlasses",
    question: "What type of glasses do you currently wear?",
    options: [
      { value: "YES_PROGRESSIVE", label: "Progressives / bifocals", description: "Lenses with multiple zones" },
      { value: "YES_SINGLE", label: "Single vision", description: "One prescription power across the lens" },
      { value: "NO_GLASSES", label: "No glasses yet", description: "First pair or haven't worn in years" },
    ],
  },
  {
    key: "sunglasses",
    question: "Are you interested in prescription sunglasses?",
    options: [
      { value: "YES_PRESCRIPTION", label: "Yes, a separate pair", description: "Full prescription sunglass lenses" },
      { value: "YES_CLIP", label: "Clip-on or magnetic", description: "Add-on sun protection for my frames" },
      { value: "NOT_NOW", label: "Not right now", description: "Maybe later" },
    ],
  },
  {
    key: "hasBenefits",
    question: "Do you have vision insurance or health benefits?",
    options: [
      { value: "YES", label: "Yes", description: "Through work, school, or private plan" },
      { value: "NOT_SURE", label: "Not sure", description: "I might — I'll check" },
      { value: "NO", label: "No benefits", description: "Paying out of pocket" },
    ],
  },
];

const TOTAL_QUESTIONS = QUESTIONS.length;

// ─── Wizard component ───────────────────────────────────────────────────────

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface LensMatchWizardProps {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  isPortalUser?: boolean;
  members?: Member[];
}

type WizardPhase = "welcome" | "quiz" | "lead" | "results";

export function LensMatchWizard({ utmSource, utmMedium, utmCampaign, isPortalUser, members }: LensMatchWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>("welcome");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ recommendation: Recommendation; quoteId: string; firstName: string } | null>(null);

  // Auto-advance after selection (300ms delay)
  const handleSelect = useCallback(
    (value: string) => {
      const key = QUESTIONS[questionIndex].key;
      setAnswers((prev) => ({ ...prev, [key]: value }));

      setTimeout(() => {
        if (questionIndex < TOTAL_QUESTIONS - 1) {
          setQuestionIndex((i) => i + 1);
        } else {
          setPhase("lead");
        }
      }, 300);
    },
    [questionIndex]
  );

  const handleBack = useCallback(() => {
    if (phase === "lead") {
      setPhase("quiz");
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else {
      setPhase("welcome");
    }
  }, [phase, questionIndex]);

  const handleLeadSubmit = useCallback(
    async (data: { firstName: string; phone: string; email: string; preferredTimeframe: string }) => {
      setIsPending(true);
      setError("");

      const payload = {
        answers,
        firstName: data.firstName,
        phone: data.phone,
        email: data.email,
        preferredTimeframe: data.preferredTimeframe,
        utmSource: utmSource || "",
        utmMedium: utmMedium || "",
        utmCampaign: utmCampaign || "",
      };

      const res = await submitLensQuiz(payload);

      if ("error" in res) {
        setError(res.error as string);
        setIsPending(false);
        return;
      }

      setResult({
        recommendation: res.recommendation as Recommendation,
        quoteId: res.quoteId as string,
        firstName: data.firstName,
      });
      setPhase("results");
      setIsPending(false);
    },
    [answers, utmSource, utmMedium, utmCampaign]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase === "quiz" && e.key === "Backspace") {
        handleBack();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleBack]);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Welcome screen */}
      {phase === "welcome" && (
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Find Your Perfect Lens Match
          </h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Answer 6 quick questions and get a personalized lens recommendation
            tailored to your lifestyle — takes under 60 seconds.
          </p>
          <button
            onClick={() => { setPhase("quiz"); setQuestionIndex(0); }}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Start Quiz
          </button>
          <p className="text-[11px] text-gray-400">
            Free. No account needed. Results sent to your email.
          </p>
        </div>
      )}

      {/* Quiz questions */}
      {phase === "quiz" && (
        <div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <QuizQuestion
            question={QUESTIONS[questionIndex].question}
            subtitle={QUESTIONS[questionIndex].subtitle}
            options={QUESTIONS[questionIndex].options}
            selected={answers[QUESTIONS[questionIndex].key] || null}
            onSelect={handleSelect}
          />
          <QuizProgress current={questionIndex} total={TOTAL_QUESTIONS} />
        </div>
      )}

      {/* Lead capture */}
      {phase === "lead" && (
        <div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <LeadCaptureForm onSubmit={handleLeadSubmit} isPending={isPending} />
          {error && (
            <p className="text-sm text-red-600 text-center mt-3">{error}</p>
          )}
        </div>
      )}

      {/* Results */}
      {phase === "results" && result && (
        <ResultsPage
          recommendation={result.recommendation}
          quoteId={result.quoteId}
          firstName={result.firstName}
          isLoggedIn={!!isPortalUser}
          members={members}
        />
      )}
    </div>
  );
}
