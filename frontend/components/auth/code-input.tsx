"use client";

import { useRef } from "react";

/**
 * Six single-character boxes that behave like one field.
 *
 * Typing advances, Backspace on an empty box steps back, arrows move, and a
 * pasted code fills the row — so the common case (copy the code out of the
 * email, paste it) takes one action instead of six. The value is always the
 * concatenated string; the parent never deals with per-box state.
 *
 * `variant="admin"` re-skins the boxes for the admin shell (dark tonal
 * ladder, tighter corners, `admin-light:` styles) per the Two Registers rule;
 * the default is the public sign-up look.
 */
const SKINS = {
  public: {
    box: "h-14 sm:h-16 rounded-xl text-2xl font-bold",
    error: "border-red-300 bg-red-50 text-red-600 focus:ring-red-200 focus:border-red-400",
    filled: "border-[#1A5FB4] bg-[#F0F7FF] text-[#071A2E] focus:ring-[#1A5FB4]/20",
    empty: "border-gray-200 bg-[#F8FAFC] text-[#071A2E] focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4]",
  },
  admin: {
    box: "h-12 rounded-md text-xl font-semibold",
    error: "border-red-500/50 admin-light:border-red-300 bg-red-500/5 admin-light:bg-red-50 text-red-300 admin-light:text-red-700 focus:ring-red-400/30",
    filled: "border-[#62A0EA]/60 admin-light:border-[#1A5FB4] bg-[#0E1628] admin-light:bg-white text-white admin-light:text-slate-900 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/20",
    empty: "border-[#1E2D45] admin-light:border-[#CBD5E1] bg-[#0E1628] admin-light:bg-white text-white admin-light:text-slate-900 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/20 focus:border-[#62A0EA]/60 admin-light:focus:border-[#1A5FB4]",
  },
} as const;

export default function CodeInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  length = 6,
  variant = "public",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  length?: number;
  variant?: keyof typeof SKINS;
}) {
  const skin = SKINS[variant];
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
          className={`w-full min-w-0 border text-center tabular-nums transition-all focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${skin.box} ${
            hasError ? skin.error : value[i] ? skin.filled : skin.empty
          }`}
        />
      ))}
    </div>
  );
}
