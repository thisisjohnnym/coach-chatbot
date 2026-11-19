import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import {
  findMentionedBagsInPrompt,
  getCannedReplyForPrompt,
  STATEMENT_PROMPT,
  type BagProduct,
  type ContentSpotMode,
  type StarterAction,
} from "./data/catalog";
import { Layer, LayerGrid } from "./primitives/Layout";
import {
  COLD_START_EXIT_DURATION,
  COLD_START_SETTLE_MS,
  DURATION_ENTER,
  DURATION_EXIT,
  EASE_PREMIUM,
  EXIT_SETTLE_MS,
  RESUME_PILL_DELAY_MS,
} from "./motion/presets";
import { PlpListing } from "./components/PlpListing";
import { ClosedFloatingOverlay } from "./components/ClosedFloatingOverlay";
import { AssistantSheetShell } from "./components/AssistantSheetShell";
import { LiquidOrb, type OrbStageState } from "./components/LiquidOrb";
import { ColdStartView } from "./components/ColdStartView";
import {
  ChatThreadView,
  resetSeenChatTurnIds,
  type ChatMessageTurn,
  type ThreadTurn,
} from "./components/ChatThreadView";
import type { CompareThreadTurn } from "./components/CompareFlowView";
import { ProductPickerModal } from "./components/ProductPickerModal";

type ActiveSheetView = "cold-start" | "exiting-cold-start" | "thread" | "transitioning-reset";

interface ActivePickerTarget {
  turnId: string;
  slot: "A" | "B";
}

const VOICE_SAMPLE_PROMPTS = [
  STATEMENT_PROMPT,
  "Which is best for going out?",
  "More with gold hardware",
];

export function App() {
  const plpScrollRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const voiceTimersRef = useRef<number[]>([]);
  const voiceIdxRef = useRef(0);

  // Storefront / Content Spot state
  const [contentSpotMode, setContentSpotMode] = useState<ContentSpotMode>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("spot");
      if (param === "prompted" || param === "general") return param;
    }
    return "general";
  });
  const [contentSpotDismissed, setContentSpotDismissed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 930
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Assistant sheet & strict non-overlapping stage state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [floatingVisible, setFloatingVisible] = useState(true);
  const [isInitialOpenStagger, setIsInitialOpenStagger] = useState(true);
  const [enteredFromColdStart, setEnteredFromColdStart] = useState(true);
  const [isInitialExchange, setIsInitialExchange] = useState(true);
  const [activeView, setActiveView] = useState<ActiveSheetView>("cold-start");
  const [orbBloomKey, setOrbBloomKey] = useState(1);
  const [craftSessionId, setCraftSessionId] = useState(1);
  const [selectedStarterId, setSelectedStarterId] = useState<StarterAction["id"] | null>(
    null
  );

  // Unified multi-turn thread (ChatMessageTurn | CompareThreadTurn)
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [resumePillReady, setResumePillReady] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<ActivePickerTarget | null>(null);

  const clearVoiceTimers = useCallback(() => {
    voiceTimersRef.current.forEach((id) => window.clearTimeout(id));
    voiceTimersRef.current = [];
  }, []);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    clearVoiceTimers();
  }, [clearVoiceTimers]);

  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const hasResumableSession = turns.length > 0;

  useEffect(() => {
    if (sheetOpen || !hasResumableSession || resumeDismissed) {
      setResumePillReady(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setResumePillReady(true);
    }, RESUME_PILL_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [sheetOpen, hasResumableSession, resumeDismissed]);

  const firstTurn = turns[0];
  const isFirstTurnActiveThinking =
    turns.length === 1 &&
    Boolean(firstTurn) &&
    ((firstTurn.kind === "chat" && firstTurn.status === "thinking") ||
      (firstTurn.kind === "compare" && firstTurn.stage === "loading"));

  const isFirstTurnPreAnswer =
    turns.length === 1 &&
    Boolean(firstTurn) &&
    ((firstTurn.kind === "chat" && firstTurn.status !== "answered") ||
      (firstTurn.kind === "compare" &&
        (firstTurn.stage === "loading" || firstTurn.stage === "exiting-loading")));

  // Persistent LiquidOrb state:
  // - "hero" on Cold Start
  // - "thinking" as Cold Start exits & during initial thinking/loading (glides smoothly upward, never unmounts)
  // - "receded" during exiting-thinking / exiting-loading / answered / selecting / compared / reset
  const orbStageState: OrbStageState =
    activeView === "cold-start"
      ? "hero"
      : activeView === "exiting-cold-start" ||
        (isInitialExchange && activeView === "thread" && isFirstTurnActiveThinking)
      ? "thinking"
      : "receded";

  const showNewChat = activeView === "thread";

  const rawStageHeight =
    activeView === "cold-start" ||
    activeView === "exiting-cold-start" ||
    activeView === "transitioning-reset"
      ? 492
      : isFirstTurnPreAnswer && !enteredFromColdStart
      ? 320
      : 488;

  const stageHeight = Math.min(rawStageHeight, Math.max(260, viewportHeight - 204));

  const handleSelectSpotMode = useCallback((mode: ContentSpotMode) => {
    setContentSpotMode(mode);
    setContentSpotDismissed(false);
  }, []);

  const enqueueCompareTurn = useCallback(
    (options: {
      replaceThread: boolean;
      userPrompt?: string;
      showUserBubble?: boolean;
      anchorChoiceGroupKey?: string;
      fromColdStart: boolean;
      preselectedA?: BagProduct | null;
      preselectedB?: BagProduct | null;
    }) => {
      const {
        replaceThread,
        userPrompt = "Help me compare bags",
        showUserBubble = true,
        anchorChoiceGroupKey,
        fromColdStart,
        preselectedA = null,
        preselectedB = null,
      } = options;

      if (replaceThread) {
        resetSeenChatTurnIds();
      }

      const turnId = `compare-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const isDirectPair = Boolean(preselectedA && preselectedB);

      const newTurn: CompareThreadTurn = {
        kind: "compare",
        id: turnId,
        userPrompt,
        showUserBubble,
        anchorChoiceGroupKey,
        mode: isDirectPair ? "direct-pair" : "interactive-slots",
        stage: isDirectPair ? "compared" : "loading",
        slotA: preselectedA,
        slotB: preselectedB,
        confirmSelectedOptions: isDirectPair ? ["compare-choices"] : [],
        followUpSelectedOptions: [],
        feedback: null,
      };

      setEnteredFromColdStart(fromColdStart);
      setIsInitialExchange(!isDirectPair && replaceThread);
      setIsInitialOpenStagger(false);
      setActiveView("thread");
      setFloatingVisible(false);
      setSheetOpen(true);
      setTurns((prev) => (replaceThread ? [newTurn] : [...prev, newTurn]));

      if (isDirectPair) {
        return;
      }

      // Let 800ms Loading entrance settle, then AnimatePresence mode="wait" exits Loading in sync with Orb before mounting Compare Slots!
      const startExitAt = 1280;
      scheduleTimer(() => {
        setIsInitialExchange(false);
        setTurns((prev) =>
          prev.map((t): ThreadTurn =>
            t.id === turnId && t.kind === "compare"
              ? { ...t, stage: "selecting" as const }
              : t
          )
        );
      }, startExitAt);
    },
    [scheduleTimer]
  );

  const enqueueChatTurn = useCallback(
    (
      trimmed: string,
      options: {
        replaceThread: boolean;
        showUserBubble?: boolean;
        anchorChoiceGroupKey?: string;
        fromColdStart: boolean;
        openingSheetNow: boolean;
        withThinkingOrb: boolean;
      }
    ) => {
      const {
        replaceThread,
        showUserBubble = true,
        anchorChoiceGroupKey,
        fromColdStart,
        openingSheetNow,
        withThinkingOrb,
      } = options;

      if (replaceThread) {
        resetSeenChatTurnIds();
      }

      const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newTurn: ChatMessageTurn = {
        kind: "chat",
        id: turnId,
        userPrompt: trimmed,
        showUserBubble,
        status: "thinking",
        selectedOptions: [],
        anchorChoiceGroupKey,
        feedback: null,
      };

      setEnteredFromColdStart(fromColdStart);
      setIsInitialExchange(withThinkingOrb);
      setIsInitialOpenStagger(openingSheetNow);
      setActiveView("thread");
      setFloatingVisible(false);
      setSheetOpen(true);
      setTurns((prev) => (replaceThread ? [newTurn] : [...prev, newTurn]));

      const openOffset = openingSheetNow ? 280 : 0;
      const startExitAt = openOffset + 1200;

      // AnimatePresence mode="wait" exits Thinking in sync with Orb before cascading Answer!
      scheduleTimer(() => {
        if (withThinkingOrb) {
          setIsInitialExchange(false);
        }
        const reply = getCannedReplyForPrompt(trimmed);
        setTurns((prev) =>
          prev.map((t): ThreadTurn =>
            t.id === turnId && t.kind === "chat"
              ? {
                  ...t,
                  status: "answered" as const,
                  reply,
                }
              : t
          )
        );
      }, startExitAt);
    },
    [scheduleTimer]
  );

  const submitPrompt = useCallback(
    (
      rawPrompt: string,
      options?: {
        replaceThread?: boolean;
        showUserBubble?: boolean;
        anchorChoiceGroupKey?: string;
        fromColdStart?: boolean;
        openingSheetNow?: boolean;
        withThinkingOrb?: boolean;
      }
    ) => {
      const trimmed = rawPrompt.trim();
      if (!trimmed) return;

      const replaceThread = options?.replaceThread ?? false;
      const showUserBubble = options?.showUserBubble ?? true;
      const anchorChoiceGroupKey = options?.anchorChoiceGroupKey;
      const fromColdStart = options?.fromColdStart ?? enteredFromColdStart;
      const openingSheetNow = options?.openingSheetNow ?? false;
      const withThinkingOrb = options?.withThinkingOrb ?? false;

      clearPendingTimers();
      setInputValue("");
      setResumeDismissed(false);
      setPickerTarget(null);

      const runDispatch = () => {
        const lower = trimmed.toLowerCase();
        if (
          lower === "compare two bags" ||
          lower === "help me compare bags" ||
          lower.startsWith("compare ")
        ) {
          if (!lower.includes("compare feature")) {
            const matchedBags = findMentionedBagsInPrompt(trimmed);
            enqueueCompareTurn({
              replaceThread,
              userPrompt: trimmed,
              showUserBubble,
              anchorChoiceGroupKey,
              fromColdStart,
              preselectedA: matchedBags[0] ?? null,
              preselectedB: matchedBags[1] ?? null,
            });
            return;
          }
        }

        enqueueChatTurn(trimmed, {
          replaceThread,
          showUserBubble,
          anchorChoiceGroupKey,
          fromColdStart,
          openingSheetNow,
          withThinkingOrb,
        });
      };

      // If currently on Cold Start, exit Cold Start FIRST (while Orb glides upward), then enter Thread!
      if ((activeView === "cold-start" || activeView === "exiting-cold-start") && sheetOpen) {
        setIsInitialExchange(withThinkingOrb);
        setActiveView("exiting-cold-start");
        scheduleTimer(runDispatch, COLD_START_SETTLE_MS);
        return;
      }

      runDispatch();
    },
    [
      activeView,
      clearPendingTimers,
      enqueueChatTurn,
      enqueueCompareTurn,
      enteredFromColdStart,
      scheduleTimer,
      sheetOpen,
    ]
  );

  const handleOpenFromContentSpot = useCallback(
    (mode: ContentSpotMode) => {
      clearPendingTimers();
      setResumeDismissed(false);
      setPickerTarget(null);
      setSelectedStarterId(null);
      setCraftSessionId((s) => s + 1);
      setOrbBloomKey((k) => k + 1);
      setFloatingVisible(false);

      if (mode === "prompted") {
        submitPrompt(STATEMENT_PROMPT, {
          replaceThread: true,
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
        });
      } else {
        resetSeenChatTurnIds();
        setTurns([]);
        setEnteredFromColdStart(true);
        setIsInitialExchange(true);
        setIsInitialOpenStagger(true);
        setActiveView("cold-start");
        setSheetOpen(true);
      }
    },
    [clearPendingTimers, submitPrompt]
  );

  const handleNewChat = useCallback(() => {
    clearPendingTimers();
    setPickerTarget(null);
    setSelectedStarterId(null);
    setIsInitialExchange(false);

    // Step 1: Exit active thread + New Chat pill FIRST (opacity + blur + scale)
    setActiveView("transitioning-reset");

    // Step 2: Only AFTER old stage has completely exited, bloom Orb + Cold Start cleanly!
    scheduleTimer(() => {
      resetSeenChatTurnIds();
      setTurns([]);
      setInputValue("");
      setEnteredFromColdStart(true);
      setIsInitialExchange(true);
      setIsInitialOpenStagger(false);
      setCraftSessionId((s) => s + 1);
      setOrbBloomKey((k) => k + 1);
      setActiveView("cold-start");
    }, EXIT_SETTLE_MS);
  }, [clearPendingTimers, scheduleTimer]);

  const handleCloseSheet = useCallback(() => {
    clearPendingTimers();
    setPickerTarget(null);
    setSheetOpen(false);
    scheduleTimer(() => {
      if (turns.length === 0) {
        setSelectedStarterId(null);
        setActiveView("cold-start");
      }
      setFloatingVisible(true);
    }, 660);
  }, [clearPendingTimers, scheduleTimer, turns.length]);

  const handleResumeChat = useCallback(() => {
    clearPendingTimers();
    setResumeDismissed(false);
    setFloatingVisible(false);
    scheduleTimer(() => {
      setIsInitialOpenStagger(false);
      setSheetOpen(true);
    }, 460);
  }, [clearPendingTimers, scheduleTimer]);

  const handleOpenFreshFromFab = useCallback(() => {
    clearPendingTimers();
    setFloatingVisible(false);
    scheduleTimer(() => {
      if (hasResumableSession && !resumeDismissed) {
        setIsInitialOpenStagger(false);
        setSheetOpen(true);
        return;
      }
      setSelectedStarterId(null);
      setCraftSessionId((s) => s + 1);
      setOrbBloomKey((k) => k + 1);
      setEnteredFromColdStart(true);
      setIsInitialExchange(true);
      setIsInitialOpenStagger(true);
      setActiveView("cold-start");
      setSheetOpen(true);
    }, 460);
  }, [clearPendingTimers, hasResumableSession, resumeDismissed, scheduleTimer]);

  const handleSelectStarter = useCallback(
    (action: StarterAction) => {
      clearPendingTimers();
      setSelectedStarterId(action.id);
      setIsInitialExchange(true);
      // Step 1: Cold Start exits in place with opacity + blur + scale (no morphing into chat pills)
      // while the persistent LiquidOrb glides smoothly upward!
      setActiveView("exiting-cold-start");

      // Step 2: Once Cold Start finishes exiting (zero overlap!), enter the chat pill & typing indicator
      scheduleTimer(() => {
        if (action.id === "compare") {
          enqueueCompareTurn({
            replaceThread: true,
            fromColdStart: true,
          });
        } else {
          enqueueChatTurn(action.label, {
            replaceThread: true,
            fromColdStart: true,
            openingSheetNow: false,
            withThinkingOrb: true,
          });
        }
      }, COLD_START_SETTLE_MS);
    },
    [clearPendingTimers, enqueueChatTurn, enqueueCompareTurn, scheduleTimer]
  );

  const handleSelectTurnOption = useCallback(
    (turnId: string, option: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      if (targetIdx === -1) return;
      const targetTurn = turns[targetIdx];
      if (
        targetTurn.kind !== "chat" ||
        targetTurn.selectedOptions.includes(option)
      ) {
        return;
      }
      const hasTurnsBelow = targetIdx < turns.length - 1;

      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId && t.kind === "chat"
            ? {
                ...t,
                selectedOptions: [...t.selectedOptions, option],
              }
            : t
        )
      );
      submitPrompt(option, {
        replaceThread: false,
        showUserBubble: hasTurnsBelow,
        anchorChoiceGroupKey: `${turnId}:options`,
        fromColdStart: true,
        openingSheetNow: false,
        withThinkingOrb: false,
      });
    },
    [submitPrompt, turns]
  );

  const handleTurnFeedback = useCallback((turnId: string, vote: "up" | "down") => {
    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? { ...t, feedback: t.feedback === vote ? null : vote }
          : t
      )
    );
  }, []);

  const handleInspectBagFromCarousel = useCallback(
    (bag: BagProduct) => {
      submitPrompt(`Tell me more about the ${bag.shortName}`, {
        replaceThread: false,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [submitPrompt]
  );

  const handleOpenComparePicker = useCallback((turnId: string, slot: "A" | "B") => {
    setPickerTarget({ turnId, slot });
  }, []);

  const handlePickCompareBag = useCallback(
    (bag: BagProduct) => {
      const currentTarget = pickerTarget;
      if (!currentTarget) return;
      setPickerTarget(null);
      scheduleTimer(() => {
        setTurns((prev) =>
          prev.map((t) => {
            if (t.id !== currentTarget.turnId || t.kind !== "compare") return t;
            return currentTarget.slot === "A"
              ? { ...t, slotA: bag }
              : { ...t, slotB: bag };
          })
        );
      }, EXIT_SETTLE_MS);
    },
    [pickerTarget, scheduleTimer]
  );

  const handleEditCompareChoices = useCallback(
    (turnId: string) => {
      const targetTurn = turns.find((t) => t.id === turnId);
      if (!targetTurn || targetTurn.kind !== "compare") return;

      if (
        targetTurn.stage === "compared" ||
        targetTurn.confirmSelectedOptions.length > 0
      ) {
        setPickerTarget({ turnId, slot: "A" });
        return;
      }

      setTurns((prev) =>
        prev.map((t): ThreadTurn =>
          t.id === turnId && t.kind === "compare"
            ? {
                ...t,
                slotA: null,
                slotB: null,
                stage: "selecting" as const,
                confirmSelectedOptions: [],
              }
            : t
        )
      );
      scheduleTimer(() => {
        setPickerTarget({ turnId, slot: "A" });
      }, EXIT_SETTLE_MS);
    },
    [scheduleTimer, turns]
  );

  const handleConfirmCompare = useCallback((turnId: string) => {
    setTurns((prev) =>
      prev.map((t): ThreadTurn =>
        t.id === turnId && t.kind === "compare" && t.slotA && t.slotB
          ? {
              ...t,
              stage: "compared" as const,
              confirmSelectedOptions: t.confirmSelectedOptions.includes("compare-choices")
                ? t.confirmSelectedOptions
                : [...t.confirmSelectedOptions, "compare-choices" as const],
            }
          : t
      )
    );
  }, []);

  const handleConfirmCompareSomethingElse = useCallback(
    (turnId: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      if (targetIdx === -1) return;
      const targetTurn = turns[targetIdx];
      if (
        targetTurn.kind !== "compare" ||
        targetTurn.confirmSelectedOptions.includes("something-else")
      ) {
        return;
      }
      const hasContentBelow =
        targetTurn.stage === "compared" || targetIdx < turns.length - 1;

      setTurns((prev) =>
        prev.map((t): ThreadTurn =>
          t.id === turnId && t.kind === "compare"
            ? {
                ...t,
                confirmSelectedOptions: [...t.confirmSelectedOptions, "something-else" as const],
              }
            : t
        )
      );
      submitPrompt("Help me with something else", {
        replaceThread: false,
        showUserBubble: hasContentBelow,
        anchorChoiceGroupKey: `${turnId}:confirm`,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [submitPrompt, turns]
  );

  const handleCompareFeatures = useCallback(
    (turnId: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      if (targetIdx === -1) return;
      const targetTurn = turns[targetIdx];
      if (
        targetTurn.kind !== "compare" ||
        targetTurn.followUpSelectedOptions.includes("compare-features")
      ) {
        return;
      }
      const hasTurnsBelow = targetIdx < turns.length - 1;

      setTurns((prev) =>
        prev.map((t): ThreadTurn =>
          t.id === turnId && t.kind === "compare"
            ? {
                ...t,
                followUpSelectedOptions: [...t.followUpSelectedOptions, "compare-features" as const],
              }
            : t
        )
      );
      submitPrompt("Compare features", {
        replaceThread: false,
        showUserBubble: hasTurnsBelow,
        anchorChoiceGroupKey: `${turnId}:followup`,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [submitPrompt, turns]
  );

  const handleFollowUpCompareSomethingElse = useCallback(
    (turnId: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      if (targetIdx === -1) return;
      const targetTurn = turns[targetIdx];
      if (
        targetTurn.kind !== "compare" ||
        targetTurn.followUpSelectedOptions.includes("something-else")
      ) {
        return;
      }
      const hasTurnsBelow = targetIdx < turns.length - 1;

      setTurns((prev) =>
        prev.map((t): ThreadTurn =>
          t.id === turnId && t.kind === "compare"
            ? {
                ...t,
                followUpSelectedOptions: [...t.followUpSelectedOptions, "something-else" as const],
              }
            : t
        )
      );
      submitPrompt("Help me with something else", {
        replaceThread: false,
        showUserBubble: hasTurnsBelow,
        anchorChoiceGroupKey: `${turnId}:followup`,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [submitPrompt, turns]
  );

  const handleVoiceSample = useCallback(() => {
    clearVoiceTimers();
    const sample = VOICE_SAMPLE_PROMPTS[voiceIdxRef.current % VOICE_SAMPLE_PROMPTS.length];
    voiceIdxRef.current += 1;
    const words = sample.split(" ");
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInputValue(sample);
      return;
    }
    setInputValue(words[0] ?? "");
    words.slice(1).forEach((_, idx) => {
      const id = window.setTimeout(() => {
        setInputValue(words.slice(0, idx + 2).join(" "));
      }, (idx + 1) * 52);
      voiceTimersRef.current.push(id);
    });
  }, [clearVoiceTimers]);

  const handleScrollPlpTop = useCallback(() => {
    plpScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activePickerTurn = pickerTarget
    ? turns.find(
        (t): t is CompareThreadTurn =>
          t.id === pickerTarget.turnId && t.kind === "compare"
      )
    : undefined;

  const excludedPickerBagId =
    pickerTarget && activePickerTurn
      ? pickerTarget.slot === "A"
        ? activePickerTurn.slotB?.id
        : activePickerTurn.slotA?.id
      : undefined;

  return (
    <LayerGrid
      as="main"
      className="mobile-viewport-lock bg-surface overflow-hidden isolate select-none"
    >
        {/* Layer 1: Scrollable Handbags PLP + Inline Content Spot */}
        <Layer className="w-full h-full overflow-hidden isolate z-0">
          <PlpListing
            scrollRef={plpScrollRef}
            contentSpotMode={contentSpotMode}
            contentSpotDismissed={contentSpotDismissed}
            onOpenAssistant={handleOpenFromContentSpot}
            onDismissContentSpot={() => setContentSpotDismissed(true)}
          />
        </Layer>

        {/* Layer 2: Closed Floating Controls (Resume Pill + FABs) */}
        <Layer className="w-full h-full flex flex-col justify-end pointer-events-none isolate z-10">
          <ClosedFloatingOverlay
            visible={!sheetOpen && floatingVisible}
            showResumePill={
              resumePillReady && hasResumableSession && !resumeDismissed
            }
            contentSpotMode={contentSpotMode}
            contentSpotDismissed={contentSpotDismissed}
            onSelectSpotMode={handleSelectSpotMode}
            onResumeChat={handleResumeChat}
            onDismissResumePill={() => setResumeDismissed(true)}
            onScrollTop={handleScrollPlpTop}
            onOpenFreshChat={handleOpenFreshFromFab}
          />
        </Layer>

        {/* Layer 3: Persistent Assistant Bottom Sheet with Non-Overlapping ~1s Spatial Stage */}
        <Layer className="w-full h-full pointer-events-none flex flex-col justify-end isolate z-20">
          <div
            className={clsx(
              "w-full h-full",
              sheetOpen ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <AssistantSheetShell
              open={sheetOpen}
              stageHeight={stageHeight}
              staggerChrome={isInitialOpenStagger}
              showNewChat={showNewChat}
              onNewChat={handleNewChat}
              onClose={handleCloseSheet}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSubmitPrompt={(prompt) =>
                submitPrompt(prompt, {
                  replaceThread:
                    activeView === "cold-start" || activeView === "exiting-cold-start",
                  fromColdStart:
                    activeView === "cold-start" || activeView === "exiting-cold-start"
                      ? true
                      : enteredFromColdStart,
                  openingSheetNow: false,
                  withThinkingOrb:
                    activeView === "cold-start" || activeView === "exiting-cold-start",
                })
              }
              onVoiceSample={handleVoiceSample}
              modalOverlay={
                pickerTarget ? (
                  <ProductPickerModal
                    key={`picker-${pickerTarget.turnId}-${pickerTarget.slot}`}
                    slot={pickerTarget.slot}
                    excludeBagId={excludedPickerBagId}
                    onPickBag={handlePickCompareBag}
                    onClose={() => setPickerTarget(null)}
                  />
                ) : null
              }
            >
              <LayerGrid className="w-full h-full min-h-0 grid-rows-1 overflow-visible">
                {/* Persistent GPU-composited LiquidOrb: zero clipping (overflow-visible), smooth glide, subtle blur+opacity exit */}
                <Layer className="self-start w-full pointer-events-none z-10 overflow-visible">
                  <LiquidOrb
                    stageState={orbStageState}
                    bloomKey={orbBloomKey}
                    staggerEntrance={isInitialOpenStagger}
                  />
                </Layer>

                {/* Stage Views: strict mode="wait" guarantees exiting view finishes before next view enters */}
                <Layer className="w-full h-full min-h-0 z-20 overflow-visible">
                  <LayerGrid className="w-full h-full min-h-0 grid-rows-1 overflow-visible">
                    <AnimatePresence
                      mode="wait"
                      initial={isInitialOpenStagger ? undefined : false}
                    >
                      {activeView === "cold-start" && (
                        <motion.div
                          key={`stage-cold-${craftSessionId}`}
                          initial={
                            isInitialOpenStagger
                              ? { opacity: 1 }
                              : { opacity: 0, filter: "blur(4px)", scale: 0.95, y: 12 }
                          }
                          animate={{
                            opacity: 1,
                            filter: "blur(0px)",
                            scale: 1,
                            y: 0,
                            transition: { duration: DURATION_ENTER, ease: EASE_PREMIUM },
                          }}
                          exit={{
                            opacity: 1,
                            transition: {
                              duration: COLD_START_EXIT_DURATION,
                              ease: EASE_PREMIUM,
                            },
                          }}
                          className="stack-cell w-full h-full min-h-0 overflow-visible"
                        >
                          <ColdStartView
                            selectedStarterId={selectedStarterId}
                            sheetOpenStagger={isInitialOpenStagger}
                            onSelectStarter={handleSelectStarter}
                          />
                        </motion.div>
                      )}

                      {activeView === "thread" && (
                        <motion.div
                          key={`stage-thread-${craftSessionId}`}
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 1 }}
                          exit={{
                            opacity: 0,
                            filter: "blur(3px)",
                            scale: 0.95,
                            y: 12,
                            transition: { duration: DURATION_EXIT, ease: EASE_PREMIUM },
                          }}
                          className={clsx(
                            "stack-cell w-full h-full min-h-0 overflow-visible transition-stage-inset motion-reduce:transition-none",
                            orbStageState === "thinking" ? "pt-144" : "pt-0"
                          )}
                        >
                          <ChatThreadView
                            turns={turns}
                            steadyStage={enteredFromColdStart}
                            sheetOpenStagger={isInitialOpenStagger}
                            onSelectOption={handleSelectTurnOption}
                            onFeedback={handleTurnFeedback}
                            onInspectBag={handleInspectBagFromCarousel}
                            onOpenComparePicker={handleOpenComparePicker}
                            onEditCompareChoices={handleEditCompareChoices}
                            onConfirmCompare={handleConfirmCompare}
                            onConfirmCompareSomethingElse={handleConfirmCompareSomethingElse}
                            onCompareFeatures={handleCompareFeatures}
                            onFollowUpCompareSomethingElse={handleFollowUpCompareSomethingElse}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </LayerGrid>
                </Layer>
              </LayerGrid>
            </AssistantSheetShell>
          </div>
        </Layer>
    </LayerGrid>
  );
}

export default App;
