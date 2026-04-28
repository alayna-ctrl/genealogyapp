type Props = {
  currentStep: number;
  totalSteps?: number;
  isFastTrack: boolean;
};

export function StepProgressBar({ currentStep, totalSteps = 7, isFastTrack }: Props) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const completed = step < currentStep;
        const current = step === currentStep;
        const fastTrackOptional = isFastTrack && step >= 5;

        return (
          <div
            key={step}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
              completed
                ? "border-[#1F3864] bg-[#1F3864] text-white"
                : current
                  ? "border-[#2F75B6] bg-[#2F75B6] text-white"
                  : fastTrackOptional
                    ? "border-slate-300 bg-slate-100 text-slate-500"
                    : "border-slate-300 bg-white text-slate-600"
            }`}
            title={`Step ${step}`}
          >
            {completed ? "✓" : fastTrackOptional ? "⚡" : step}
          </div>
        );
      })}
    </div>
  );
}
