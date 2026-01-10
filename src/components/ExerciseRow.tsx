import type {
  SetEntry,
  NextExercisePrediction,
  Difficulty,
  HistoryEntry,
} from "../lib/state";
import { getLastSet, calculateE1rmMetrics } from "../lib/state";
import { useState, useEffect, useMemo } from "react";
import { useImageRotation } from "../hooks/useImageRotation";
import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { formatTime } from "../lib/utils";
import {
  SetsDisplay,
  PredictionDisplay,
  SetInputs,
  DifficultyButtons,
  ExerciseImage,
  E1rmDisplay,
} from "./shared";

interface Exercise {
  exerciseId: string;
  name: string;
  targetMuscles?: string[];
  equipment?: string | null;
  imageUrls?: string[];
  instructions?: string[];
  level?: string;
  force?: string | null;
  mechanic?: string | null;
  category?: string;
}

interface ExerciseRowProps {
  exercise: Exercise | null;
  exerciseId: string;
  todaySets: SetEntry[];
  isSelected: boolean;
  isNextExercise: boolean;
  prediction: NextExercisePrediction | null;
  restTime: number;
  history: HistoryEntry[];
  onClick: () => void;
  onRemove?: () => void;
  onAddToPlan?: () => void;
  onLogSet: (
    kg: number,
    reps: number,
    difficulty?: Difficulty,
    duration?: number,
  ) => void;
  onSetRestTime: (seconds: number) => void;
  onStartSet?: () => void;
}

export function ExerciseRow({
  exercise,
  exerciseId,
  todaySets,
  isSelected,
  isNextExercise,
  prediction,
  restTime,
  history,
  onClick,
  onRemove,
  onAddToPlan,
  onLogSet,
  onSetRestTime,
  onStartSet,
}: ExerciseRowProps) {
  // Use predicted values when available
  const defaultKg = prediction?.kg;
  const defaultReps = prediction?.reps;

  // Form state
  const [kg, setKg] = useState(defaultKg?.toString() ?? "");
  const [reps, setReps] = useState(defaultReps?.toString() ?? "");
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  // Use extracted hooks for timer and image rotation
  const imageUrls = exercise?.imageUrls ?? [];
  const imageIndex = useImageRotation(imageUrls);
  const elapsed = useElapsedTimer(setStartedAt);

  // Derived: highlight if current value matches predicted
  const isKgPredicted = prediction !== null && kg === String(prediction.kg);
  const isRepsPredicted = prediction !== null && reps === String(prediction.reps);

  // Get last set's duration for this exercise
  const lastSetDuration = useMemo(() => {
    const lastSet = getLastSet(history, exerciseId);
    return lastSet?.duration;
  }, [history, exerciseId]);

  // Calculate e1RM metrics for this exercise
  const e1rmMetrics = useMemo(() => {
    return calculateE1rmMetrics(history, exerciseId);
  }, [history, exerciseId]);

  // Reset form when exercise changes
  useEffect(() => {
    setSetStartedAt(null);
    setShowFullImage(false);
  }, [exerciseId]);

  // Update kg/reps when prediction values change
  useEffect(() => {
    setKg(prediction?.kg?.toString() ?? "");
    setReps(prediction?.reps?.toString() ?? "");
  }, [prediction?.kg, prediction?.reps]);

  const handleStart = () => {
    setSetStartedAt(Date.now());
    onStartSet?.();
  };

  const handleFinish = (difficulty?: Difficulty) => {
    const kgNum = parseFloat(kg);
    const repsNum = parseInt(reps);
    if (!isNaN(kgNum) && !isNaN(repsNum) && repsNum > 0) {
      const duration = setStartedAt
        ? Math.floor((Date.now() - setStartedAt) / 1000)
        : undefined;
      onLogSet(kgNum, repsNum, difficulty, duration);
      setSetStartedAt(null);
    }
  };

  const name = exercise?.name ?? exerciseId;
  const meta = [exercise?.targetMuscles?.[0], exercise?.equipment]
    .filter(Boolean)
    .join(" · ");

  const isActive = setStartedAt !== null;
  const hasParams = prediction !== null;

  const handleQuickStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSetStartedAt(Date.now());
    onStartSet?.();
    onClick();
  };

  const handleQuickFinish = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFinish();
  };

  // Collapsed view
  if (!isSelected) {
    return (
      <div className={`rounded-lg ${isNextExercise ? "bg-blue-500/5" : ""}`}>
        <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={onClick}>
          {isNextExercise && <span className="text-lg text-blue-500">→</span>}

          <ExerciseImage imageUrls={imageUrls} imageIndex={imageIndex} name={name} size="sm" />

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{name}</div>
            {meta && <div className="text-sm text-[var(--text-muted)] truncate">{meta}</div>}
          </div>

          <div className="text-right shrink-0">
            {hasParams ? (
              <div className="text-sm text-[var(--text-muted)]">
                {prediction.kg}kg × {prediction.reps}
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)]">New</div>
            )}
            <div className="text-xs text-[var(--text-muted)]">{restTime}s rest</div>
            <SetsDisplay sets={todaySets} />
            {e1rmMetrics.current && (
              <div className="text-xs text-blue-400">e1RM {e1rmMetrics.current}kg</div>
            )}
          </div>

          {isActive ? (
            <button
              onClick={handleQuickFinish}
              className="p-2 bg-[var(--success)] text-white rounded-lg shrink-0"
              aria-label="Finish set"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          ) : hasParams ? (
            <button
              onClick={handleQuickStart}
              className="p-2 bg-[var(--text)] text-[var(--bg)] rounded-lg shrink-0"
              aria-label="Start set"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          ) : null}

          {onAddToPlan && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlan(); }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--success)]"
              aria-label="Add to plan"
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded view - ACTIVE (compact UI with timer)
  if (isActive) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-4 space-y-4">
        <div className="flex gap-4 cursor-pointer" onClick={onClick}>
          <ExerciseImage imageUrls={imageUrls} imageIndex={imageIndex} name={name} size="lg" />

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold">{formatTime(elapsed)}</span>
              {lastSetDuration !== undefined && (
                <span className="text-lg text-[var(--text-muted)] font-mono">
                  / {formatTime(lastSetDuration)}
                </span>
              )}
            </div>
            <div className="text-sm text-[var(--text-muted)] mt-1">{name}</div>
            {prediction && (
              <div className="text-sm text-blue-400 mt-1">
                <PredictionDisplay prediction={prediction} />
              </div>
            )}
          </div>
        </div>

        <SetInputs
          kg={kg}
          reps={reps}
          restTime={restTime}
          isKgPredicted={isKgPredicted}
          isRepsPredicted={isRepsPredicted}
          onKgChange={setKg}
          onRepsChange={setReps}
          onRestTimeChange={onSetRestTime}
        />

        <DifficultyButtons onFinish={handleFinish} />
      </div>
    );
  }

  // Expanded view - NOT ACTIVE (full UI)
  return (
    <div className="bg-[var(--surface)] rounded-lg p-4 space-y-4">
      {showFullImage && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowFullImage(false)}
        >
          <img src={imageUrls[imageIndex]} alt={name} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div className="flex gap-4 cursor-pointer" onClick={onClick}>
        <ExerciseImage
          imageUrls={imageUrls}
          imageIndex={imageIndex}
          name={name}
          size="md"
          onImageClick={() => setShowFullImage(true)}
        />

        <div className="flex-1 min-w-0">
          <div className="font-medium text-lg">{name}</div>
          {meta && <div className="text-sm text-[var(--text-muted)]">{meta}</div>}
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            {todaySets.length > 0 ? (
              <span>Set #{todaySets.length + 1}</span>
            ) : prediction ? (
              <span>Suggested: {prediction.kg}kg × {prediction.reps}</span>
            ) : (
              <span>First set</span>
            )}
          </div>
          <SetsDisplay sets={todaySets} />
        </div>

        <div className="flex self-start">
          {onAddToPlan && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlan(); }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--success)]"
              aria-label="Add to plan"
            >
              +
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-2 text-[var(--text-muted)] hover:text-red-500"
              aria-label="Remove exercise"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {exercise?.instructions && exercise.instructions.length > 0 && (
        <details className="bg-[var(--bg)] rounded-lg">
          <summary className="px-3 py-2 text-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)]">
            How to perform ({exercise.instructions.length} steps)
          </summary>
          <ol className="px-3 pb-3 space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <span className="text-[var(--text-muted)]">{step}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {e1rmMetrics.current && (
        <details className="bg-[var(--bg)] rounded-lg group">
          <summary className="px-3 py-2 text-sm cursor-pointer hover:text-[var(--text)] flex items-center justify-between list-none">
            <span className="flex items-center gap-2 text-[var(--text-muted)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-open:rotate-90"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Strength metrics
            </span>
            <span className="font-medium">{e1rmMetrics.current}kg e1RM</span>
          </summary>
          <div className="px-3 pb-3">
            <E1rmDisplay
              metrics={e1rmMetrics}
              onSelectWeight={(selectedKg, selectedReps) => {
                setKg(selectedKg.toString());
                setReps(selectedReps.toString());
              }}
            />
          </div>
        </details>
      )}

      {prediction && (isKgPredicted || isRepsPredicted) && (
        <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
          <PredictionDisplay prediction={prediction} />
        </div>
      )}

      <SetInputs
        kg={kg}
        reps={reps}
        restTime={restTime}
        isKgPredicted={isKgPredicted}
        isRepsPredicted={isRepsPredicted}
        onKgChange={setKg}
        onRepsChange={setReps}
        onRestTimeChange={onSetRestTime}
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleStart(); }}
        className="w-full py-3 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Set {todaySets.length > 0 && `#${todaySets.length + 1}`}
      </button>
    </div>
  );
}
