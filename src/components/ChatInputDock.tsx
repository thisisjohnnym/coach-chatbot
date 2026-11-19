import type { FormEvent, KeyboardEvent } from "react";
import clsx from "clsx";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";

export interface ChatInputDockProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (prompt: string) => void;
  onVoiceSample?: () => void;
  disabled?: boolean;
}

export function ChatInputDock({
  value,
  onChange,
  onSubmit,
  onVoiceSample,
  disabled = false,
}: ChatInputDockProps) {
  const hasPrompt = value.trim().length > 0;
  const triggerSubmit = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleFormSubmit = (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    triggerSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      triggerSubmit();
    }
  };

  return (
    <Stack
      as="footer"
      className="w-full bg-surface-dock border-t border-x border-border-dock rounded-t-dock px-16 pt-18 pb-safe-dock gap-16 backdrop-blur-md"
    >
      <Cluster as="form" onSubmit={handleFormSubmit} className="justify-between gap-8 w-full">
        <textarea
          id="coach-ai-prompt"
          name="prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={2}
          aria-label="Ask our AI a question or describe what you are looking for"
          placeholder="Ask our AI a question or describe what you are looking for"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none resize-none text-body text-ink-inverse tracking-xs placeholder:text-ink-inverse-soft leading-snug disabled:opacity-60"
        />

        <Cluster className="gap-8 shrink-0">
          <Box
            as="button"
            type="button"
            onClick={onVoiceSample}
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
      </Cluster>

      <Box className="text-micro text-ink-subtle text-center tracking-xs leading-none">
        You’re asking Coach’s AI assistant. It can make mistakes
      </Box>
    </Stack>
  );
}
