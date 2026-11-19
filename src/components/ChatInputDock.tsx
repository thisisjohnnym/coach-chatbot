import {
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import clsx from "clsx";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";

export interface ChatInputDockProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (prompt: string) => void;
  onVoiceSample?: () => void;
  focused?: boolean;
  keyboardOpen?: boolean;
  onFocusChange?: (focused: boolean) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

export function ChatInputDock({
  value,
  onChange,
  onSubmit,
  onVoiceSample,
  focused = false,
  keyboardOpen = false,
  onFocusChange,
  inputRef,
  disabled = false,
}: ChatInputDockProps) {
  const fallbackRef = useRef<HTMLTextAreaElement | null>(null);
  const resolvedRef = inputRef ?? fallbackRef;
  const hasPrompt = value.trim().length > 0;

  const triggerSubmit = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    resolvedRef.current?.blur();
  };

  const handleFormSubmit = (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    triggerSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      triggerSubmit();
    }
  };

  const handleDockMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    const target = e.target as HTMLElement | null;
    if (!target || target === resolvedRef.current) return;

    // Keep textarea focus stable when pressing dock chrome/buttons; focus textarea when tapping dock surface
    e.preventDefault();
    if (!target.closest("button")) {
      resolvedRef.current?.focus();
    }
  };

  const handleVoiceClick = () => {
    if (disabled) return;
    resolvedRef.current?.focus();
    onVoiceSample?.();
  };

  return (
    <Stack
      as="footer"
      onMouseDown={handleDockMouseDown}
      className={clsx(
        "w-full bg-surface-dock border-t border-x border-border-dock rounded-t-dock backdrop-blur-md transition-dock-focus motion-reduce:transition-none cursor-text",
        focused
          ? clsx(
              "px-20 pt-20 gap-28",
              keyboardOpen ? "pb-keyboard-dock" : "pb-safe-dock-focused",
            )
          : "px-16 pt-18 pb-safe-dock gap-16",
      )}
    >
      <Box
        as="form"
        onSubmit={handleFormSubmit}
        className="flex flex-row items-start justify-between gap-12 w-full"
      >
        <Box className="flex-1 min-w-0 overflow-hidden pt-2">
          <textarea
            ref={resolvedRef}
            id="coach-ai-prompt"
            name="prompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => {
              if (document.activeElement === resolvedRef.current) return;
              onFocusChange?.(false);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={2}
            aria-label="Ask our AI a question or describe what you are looking for"
            placeholder="Ask our AI a question or describe what you are looking for"
            className="block w-full min-h-38 max-h-96 bg-transparent border-0 outline-none resize-none ios-safe-prompt-field text-ink-inverse tracking-xs placeholder:text-ink-inverse-soft select-text disabled:opacity-60"
          />
        </Box>

        <Cluster className="gap-6 shrink-0">
          <Box
            as="button"
            type="button"
            onClick={handleVoiceClick}
            disabled={disabled}
            aria-label="Voice input"
            className="w-40 h-40 flex items-center justify-center rounded-pill press-scale motion-reduce:transition-none disabled:opacity-50"
          >
            <img
              src="/assets/figma/icon-mic.svg"
              alt=""
              width={20}
              height={20}
              className="w-20 h-20"
            />
          </Box>

          <LayerGrid
            as="button"
            type="submit"
            disabled={disabled}
            aria-label="Send message"
            className="w-46 h-40 place-items-center isolate press-scale motion-reduce:transition-none disabled:opacity-50"
          >
            <Layer
              as="span"
              className={clsx(
                "z-0 w-44 h-36 mt-4 rounded-pill send-orb-halo pointer-events-none motion-reduce:transition-none",
                hasPrompt ? "opacity-100 scale-110" : "opacity-60 scale-95",
              )}
            />
            <Layer
              as="span"
              className="z-10 w-46 h-40 rounded-pill bg-surface flex items-center justify-center"
            >
              <img
                src="/assets/figma/icon-chevron-send.svg"
                alt=""
                width={16}
                height={16}
                className="w-16 h-16 rotate-90 invert"
              />
            </Layer>
          </LayerGrid>
        </Cluster>
      </Box>

      <Box className="text-micro text-ink-subtle text-center tracking-xs leading-none">
        You’re asking Coach’s AI assistant. It can make mistakes
      </Box>
    </Stack>
  );
}
