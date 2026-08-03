"use client";

import { useRef } from "react";

export const CODE_LENGTH = 6;

interface Props {
  /** Names the group for a screen reader; the boxes themselves are numbered positions, not fields. */
  label: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * Six boxes rather than one field, because a six-digit code read off a lock screen is entered
 * digit by digit and a single field gives no feedback about how many are in.
 *
 * The value stays a plain string and the boxes are positions in it, so there is no way to end up
 * with a gap in the middle: every write is a splice, and the box that receives it is clamped to the
 * end of what has already been entered. That is what makes the paste and the platform's SMS
 * autofill work without a special case — both arrive as a run of digits in whichever box holds
 * focus, and both are spliced in from there.
 */
export default function OtpBoxes({ label, value, onChange, disabled, invalid, autoFocus }: Props) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => boxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();

  const write = (at: number, digits: string) => {
    if (!digits) return;
    const start = Math.min(at, value.length);
    const next = (value.slice(0, start) + digits + value.slice(start + digits.length)).slice(0, CODE_LENGTH);
    onChange(next);
    focus(start + digits.length);
  };

  const onInput = (i: number) => (e: React.FormEvent<HTMLInputElement>) => {
    const digits = e.currentTarget.value.replace(/\D/g, "");
    // The rendered value comes back from `value` on the next paint, so anything left here would be
    // a second copy of a digit already accounted for.
    e.currentTarget.value = "";
    write(i, digits);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    // A pasted code is the whole code, so it starts at the first box regardless of which one was
    // focused when it was dropped in.
    onChange(digits.slice(0, CODE_LENGTH));
    focus(digits.length);
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); focus(i + 1); return; }
    if (e.key !== "Backspace") return;

    e.preventDefault();
    if (!value.length) return;
    // On an empty box backspace reaches back for the last digit entered, which is where the caret
    // visually is after auto-advance.
    const at = i >= value.length ? value.length - 1 : i;
    onChange(value.slice(0, at) + value.slice(at + 1));
    focus(at);
  };

  const border = invalid ? "#A03A2B" : "#DCD1BC";

  return (
    <div role="group" aria-label={label} data-e="otpboxes" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: "8px" }}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { boxes.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`${label} ${i + 1}`}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onInput={onInput(i)}
          onPaste={onPaste}
          onKeyDown={onKeyDown(i)}
          onFocus={(e) => e.currentTarget.select()}
          data-e="otpbox"
          style={{ minWidth: "0", minHeight: "58px", padding: "12px 4px", border: `1px solid ${border}`, borderRadius: "14px", background: "#FFFFFF", fontSize: "24px", textAlign: "center", lineHeight: "1.4", color: "#161C2E", fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }}
        />
      ))}
    </div>
  );
}
