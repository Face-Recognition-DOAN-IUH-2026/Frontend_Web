"use client";

import React, { useRef } from "react";
import { Box, TextField, useTheme } from "@mui/material";

interface OtpPinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export default function OtpPinInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  error = false,
}: OtpPinInputProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      // User cleared slot
      const chars = value.split("");
      chars[index] = "";
      onChange(chars.join("").slice(0, length));
      return;
    }

    // Single digit input
    const singleDigit = rawVal.slice(-1);
    const chars = value.padEnd(length, " ").split("");
    chars[index] = singleDigit;
    const nextVal = chars.join("").trimEnd();
    onChange(nextVal);

    // Auto advance to next slot
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current is empty, delete previous and move back
        const chars = value.split("");
        chars[index - 1] = "";
        onChange(chars.join(""));
        inputRefs.current[index - 1]?.focus();
      } else if (digits[index]) {
        // Clear current
        const chars = value.split("");
        chars[index] = "";
        onChange(chars.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedData) return;

    const trimmed = pastedData.slice(0, length);
    onChange(trimmed);

    // Focus last filled or next slot
    const targetIdx = Math.min(trimmed.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 1, sm: 1.5 },
        justifyContent: "center",
        alignItems: "center",
        my: 1,
      }}
    >
      {digits.map((digit, idx) => {
        const isFilled = Boolean(digit);
        return (
          <TextField
            key={idx}
            inputRef={(el) => {
              inputRefs.current[idx] = el;
            }}
            value={digit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(idx, e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={disabled}
            autoFocus={autoFocus && idx === 0}
            slotProps={{
              htmlInput: {
                maxLength: 1,
                inputMode: "numeric",
                pattern: "[0-9]*",
                autoComplete: "one-time-code",
                style: {
                  textAlign: "center",
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  fontFamily: "'Space Grotesk', monospace, sans-serif",
                  padding: 0,
                  height: "56px",
                  width: "48px",
                  letterSpacing: "-0.02em",
                },
              },
            }}
            sx={{
              width: { xs: 44, sm: 50 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: isFilled
                  ? isDark
                    ? "rgba(56, 189, 248, 0.08)"
                    : "rgba(139, 0, 0, 0.04)"
                  : isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "& fieldset": {
                  borderWidth: isFilled ? 2 : 1.5,
                  borderColor: error
                    ? theme.palette.error.main
                    : isFilled
                    ? isDark
                      ? "#38BDF8"
                      : theme.palette.primary.main
                    : isDark
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.18)",
                },
                "&:hover fieldset": {
                  borderColor: error
                    ? theme.palette.error.main
                    : theme.palette.primary.main,
                },
                "&.Mui-focused": {
                  boxShadow: error
                    ? `0 0 0 3px ${theme.palette.error.light}40`
                    : `0 0 0 4px ${isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(139, 0, 0, 0.12)"}`,
                  "& fieldset": {
                    borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
                    borderWidth: 2,
                  },
                },
              },
            }}
          />
        );
      })}
    </Box>
  );
}
