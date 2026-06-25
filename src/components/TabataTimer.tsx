"use client";

import { playCountdownTick, playPhaseSound, unlockSounds } from "@/lib/sounds";
import {
  DEFAULT_TABATA_CONFIG,
  encodeTabataConfig,
  getExerciseName,
  getTabataConfigPath,
  getTotalWorkoutSeconds,
  getWorkoutTitle,
  isDefaultTabataConfig,
  resizeExerciseNames,
  type TabataConfig,
} from "@/lib/tabata-config-url";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

type Phase = "idle" | "prepare" | "work" | "rest" | "complete";

type Config = TabataConfig;

type TimerState = {
  phase: Phase;
  currentSet: number;
  currentExercise: number;
  timeLeft: number;
  isRunning: boolean;
};

type TimerAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "tick" }
  | { type: "sync_config" };

const DEFAULT_CONFIG = DEFAULT_TABATA_CONFIG;

function mergeConfig(initialConfig?: Partial<Config>): Config {
  const merged = { ...DEFAULT_CONFIG, ...initialConfig };
  return {
    ...merged,
    exerciseNames: resizeExerciseNames(
      merged.exerciseNames ?? [],
      merged.exercises,
    ),
  };
}

function getIdleTimeLeft(config: Config) {
  return config.prepareSeconds > 0 ? config.prepareSeconds : config.workSeconds;
}

function createInitialState(config: Config): TimerState {
  return {
    phase: "idle",
    currentSet: 1,
    currentExercise: 1,
    timeLeft: getIdleTimeLeft(config),
    isRunning: false,
  };
}

function timerReducer(
  state: TimerState,
  action: TimerAction,
  config: Config,
): TimerState {
  switch (action.type) {
    case "start":
      if (config.prepareSeconds <= 0) {
        return {
          phase: "work",
          currentSet: 1,
          currentExercise: 1,
          timeLeft: config.workSeconds,
          isRunning: true,
        };
      }
      return {
        phase: "prepare",
        currentSet: 1,
        currentExercise: 1,
        timeLeft: config.prepareSeconds,
        isRunning: true,
      };
    case "pause":
      return { ...state, isRunning: false };
    case "resume":
      return state.phase === "complete"
        ? state
        : { ...state, isRunning: true };
    case "reset":
      return createInitialState(config);
    case "sync_config":
      return state.phase === "idle"
        ? { ...state, timeLeft: getIdleTimeLeft(config) }
        : state;
    case "tick": {
      if (
        !state.isRunning ||
        state.phase === "idle" ||
        state.phase === "complete"
      ) {
        return state;
      }

      if (state.timeLeft > 1) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }

      if (state.phase === "prepare") {
        return {
          ...state,
          phase: "work",
          timeLeft: config.workSeconds,
        };
      }

      if (state.phase === "work") {
        const isLastExercise = state.currentExercise >= config.exercises;
        const isLastSet = state.currentSet >= config.sets;

        if (isLastExercise && isLastSet) {
          return {
            ...state,
            phase: "complete",
            isRunning: false,
            timeLeft: 0,
          };
        }

        return {
          ...state,
          phase: "rest",
          timeLeft: config.restSeconds,
        };
      }

      if (state.currentExercise >= config.exercises) {
        return {
          ...state,
          phase: "work",
          currentSet: state.currentSet + 1,
          currentExercise: 1,
          timeLeft: config.workSeconds,
        };
      }

      return {
        ...state,
        phase: "work",
        currentExercise: state.currentExercise + 1,
        timeLeft: config.workSeconds,
      };
    }
    default:
      return state;
  }
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function adjustIntervalUp(value: number) {
  if (value < 30) {
    return value + 1;
  }

  if (value >= 61) {
    return value + 10;
  }

  if (value === 60) {
    return 70;
  }

  if (value % 5 !== 0) {
    return Math.ceil(value / 5) * 5;
  }

  const next = value + 5;
  return next > 60 ? 60 : next;
}

function adjustIntervalDown(value: number) {
  if (value <= 30) {
    return value - 1;
  }

  if (value > 61) {
    return value - 10;
  }

  if (value === 61) {
    return 60;
  }

  if (value % 5 !== 0) {
    return Math.floor(value / 5) * 5;
  }

  const previous = value - 5;
  return previous < 30 ? 30 : previous;
}

function adjustInterval(value: number, direction: "up" | "down") {
  return direction === "up" ? adjustIntervalUp(value) : adjustIntervalDown(value);
}

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  adjustValue?: (value: number, direction: "up" | "down") => number;
  suffix?: string;
  disabled?: boolean;
};

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  adjustValue,
  suffix,
  disabled,
}: StepperProps) {
  const decrease = () => {
    const next = adjustValue
      ? adjustValue(value, "down")
      : value - step;
    onChange(clamp(next, min, max));
  };

  const increase = () => {
    const next = adjustValue
      ? adjustValue(value, "up")
      : value + step;
    onChange(clamp(next, min, max));
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="w-20 shrink-0 text-sm font-medium text-stone-400">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={decrease}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-lg text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <div className="flex w-24 items-baseline justify-center gap-1">
          <span className="font-mono text-2xl font-semibold tabular-nums text-stone-50">
            {value}
          </span>
          {suffix && (
            <span className="text-sm text-stone-500">{suffix}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={increase}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-lg text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Ready",
  prepare: "Get Ready",
  work: "Work",
  rest: "Rest",
  complete: "Done",
};

export default function TabataTimer({
  initialConfig,
  readOnly = false,
}: {
  initialConfig?: Partial<Config>;
  readOnly?: boolean;
}) {
  const pathname = usePathname();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [config, setConfig] = useReducer(
    (prev: Config, next: Partial<Config>) => {
      const exercises = next.exercises ?? prev.exercises;
      const exerciseNames =
        next.exerciseNames !== undefined
          ? resizeExerciseNames(next.exerciseNames, exercises)
          : next.exercises !== undefined
            ? resizeExerciseNames(prev.exerciseNames, exercises)
            : prev.exerciseNames;

      return { ...prev, ...next, exercises, exerciseNames };
    },
    mergeConfig(initialConfig),
  );
  const [timer, dispatch] = useReducer(
    (state: TimerState, action: TimerAction) =>
      timerReducer(state, action, config),
    mergeConfig(initialConfig),
    createInitialState,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<Phase>("idle");

  const isLocked = timer.phase !== "idle" && timer.phase !== "complete";

  const handleStart = useCallback(() => {
    unlockSounds();

    if (!isDefaultTabataConfig(config)) {
      const hash = encodeTabataConfig(config);
      void fetch("/api/workouts/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      });
    }

    dispatch({ type: "start" });
  }, [config]);

  const handleTogglePause = useCallback(() => {
    if (!timer.isRunning) {
      unlockSounds();
    }
    dispatch({ type: timer.isRunning ? "pause" : "resume" });
  }, [timer.isRunning]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    dispatch({ type: "sync_config" });
  }, [config.workSeconds, config.prepareSeconds]);

  useEffect(() => {
    if (readOnly || isLocked) {
      return;
    }

    const targetPath = getTabataConfigPath(config);
    const onHomeWithDefaults =
      pathname === "/" && isDefaultTabataConfig(config);

    if (onHomeWithDefaults) {
      if (window.location.pathname !== "/") {
        window.history.replaceState(null, "", "/");
      }
      return;
    }

    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, "", targetPath);
    }
  }, [config, isLocked, pathname, readOnly]);

  const handleCopyLink = useCallback(async () => {
    const path = getTabataConfigPath(config);
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  }, [config]);

  useEffect(() => {
    document.title = getWorkoutTitle(config);
  }, [config]);

  useEffect(() => {
    if (!timer.isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return clearTimer;
  }, [timer.isRunning, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    const previousPhase = prevPhaseRef.current;

    if (previousPhase === "prepare" && timer.phase === "work") {
      playPhaseSound("prepareEnd");
    }

    if (
      previousPhase === "work" &&
      (timer.phase === "rest" || timer.phase === "complete")
    ) {
      playPhaseSound("exerciseEnd");
    }

    if (previousPhase === "rest" && timer.phase === "work") {
      playPhaseSound("restEnd");
    }

    prevPhaseRef.current = timer.phase;
  }, [timer.phase]);

  useEffect(() => {
    if (!timer.isRunning) {
      return;
    }

    playCountdownTick(timer.phase, timer.timeLeft);
  }, [timer.isRunning, timer.phase, timer.timeLeft]);

  const phaseColor =
    timer.phase === "prepare"
      ? "text-violet-400"
      : timer.phase === "work"
      ? "text-amber-400"
      : timer.phase === "rest"
        ? "text-sky-400"
        : timer.phase === "complete"
          ? "text-emerald-400"
          : "text-stone-400";

  const ringColor =
    timer.phase === "prepare"
      ? "border-violet-400/30 shadow-[0_0_60px_-12px_rgba(167,139,250,0.35)]"
      : timer.phase === "work"
      ? "border-amber-400/30 shadow-[0_0_60px_-12px_rgba(251,191,36,0.35)]"
      : timer.phase === "rest"
        ? "border-sky-400/30 shadow-[0_0_60px_-12px_rgba(56,189,248,0.35)]"
        : timer.phase === "complete"
          ? "border-emerald-400/30 shadow-[0_0_60px_-12px_rgba(52,211,153,0.35)]"
          : "border-stone-700";

  const totalSeconds = getTotalWorkoutSeconds(config);
  const workoutTitle = getWorkoutTitle(config);
  const currentExerciseName = getExerciseName(config, timer.currentExercise);
  const nextExerciseNumber =
    timer.phase === "rest"
      ? timer.currentExercise >= config.exercises
        ? 1
        : timer.currentExercise + 1
      : 0;
  const nextExerciseName =
    nextExerciseNumber > 0
      ? getExerciseName(config, nextExerciseNumber)
      : "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-10 px-6 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-50">
          {workoutTitle}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {config.exercises} exercises · {config.sets}{" "}
          {config.sets === 1 ? "set" : "sets"} · {formatTime(totalSeconds)} total
        </p>
        {!readOnly && !isLocked && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="mt-3 text-sm font-medium text-stone-400 transition-colors hover:text-stone-200"
          >
            {copyState === "copied" ? "Link copied" : "Copy workout link"}
          </button>
        )}
      </header>

      <section
        aria-live="polite"
        aria-atomic="true"
        className={`flex flex-col items-center rounded-3xl border bg-stone-900/60 px-8 py-10 transition-all duration-500 ${ringColor}`}
      >
        <span
          className={`mb-4 text-sm font-semibold uppercase tracking-[0.2em] ${phaseColor}`}
        >
          {PHASE_LABELS[timer.phase]}
        </span>

        <div className="font-mono text-7xl font-bold tabular-nums tracking-tight text-stone-50 sm:text-8xl">
          {formatTime(timer.timeLeft)}
        </div>

        {timer.phase === "work" && currentExerciseName ? (
          <p className="mt-4 text-lg font-medium text-stone-200">
            {currentExerciseName}
          </p>
        ) : null}

        {timer.phase === "rest" && nextExerciseName ? (
          <p className="mt-4 text-sm text-stone-400">
            Next: {nextExerciseName}
          </p>
        ) : null}

        {timer.phase === "work" || timer.phase === "rest" ? (
          <p
            className={`text-sm text-stone-500 ${timer.phase === "work" && currentExerciseName ? "mt-2" : "mt-4"}`}
          >
            Exercise {timer.currentExercise} of {config.exercises} · Set{" "}
            {timer.currentSet} of {config.sets}
          </p>
        ) : null}

        {timer.phase === "work" || timer.phase === "rest" || timer.phase === "complete" ? (
          <div className="mt-6 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: config.exercises }, (_, i) => {
              const exerciseNumber = i + 1;
              const isDone =
                exerciseNumber < timer.currentExercise ||
                (timer.phase === "complete" &&
                  exerciseNumber <= config.exercises);
              const isActive =
                !isDone &&
                exerciseNumber === timer.currentExercise &&
                (timer.phase === "work" || timer.phase === "rest");

              return (
                <span
                  key={exerciseNumber}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    isDone
                      ? "bg-stone-500"
                      : isActive
                        ? timer.phase === "work"
                          ? "bg-amber-400"
                          : "bg-sky-400"
                        : "bg-stone-700"
                  }`}
                />
              );
            })}
          </div>
        ) : null}
      </section>

      {!readOnly && (
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="workout-name"
            className="text-sm font-medium text-stone-400"
          >
            Workout name
          </label>
          <input
            id="workout-name"
            type="text"
            value={config.name}
            onChange={(event) => setConfig({ name: event.target.value })}
            disabled={isLocked}
            placeholder="Morning HIIT"
            maxLength={60}
            className="h-12 rounded-xl border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 placeholder:text-stone-600 transition-colors focus:border-stone-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
        <Stepper
          label="Prepare"
          value={config.prepareSeconds}
          onChange={(prepareSeconds) => setConfig({ prepareSeconds })}
          min={0}
          max={60}
          suffix="sec"
          disabled={isLocked}
        />
        <Stepper
          label="Exercise"
          value={config.workSeconds}
          onChange={(workSeconds) => setConfig({ workSeconds })}
          min={5}
          max={600}
          adjustValue={adjustInterval}
          suffix="sec"
          disabled={isLocked}
        />
        <Stepper
          label="Rest"
          value={config.restSeconds}
          onChange={(restSeconds) => setConfig({ restSeconds })}
          min={0}
          max={600}
          adjustValue={adjustInterval}
          suffix="sec"
          disabled={isLocked}
        />
        <Stepper
          label="Exercises"
          value={config.exercises}
          onChange={(exercises) => setConfig({ exercises })}
          min={1}
          max={50}
          disabled={isLocked}
        />
        <Stepper
          label="Sets"
          value={config.sets}
          onChange={(sets) => setConfig({ sets })}
          min={1}
          max={50}
          disabled={isLocked}
        />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-500">
            Add a name for each exercise (optional)
          </p>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
            {config.exerciseNames.map((exerciseName, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-sm text-stone-500">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(event) => {
                    const nextNames = [...config.exerciseNames];
                    nextNames[index] = event.target.value;
                    setConfig({ exerciseNames: nextNames });
                  }}
                  disabled={isLocked}
                  placeholder="Add exercise name"
                  maxLength={40}
                  aria-label={`Exercise ${index + 1} name`}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-stone-700 bg-stone-900 px-3 text-sm text-stone-50 placeholder:text-stone-600 transition-colors focus:border-stone-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {timer.phase === "idle" || timer.phase === "complete" ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-amber-400 text-base font-semibold text-stone-950 transition-colors hover:bg-amber-300"
          >
            {timer.phase === "complete" ? "Start again" : "Start"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTogglePause}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-stone-100 text-base font-semibold text-stone-950 transition-colors hover:bg-white"
          >
            {timer.isRunning ? "Pause" : "Resume"}
          </button>
        )}

        {timer.phase !== "idle" && (
          <button
            type="button"
            onClick={() => dispatch({ type: "reset" })}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-stone-700 text-base font-semibold text-stone-300 transition-colors hover:border-stone-500 hover:bg-stone-900"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
