"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ_ROUNDS, type StyleChoice, type StyleProfile } from "@/lib/utils/style-quiz";
import { submitStyleQuiz } from "@/lib/actions/client-style";
import { StyleRoundCard } from "./StyleRoundCard";
import { StyleQuizProgress } from "./StyleQuizProgress";
import { StyleProfileView } from "./StyleProfileView";
import { ArrowLeft } from "lucide-react";

interface StyleQuizClientProps {
  customerId: string;
  existingProfile: StyleProfile | null;
}

export function StyleQuizClient({ customerId, existingProfile }: StyleQuizClientProps) {
  const router = useRouter();
  const [showQuiz, setShowQuiz] = useState(!existingProfile);
  const [currentRound, setCurrentRound] = useState(0);
  const [choices, setChoices] = useState<Partial<StyleChoice>>({});
  const [profile, setProfile] = useState<StyleProfile | null>(existingProfile);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const round = QUIZ_ROUNDS[currentRound];

  function handleChoice(value: string) {
    if (!round) return;
    const updated = { ...choices, [round.dimension]: value };
    setChoices(updated);

    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentRound < QUIZ_ROUNDS.length - 1) {
        setCurrentRound((prev) => prev + 1);
      } else {
        handleSubmit(updated as StyleChoice);
      }
    }, 300);
  }

  async function handleSubmit(finalChoices: StyleChoice) {
    setSubmitting(true);
    setError(null);

    const result = await submitStyleQuiz(customerId, finalChoices);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (result.profile) {
      setProfile(result.profile);
      setShowQuiz(false);
    }
    setSubmitting(false);
  }

  function handleRetake() {
    setShowQuiz(true);
    setCurrentRound(0);
    setChoices({});
    setProfile(null);
    setError(null);
  }

  function handleBack() {
    if (currentRound > 0) {
      setCurrentRound((prev) => prev - 1);
    }
  }

  // Show profile view
  if (!showQuiz && profile) {
    return (
      <StyleProfileView
        profile={profile}
        customerId={customerId}
        onRetake={handleRetake}
      />
    );
  }

  // Show quiz
  if (!round) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">Style ID</h2>
        <p className="text-sm text-gray-500 mt-1">
          Round {currentRound + 1} of {QUIZ_ROUNDS.length}
        </p>
      </div>

      <StyleQuizProgress currentRound={currentRound} totalRounds={QUIZ_ROUNDS.length} />

      {/* Question */}
      <p className="text-center text-base font-medium text-gray-800">{round.question}</p>

      {/* Option cards */}
      <div className="flex gap-3">
        <StyleRoundCard
          label={round.optionA.label}
          description={round.optionA.description}
          image={round.optionA.image}
          selected={choices[round.dimension] === round.optionA.value}
          onClick={() => handleChoice(round.optionA.value)}
        />
        <StyleRoundCard
          label={round.optionB.label}
          description={round.optionB.description}
          image={round.optionB.image}
          selected={choices[round.dimension] === round.optionB.value}
          onClick={() => handleChoice(round.optionB.value)}
        />
      </div>

      {/* Back button */}
      {currentRound > 0 && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      )}

      {submitting && (
        <p className="text-center text-sm text-gray-500 animate-pulse">Finding your style...</p>
      )}

      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
