import { getStyleTraits, type StyleProfile } from "@/lib/utils/style-quiz";
import { MatchedFrameGrid } from "./MatchedFrameGrid";
import { Sparkles, RefreshCw } from "lucide-react";

interface StyleProfileViewProps {
  profile: StyleProfile;
  customerId: string;
  onRetake?: () => void;
}

export function StyleProfileView({ profile, customerId, onRetake }: StyleProfileViewProps) {
  const traits = getStyleTraits(profile.choices);

  return (
    <div className="space-y-4">
      {/* Style label card */}
      <div className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-xl border border-primary/10 p-5 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{profile.label}</h2>
        <p className="text-sm text-gray-500 mt-1">Your eyewear personality</p>
      </div>

      {/* Style traits */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Style DNA</h3>
        <div className="flex flex-wrap gap-2">
          {traits.map((trait) => (
            <span
              key={trait}
              className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Matched frames */}
      <MatchedFrameGrid customerId={customerId} />

      {/* Retake quiz */}
      {onRetake && (
        <button
          onClick={onRetake}
          className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retake quiz
        </button>
      )}
    </div>
  );
}
