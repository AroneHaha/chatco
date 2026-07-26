"use client";

import { useRef } from "react";

/**
 * Six single-character boxes that behave like one field.
 *
 * Typing advances, Backspace on an empty box steps back, arrows move, and a
 * pasted code fills the row — so the common case (copy the code out of the
 * email, paste it) takes one action instead of six. The value is always the
 * concatenated string; the parent never deals with per-box state.
 */
export default function CodeInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  length = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  length?: number;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    const box = inputs.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  };

  const write = (next: string) => {
    const digits = next.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    return digits;
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit;
    const next = write(chars.join("").trimEnd());

    if (index < length - 1 && next.length > index) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");

      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join("").trimEnd());
        return;
      }

      // Empty box — clear the one before it and step back.
      if (index > 0) {
        chars[index - 1] = "";
        onChange(chars.join("").trimEnd());
        focusBox(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = write(e.clipboardData.getData("text"));
    focusBox(digits.length >= length ? length - 1 : digits.length);
  };

  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label={`${length}-digit verification code`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-full h-14 sm:h-16 min-w-0 rounded-xl border text-center text-2xl font-bold tabular-nums transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${
            hasError
              ? "border-red-300 bg-red-50 text-red-600 focus:ring-red-200 focus:border-red-400"
              : value[i]
                ? "border-[#1A5FB4] bg-[#F0F7FF] text-[#071A2E] focus:ring-[#1A5FB4]/20"
                : "border-gray-200 bg-[#F8FAFC] text-[#071A2E] focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4]"
          }`}
        />
      ))}
    </div>
  );
}
