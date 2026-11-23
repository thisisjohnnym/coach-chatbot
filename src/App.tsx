import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import {
  COMPARE_LOADING_COPY,
  COMPARE_TABBYS_PROMPT,
  DEFAULT_RECENT_COMPARE_BAGS,
  findMentionedBagsInPrompt,
  getCannedReplyForPrompt,
  getCompareSpotCopy,
  HOW_TO_WEAR_PROMPT,
  OUTFIT_STARTER_PROMPT,
  STATEMENT_PROMPT,
  UGC_PLAY_PROMPT,
  type BagProduct,
  type ContentSpotMode,
  type StarterAction,
} from "./data/catalog";
import { Box, Layer, LayerGrid } from "./primitives/Layout";
import {
  COLD_START_EXIT_DURATION,
  COLD_START_SETTLE_MS,
  DURATION_ENTER,
  DURATION_EXIT,
  EASE_PREMIUM,
  EXIT_SETTLE_MS,
  FOCUSED_TYPING_STAGE_HEIGHT,
  RESUME_PILL_DELAY_MS,
  TYPING_STAGE_SETTLE_MS,
} from "./motion/presets";
import { PlpListing } from "./components/PlpListing";
import type { StoriesSpotAction } from "./components/ContentSpotStories";
import { ClosedFloatingOverlay } from "./components/ClosedFloatingOverlay";
import { AssistantSheetShell } from "./components/AssistantSheetShell";
import type { OrbStageState } from "./components/LiquidOrb";
import { ColdStartView } from "./components/ColdStartView";
import {
  ChatThreadView,
  resetSeenChatTurnIds,
  type ChatMessageTurn,
  type ThreadTurn,
} from "./components/ChatThreadView";
import type { CompareThreadTurn } from "./components/CompareFlowView";
import type { OutfitThreadTurn } from "./components/OutfitFlowView";
import { ProductPickerModal } from "./components/ProductPickerModal";
import { ProductDetailModal } from "./components/ProductDetailModal";

const LiquidOrb = lazy(async () => {
  const mod = await import("./components/LiquidOrb");
  return { default: mod.LiquidOrb };
});

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

function detectStoriesVariant(): boolean {
  if (typeof window === "undefined") return false;
  const normalizedPath = window.location.pathname.replace(/\/+$/, "");
  const params = new URLSearchParams(window.location.search);
  return (
    normalizedPath === "/2" ||
    params.has("2") ||
    params.get("v") === "2" ||
    params.get("variant") === "stories"
  );
}

export function App() {
  const mainRef = useRef<HTMLDivElement | null>(null);
  const plpScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isTypingFocusedRef = useRef(false);
  const closingSheetRef = useRef(false);
  const restingHeightRef = useRef(
    typeof window !== "undefined" ? window.innerHeight : 930
  );
  const lastViewportWidthRef = useRef(
    typeof window !== "undefined" ? window.innerWidth : 430
  );
  const wasKbOpenRef = useRef(false);
  const focusedAtRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const voiceTimersRef = useRef<number[]>([]);
  const voiceIdxRef = useRef(0);

  // Storefront / Content Spot state
  const [isStoriesVariant] = useState<boolean>(detectStoriesVariant);
  const [contentSpotMode, setContentSpotMode] = useState<ContentSpotMode>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("spot");
      if (param === "prompted" || param === "general" || param === "compare") {
        return param;
      }
    }
    return "general";
  });
  const [contentSpotDismissed, setContentSpotDismissed] = useState(false);
  const [scenarioSelectorDismissed, setScenarioSelectorDismissed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 930
  );

  // Assistant sheet & strict non-overlapping stage state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [floatingVisible, setFloatingVisible] = useState(true);
  const [isInitialOpenStagger, setIsInitialOpenStagger] = useState(true);
  const [enteredFromColdStart, setEnteredFromColdStart] = useState(true);
  const [isInitialExchange, setIsInitialExchange] = useState(true);
  const [activeView, setActiveView] = useState<ActiveSheetView>("cold-start");
  const [isTypingFocused, setIsTypingFocused] = useState(false);
  const [isExpandingFromSubmit, setIsExpandingFromSubmit] = useState(false);
  const [orbBloomKey, setOrbBloomKey] = useState(1);
  const [craftSessionId, setCraftSessionId] = useState(1);
  const [selectedStarterId, setSelectedStarterId] = useState<StarterAction["id"] | null>(
    null
  );

  useEffect(() => {
    const syncViewport = () => {
      const vv = window.visualViewport;
      const scale = vv?.scale ?? 1;
      const rect = mainRef.current?.getBoundingClientRect();
      const mainHeight = rect ? Math.round(rect.height) : window.innerHeight;
      const mainBottom = rect ? rect.bottom : window.innerHeight;
      const currentWidth = window.innerWidth;

      if (Math.abs(currentWidth - lastViewportWidthRef.current) > 24) {
        lastViewportWidthRef.current = currentWidth;
        restingHeightRef.current = mainHeight;
        wasKbOpenRef.current = false;
      } else if (
        mainHeight > restingHeightRef.current ||
        (!isTypingFocusedRef.current && !wasKbOpenRef.current)
      ) {
        restingHeightRef.current = mainHeight;
      }

      const occludedBottom =
        vv && scale <= 1.05
          ? Math.max(0, Math.round(mainBottom - (vv.height + vv.offsetTop)))
          : 0;
      const layoutShrink = Math.max(0, restingHeightRef.current - mainHeight);
      const isVisualKbActive = occludedBottom >= 40;
      const isLayoutKbActive =
        (isTypingFocusedRef.current || wasKbOpenRef.current) && layoutShrink >= 60;
      const isKbActive = isVisualKbActive || isLayoutKbActive;

      if (
        occludedBottom >= 100 ||
        (isTypingFocusedRef.current && layoutShrink >= 100)
      ) {
        wasKbOpenRef.current = true;
      } else if (
        wasKbOpenRef.current &&
        !isKbActive &&
        Date.now() - focusedAtRef.current > 350
      ) {
        wasKbOpenRef.current = false;
        restingHeightRef.current = mainHeight;
        if (isTypingFocusedRef.current && !closingSheetRef.current) {
          isTypingFocusedRef.current = false;
          setIsExpandingFromSubmit(false);
          setIsTypingFocused(false);
          inputRef.current?.blur();
        }
      }

      const insetPx = isVisualKbActive ? occludedBottom : 0;

      document.documentElement.style.setProperty("--keyboard-inset", `${insetPx}px`);

      if (sheetOpen && (window.scrollY !== 0 || window.scrollX !== 0)) {
        window.scrollTo(0, 0);
      }

      setViewportHeight((prev) =>
        !isKbActive && !isTypingFocusedRef.current
          ? mainHeight
          : Math.max(prev, mainHeight)
      );
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
    };
  }, [sheetOpen]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty("--keyboard-inset", "0px");
    };
  }, []);

  // Unified multi-turn thread (ChatMessageTurn | CompareThreadTurn)
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [hasClosedSheet, setHasClosedSheet] = useState(false);
  const [resumePillReady, setResumePillReady] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<ActivePickerTarget | null>(null);
  const [detailBag, setDetailBag] = useState<BagProduct | null>(null);
  const [bagIdsInCart, setBagIdsInCart] = useState<string[]>([]);
  const [recentlyViewedBags, setRecentlyViewedBags] = useState<
    [BagProduct, BagProduct]
  >(DEFAULT_RECENT_COMPARE_BAGS);

  const recordViewedBag = useCallback((bag: BagProduct) => {
    setRecentlyViewedBags((prev) => {
      const filtered = prev.filter((item) => item.id !== bag.id);
      const updated = [...filtered, bag];
      return [
        updated[updated.length - 2] ?? prev[0],
        updated[updated.length - 1] ?? bag,
      ];
    });
  }, []);

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
  const shouldShowRecoveryPill = hasResumableSession || hasClosedSheet;

  useEffect(() => {
    if (sheetOpen || !shouldShowRecoveryPill) {
      setResumePillReady(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setResumePillReady(true);
    }, RESUME_PILL_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [sheetOpen, shouldShowRecoveryPill]);

  const firstTurn = turns[0];
  const isFirstTurnActiveThinking =
    turns.length === 1 &&
    Boolean(firstTurn) &&
    ((firstTurn.kind === "chat" && firstTurn.status === "thinking") ||
      (firstTurn.kind === "compare" && firstTurn.stage === "loading") ||
      (firstTurn.kind === "outfit" && firstTurn.stage === "loading"));

  const isFirstTurnPreAnswer =
    turns.length === 1 &&
    Boolean(firstTurn) &&
    ((firstTurn.kind === "chat" && firstTurn.status !== "answered") ||
      (firstTurn.kind === "compare" &&
        (firstTurn.stage === "loading" || firstTurn.stage === "exiting-loading")) ||
      (firstTurn.kind === "outfit" &&
        (firstTurn.stage === "loading" || firstTurn.stage === "exiting-loading")));

  // Persistent LiquidOrb state:
  // - "hero" on Cold Start (when typing is focused, hiddenForTyping fades it gently in place with zero blur stall)
  // - "thinking" as Cold Start exits & during initial thinking/loading (glides smoothly upward, never unmounts)
  // - "receded" during exiting-thinking / exiting-loading / answered / selecting / compared / reset
  const orbStageState: OrbStageState =
    activeView === "cold-start"
      ? "hero"
      : activeView === "exiting-cold-start" ||
          (isInitialExchange && activeView === "thread" && isFirstTurnActiveThinking)
        ? "thinking"
        : "receded";

  const showNewChat = activeView === "thread" && !isTypingFocused;

  const rawStageHeight =
    activeView === "cold-start" ||
    activeView === "exiting-cold-start" ||
    activeView === "transitioning-reset"
      ? 492
      : isFirstTurnPreAnswer && !enteredFromColdStart
      ? 320
      : 488;

  const availableStageHeight = Math.max(180, viewportHeight - 220);
  const restingStageHeight = Math.min(rawStageHeight, availableStageHeight);
  const stageHeight = isTypingFocused ? FOCUSED_TYPING_STAGE_HEIGHT : restingStageHeight;

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--stage-content-height",
      `${restingStageHeight}px`
    );
  }, [restingStageHeight]);

  const handleTypingFocusChange = useCallback((focused: boolean) => {
    if (!focused && closingSheetRef.current) {
      return;
    }
    isTypingFocusedRef.current = focused;
    setIsTypingFocused(focused);
    if (focused) {
      focusedAtRef.current = Date.now();
      setIsInitialOpenStagger(false);
      setIsExpandingFromSubmit(false);
      setPickerTarget(null);
      setDetailBag(null);
    }
  }, []);

  const handleDismissTyping = useCallback(() => {
    isTypingFocusedRef.current = false;
    setIsExpandingFromSubmit(false);
    setIsTypingFocused(false);
    inputRef.current?.blur();
  }, []);

  const handleSelectSpotMode = useCallback((mode: ContentSpotMode) => {
    setContentSpotMode(mode);
    setContentSpotDismissed(false);
  }, []);

  const enqueueCompareTurn = useCallback(
    (options: {
      replaceThread: boolean;
      userPrompt?: string;
      showUserBubble?: boolean;
      showCompareIcon?: boolean;
      prefilledFromRecent?: boolean;
      loadingMessage?: string;
      interactionMode?: "interactive-slots" | "direct-pair";
      anchorChoiceGroupKey?: string;
      fromColdStart: boolean;
      openingSheetNow?: boolean;
      withThinkingOrb?: boolean;
      preselectedA?: BagProduct | null;
      preselectedB?: BagProduct | null;
    }) => {
      const {
        replaceThread,
        userPrompt = "Help me compare bags",
        showUserBubble = true,
        showCompareIcon,
        prefilledFromRecent = false,
        loadingMessage,
        interactionMode,
        anchorChoiceGroupKey,
        fromColdStart,
        openingSheetNow = false,
        withThinkingOrb,
        preselectedA = null,
        preselectedB = null,
      } = options;

      if (replaceThread) {
        resetSeenChatTurnIds();
      }

      const turnId = `compare-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const resolvedMode =
        interactionMode ??
        (preselectedA && preselectedB ? "direct-pair" : "interactive-slots");
      const isDirectPair = resolvedMode === "direct-pair";

      const newTurn: CompareThreadTurn = {
        kind: "compare",
        id: turnId,
        userPrompt,
        showUserBubble,
        showCompareIcon,
        prefilledFromRecent,
        loadingMessage:
          loadingMessage ??
          (prefilledFromRecent ? COMPARE_LOADING_COPY : undefined),
        anchorChoiceGroupKey,
        mode: resolvedMode,
        stage: isDirectPair ? "compared" : "loading",
        slotA: preselectedA,
        slotB: preselectedB,
        confirmSelectedOptions: isDirectPair ? ["compare-choices"] : [],
        followUpSelectedOptions: [],
        feedback: null,
      };

      setEnteredFromColdStart(fromColdStart);
      setIsInitialExchange(withThinkingOrb ?? (!isDirectPair && replaceThread));
      setIsInitialOpenStagger(openingSheetNow);
      setActiveView("thread");
      setFloatingVisible(false);
      setSheetOpen(true);
      setTurns((prev) => (replaceThread ? [newTurn] : [...prev, newTurn]));

      if (isDirectPair) {
        return;
      }

      // Let Loading entrance settle, then AnimatePresence mode="wait" exits Loading in sync with Orb before mounting Compare Slots!
      const openOffset = openingSheetNow ? 280 : 0;
      const startExitAt = openOffset + 1280;
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

  const enqueueOutfitTurn = useCallback(
    (options: {
      replaceThread: boolean;
      userPrompt?: string;
      showUserBubble?: boolean;
      anchorChoiceGroupKey?: string;
      fromColdStart: boolean;
      openingSheetNow?: boolean;
      withThinkingOrb?: boolean;
    }) => {
      const {
        replaceThread,
        userPrompt = OUTFIT_STARTER_PROMPT,
        showUserBubble = true,
        anchorChoiceGroupKey,
        fromColdStart,
        openingSheetNow = false,
        withThinkingOrb,
      } = options;

      if (replaceThread) {
        resetSeenChatTurnIds();
      }

      const turnId = `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newTurn: OutfitThreadTurn = {
        kind: "outfit",
        id: turnId,
        userPrompt,
        showUserBubble,
        anchorChoiceGroupKey,
        stage: "loading",
        selfiePicked: false,
        selectedOptions: [],
        feedback: null,
      };

      setEnteredFromColdStart(fromColdStart);
      setIsInitialExchange(withThinkingOrb ?? replaceThread);
      setIsInitialOpenStagger(openingSheetNow);
      setActiveView("thread");
      setFloatingVisible(false);
      setSheetOpen(true);
      setTurns((prev) => (replaceThread ? [newTurn] : [...prev, newTurn]));

      const openOffset = openingSheetNow ? 280 : 0;
      const startExitAt = openOffset + 1280;
      scheduleTimer(() => {
        setIsInitialExchange(false);
        setTurns((prev) =>
          prev.map((t): ThreadTurn =>
            t.id === turnId && t.kind === "outfit"
              ? { ...t, stage: "awaiting-selfie" as const }
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

      const wasTypingFocused = isTypingFocusedRef.current;
      if (wasTypingFocused) {
        isTypingFocusedRef.current = false;
        setIsTypingFocused(false);
        setIsExpandingFromSubmit(true);
      }

      clearPendingTimers();
      if (wasTypingFocused) {
        scheduleTimer(() => {
          setIsExpandingFromSubmit(false);
        }, TYPING_STAGE_SETTLE_MS);
      }
      setInputValue("");
      setPickerTarget(null);
      setDetailBag(null);

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

        if (
          lower === "match a bag to my outfit" ||
          lower.includes("match my look") ||
          lower.includes("match a bag to my") ||
          lower.includes("match my outfit")
        ) {
          enqueueOutfitTurn({
            replaceThread,
            userPrompt: trimmed,
            showUserBubble,
            anchorChoiceGroupKey,
            fromColdStart,
          });
          return;
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

      // If currently on Cold Start (and not already collapsed in Focused Typing View), exit Cold Start FIRST, then enter Thread!
      if (
        (activeView === "cold-start" || activeView === "exiting-cold-start") &&
        sheetOpen &&
        !wasTypingFocused
      ) {
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
      enqueueOutfitTurn,
      enteredFromColdStart,
      scheduleTimer,
      sheetOpen,
    ]
  );

  const handleOpenFromContentSpot = useCallback(
    (mode: ContentSpotMode, prompt?: string) => {
      clearPendingTimers();
      closingSheetRef.current = false;
      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      setIsExpandingFromSubmit(false);
      setPickerTarget(null);
      setDetailBag(null);
      setSelectedStarterId(null);
      setCraftSessionId((s) => s + 1);
      setOrbBloomKey((k) => k + 1);
      setFloatingVisible(false);

      const trimmedPrompt = prompt?.trim();

      if (trimmedPrompt) {
        const lower = trimmedPrompt.toLowerCase();
        const isComparePrompt =
          mode === "compare" &&
          (lower === COMPARE_TABBYS_PROMPT.toLowerCase() ||
            lower.startsWith("compare "));

        if (isComparePrompt) {
          const compareCopy = getCompareSpotCopy(recentlyViewedBags);
          enqueueCompareTurn({
            replaceThread: true,
            userPrompt: trimmedPrompt,
            showUserBubble: true,
            showCompareIcon: true,
            prefilledFromRecent: true,
            loadingMessage: compareCopy.assistantPreview,
            interactionMode: "interactive-slots",
            fromColdStart: false,
            openingSheetNow: true,
            withThinkingOrb: true,
            preselectedA: recentlyViewedBags[0],
            preselectedB: recentlyViewedBags[1],
          });
          return;
        }

        submitPrompt(trimmedPrompt, {
          replaceThread: true,
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
        });
        return;
      }

      if (mode === "prompted") {
        submitPrompt(STATEMENT_PROMPT, {
          replaceThread: true,
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
        });
      } else if (mode === "compare") {
        const compareCopy = getCompareSpotCopy(recentlyViewedBags);
        enqueueCompareTurn({
          replaceThread: true,
          userPrompt: compareCopy.userPrompt,
          showUserBubble: true,
          showCompareIcon: true,
          prefilledFromRecent: true,
          loadingMessage: compareCopy.assistantPreview,
          interactionMode: "interactive-slots",
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
          preselectedA: recentlyViewedBags[0],
          preselectedB: recentlyViewedBags[1],
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
    [clearPendingTimers, enqueueCompareTurn, recentlyViewedBags, submitPrompt]
  );

  const handleTriggerStoriesAction = useCallback(
    (action: StoriesSpotAction) => {
      clearPendingTimers();
      closingSheetRef.current = false;
      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      setIsExpandingFromSubmit(false);
      setPickerTarget(null);
      setDetailBag(null);
      setSelectedStarterId(null);
      setCraftSessionId((s) => s + 1);
      setOrbBloomKey((k) => k + 1);
      setFloatingVisible(false);

      if (action.kind === "prompt") {
        submitPrompt(action.prompt, {
          replaceThread: true,
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
        });
      } else if (action.kind === "outfit") {
        enqueueOutfitTurn({
          replaceThread: true,
          userPrompt: OUTFIT_STARTER_PROMPT,
          showUserBubble: true,
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
        });
      } else if (action.kind === "compare") {
        const compareCopy = getCompareSpotCopy(action.pair);
        enqueueCompareTurn({
          replaceThread: true,
          userPrompt: compareCopy.userPrompt,
          showUserBubble: true,
          showCompareIcon: true,
          prefilledFromRecent: true,
          interactionMode: "interactive-slots",
          fromColdStart: false,
          openingSheetNow: true,
          withThinkingOrb: true,
          preselectedA: action.pair[0],
          preselectedB: action.pair[1],
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
    [clearPendingTimers, enqueueCompareTurn, enqueueOutfitTurn, submitPrompt]
  );

  const handleNewChat = useCallback(() => {
    clearPendingTimers();
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    setIsExpandingFromSubmit(false);
    inputRef.current?.blur();
    setPickerTarget(null);
    setDetailBag(null);
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
    closingSheetRef.current = true;
    inputRef.current?.blur();
    setPickerTarget(null);
    setDetailBag(null);
    setHasClosedSheet(true);
    setSheetOpen(false);
    scheduleTimer(() => {
      closingSheetRef.current = false;
      isTypingFocusedRef.current = false;
      setIsTypingFocused(false);
      setIsExpandingFromSubmit(false);
      if (turns.length === 0) {
        setSelectedStarterId(null);
        setActiveView("cold-start");
      }
      setFloatingVisible(true);
    }, 660);
  }, [clearPendingTimers, scheduleTimer, turns.length]);

  const handleResumeChat = useCallback(() => {
    clearPendingTimers();
    closingSheetRef.current = false;
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    setIsExpandingFromSubmit(false);
    setFloatingVisible(false);
    scheduleTimer(() => {
      if (hasResumableSession) {
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
  }, [clearPendingTimers, hasResumableSession, scheduleTimer]);

  const handleOpenFreshFromFab = useCallback(() => {
    clearPendingTimers();
    closingSheetRef.current = false;
    isTypingFocusedRef.current = false;
    setIsTypingFocused(false);
    setIsExpandingFromSubmit(false);
    setFloatingVisible(false);
    scheduleTimer(() => {
      if (hasResumableSession) {
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
  }, [clearPendingTimers, hasResumableSession, scheduleTimer]);

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
        } else if (action.id === "outfit") {
          enqueueOutfitTurn({
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
    [
      clearPendingTimers,
      enqueueChatTurn,
      enqueueCompareTurn,
      enqueueOutfitTurn,
      scheduleTimer,
    ]
  );

  const handleSelectTurnOption = useCallback(
    (turnId: string, option: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      if (targetIdx === -1) return;
      const targetTurn = turns[targetIdx];
      if (
        (targetTurn.kind !== "chat" && targetTurn.kind !== "outfit") ||
        targetTurn.selectedOptions.includes(option)
      ) {
        return;
      }
      const hasTurnsBelow = targetIdx < turns.length - 1;

      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId && (t.kind === "chat" || t.kind === "outfit")
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

  const handlePickSelfie = useCallback((turnId: string) => {
    setTurns((prev) =>
      prev.map((t): ThreadTurn =>
        t.id === turnId && t.kind === "outfit" && !t.selfiePicked
          ? {
              ...t,
              selfiePicked: true,
              stage: "matched" as const,
            }
          : t
      )
    );
  }, []);

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
      recordViewedBag(bag);
      submitPrompt(`Tell me more about the ${bag.shortName}`, {
        replaceThread: false,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [recordViewedBag, submitPrompt]
  );

  const handleToggleBagItem = useCallback((bag: BagProduct) => {
    setBagIdsInCart((prev) =>
      prev.includes(bag.id)
        ? prev.filter((id) => id !== bag.id)
        : [...prev, bag.id]
    );
  }, []);

  const handleViewBagDetails = useCallback(
    (bag: BagProduct) => {
      recordViewedBag(bag);
      setPickerTarget(null);
      setDetailBag(bag);
    },
    [recordViewedBag]
  );

  const handleSelectBagFromPlp = useCallback(
    (bag: BagProduct) => {
      recordViewedBag(bag);
      setPickerTarget(null);
      setDetailBag(bag);
    },
    [recordViewedBag]
  );

  const handleCompareFromDetail = useCallback(
    (bag: BagProduct) => {
      setDetailBag(null);
      const openingFromStorefront = !sheetOpen;
      scheduleTimer(() => {
        enqueueCompareTurn({
          replaceThread: openingFromStorefront,
          userPrompt: `Compare ${bag.shortName} with another bag`,
          showUserBubble: true,
          fromColdStart: !openingFromStorefront,
          openingSheetNow: openingFromStorefront,
          withThinkingOrb: openingFromStorefront,
          preselectedA: bag,
        });
      }, 220);
    },
    [enqueueCompareTurn, scheduleTimer, sheetOpen]
  );

  const handleOpenComparePicker = useCallback((turnId: string, slot: "A" | "B") => {
    setDetailBag(null);
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
        targetTurn.followUpSelectedOptions.includes("how-to-wear") ||
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
                followUpSelectedOptions: [
                  ...t.followUpSelectedOptions,
                  "how-to-wear" as const,
                ],
              }
            : t
        )
      );
      submitPrompt(HOW_TO_WEAR_PROMPT, {
        replaceThread: false,
        showUserBubble: hasTurnsBelow,
        anchorChoiceGroupKey: `${turnId}:followup`,
        fromColdStart: true,
        withThinkingOrb: false,
      });
    },
    [submitPrompt, turns]
  );

  const handleSelectUgcClip = useCallback(
    (turnId: string, _clipId: string) => {
      const targetIdx = turns.findIndex((t) => t.id === turnId);
      const hasTurnsBelow = targetIdx !== -1 && targetIdx < turns.length - 1;

      submitPrompt(UGC_PLAY_PROMPT, {
        replaceThread: false,
        showUserBubble: hasTurnsBelow,
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
    /* Safari 26 toolbar sampling: keep fixed shell bg-transparent and put surfaces on absolute inset-0 child */
    <Box
      as="main"
      className="mobile-viewport-lock bg-transparent isolate"
    >
      <div
        ref={mainRef}
        className="absolute inset-0 bg-surface overflow-hidden isolate select-none stack-grid"
      >
        {/* Layer 1: Scrollable Handbags PLP + Inline Content Spot */}
        <Layer className="w-full h-full overflow-hidden isolate z-0">
          <PlpListing
            scrollRef={plpScrollRef}
            contentSpotMode={contentSpotMode}
            contentSpotDismissed={contentSpotDismissed}
            storiesVariant={isStoriesVariant}
            storiesPaused={sheetOpen || Boolean(detailBag)}
            bagCount={bagIdsInCart.length}
            recentComparePair={recentlyViewedBags}
            onOpenAssistant={handleOpenFromContentSpot}
            onTriggerStoriesAction={handleTriggerStoriesAction}
            onDismissContentSpot={() => setContentSpotDismissed(true)}
            onSelectBagFromGrid={handleSelectBagFromPlp}
          />
        </Layer>

        {/* Layer 2: Closed Floating Controls (Coach AI Pill + FABs) */}
        <Layer className="w-full h-full flex flex-col justify-end pointer-events-none isolate z-10">
          <ClosedFloatingOverlay
            visible={!sheetOpen && floatingVisible && !detailBag}
            showResumePill={resumePillReady && shouldShowRecoveryPill}
            contentSpotMode={contentSpotMode}
            contentSpotDismissed={contentSpotDismissed}
            scenarioSelectorDismissed={scenarioSelectorDismissed}
            hideScenarioSelector={isStoriesVariant}
            onSelectSpotMode={handleSelectSpotMode}
            onDismissScenarioSelector={() => setScenarioSelectorDismissed(true)}
            onResumeChat={handleResumeChat}
            onScrollTop={handleScrollPlpTop}
            onOpenFreshChat={handleOpenFreshFromFab}
          />
        </Layer>

        {/* Storefront Product Detail Modal when tapping products on PLP */}
        <Layer className="w-full h-full min-h-0 pointer-events-none isolate z-30 stack-grid grid-rows-1 overflow-hidden">
          <AnimatePresence>
            {!sheetOpen && detailBag ? (
              <ProductDetailModal
                key={`plp-detail-${detailBag.id}`}
                bag={detailBag}
                isInBag={bagIdsInCart.includes(detailBag.id)}
                onToggleBag={handleToggleBagItem}
                onCompareBag={handleCompareFromDetail}
                onClose={() => setDetailBag(null)}
              />
            ) : null}
          </AnimatePresence>
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
              isTypingFocused={isTypingFocused}
              isExpandingFromSubmit={isExpandingFromSubmit}
              staggerChrome={isInitialOpenStagger}
              showNewChat={showNewChat}
              onNewChat={handleNewChat}
              onClose={handleCloseSheet}
              onTypingFocusChange={handleTypingFocusChange}
              onDismissTyping={handleDismissTyping}
              inputRef={inputRef}
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
                    recentBags={recentlyViewedBags}
                    onPickBag={handlePickCompareBag}
                    onClose={() => setPickerTarget(null)}
                  />
                ) : sheetOpen && detailBag ? (
                  <ProductDetailModal
                    key={`detail-${detailBag.id}`}
                    bag={detailBag}
                    isInBag={bagIdsInCart.includes(detailBag.id)}
                    onToggleBag={handleToggleBagItem}
                    onCompareBag={handleCompareFromDetail}
                    onClose={() => setDetailBag(null)}
                  />
                ) : null
              }
            >
              <LayerGrid className="w-full h-full min-h-0 grid-rows-1 overflow-visible">
                {/* Persistent WebGL LiquidOrb (Forge glass bead): Motion owns glide / blur exit */}
                <Layer className="self-start w-full pointer-events-none z-10 overflow-visible">
                  <Suspense fallback={null}>
                    <LiquidOrb
                      stageState={orbStageState}
                      bloomKey={orbBloomKey}
                      staggerEntrance={isInitialOpenStagger}
                      hiddenForTyping={isTypingFocused}
                    />
                  </Suspense>
                </Layer>

                {/* Stage Views: strict mode="wait" guarantees exiting view finishes before next view enters */}
                <Layer className="w-full h-full min-h-0 z-20 overflow-visible">
                  <LayerGrid className="w-full h-full min-h-0 grid-rows-1 overflow-visible">
                    <AnimatePresence
                      mode={isExpandingFromSubmit ? "sync" : "wait"}
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
                          exit={
                            isExpandingFromSubmit
                              ? { opacity: 0, transition: { duration: 0 } }
                              : {
                                  opacity: 1,
                                  transition: {
                                    duration: COLD_START_EXIT_DURATION,
                                    ease: EASE_PREMIUM,
                                  },
                                }
                          }
                          className="stack-cell w-full h-full min-h-0 overflow-visible"
                        >
                          <ColdStartView
                            selectedStarterId={selectedStarterId}
                            sheetOpenStagger={isInitialOpenStagger}
                            hiddenForTyping={isTypingFocused}
                            alreadyHidden={isExpandingFromSubmit}
                            onSelectStarter={handleSelectStarter}
                          />
                        </motion.div>
                      )}

                      {activeView === "thread" && (
                        <motion.div
                          key={`stage-thread-${craftSessionId}`}
                          initial={
                            isExpandingFromSubmit
                              ? { opacity: 0, scale: 0.985, y: 8 }
                              : { opacity: 1 }
                          }
                          animate={
                            isTypingFocused
                              ? {
                                  opacity: 0,
                                  scale: 0.985,
                                  y: -6,
                                  transition: {
                                    duration: 0.19,
                                    ease: EASE_PREMIUM,
                                  },
                                }
                              : {
                                  opacity: 1,
                                  scale: 1,
                                  y: 0,
                                  transition: {
                                    duration: 0.34,
                                    delay: isExpandingFromSubmit ? 0.12 : 0.15,
                                    ease: EASE_PREMIUM,
                                  },
                                }
                          }
                          exit={{
                            opacity: 0,
                            filter: "blur(3px)",
                            scale: 0.95,
                            y: 12,
                            transition: { duration: DURATION_EXIT, ease: EASE_PREMIUM },
                          }}
                          className={clsx(
                            "stack-cell w-full h-full min-h-0 overflow-visible transition-stage-inset motion-reduce:transition-none will-change-transform",
                            orbStageState === "thinking" ? "pt-144" : "pt-0"
                          )}
                        >
                          <ChatThreadView
                            turns={turns}
                            steadyStage={enteredFromColdStart}
                            sheetOpenStagger={isInitialOpenStagger}
                            bagIdsInCart={bagIdsInCart}
                            onSelectOption={handleSelectTurnOption}
                            onSelectUgcClip={handleSelectUgcClip}
                            onFeedback={handleTurnFeedback}
                            onInspectBag={handleInspectBagFromCarousel}
                            onToggleBagItem={handleToggleBagItem}
                            onViewBagDetails={handleViewBagDetails}
                            onPickSelfie={handlePickSelfie}
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
      </div>
    </Box>
  );
}

export default App;
