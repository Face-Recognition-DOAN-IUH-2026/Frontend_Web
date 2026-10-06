"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

type ColorModePreference = "auto" | "light" | "dark";
type ReducedMotionPreference = "reduce" | "no-preference" | "unknown";

type ColorModeContextValue = {
  mode: PaletteMode;
  effectiveMode: PaletteMode;
  preference: ColorModePreference;
  reducedMotion: ReducedMotionPreference;
  toggleMode: () => void;
  setMode: (mode: ColorModePreference) => void;
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "dark",
  effectiveMode: "dark",
  preference: "auto",
  reducedMotion: "unknown",
  toggleMode: () => {},
  setMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

function getSystemPreference(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getReducedMotionPreference(): ReducedMotionPreference {
  if (typeof window === "undefined") return "unknown";
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mq.matches ? "reduce" : "no-preference";
}

function buildTheme(mode: PaletteMode, reducedMotion: ReducedMotionPreference) {
  const dark = mode === "dark";
  const shouldReduceMotion = reducedMotion === "reduce";
  const transitionDuration = shouldReduceMotion ? 0 : 200;

  // ── IUH Brand Identity Colors ─────────────────────────────────────────────
  // Primary Accent: Đỏ đô IUH (#8B0000 / #900C3F)
  // Secondary Accent: Vàng hoàng gia / Vàng đồng (#D4AF37 / #E6A100)
  // Navy Accent: Xanh Navy công nghiệp (#0A2540)
  // Background: Xám sáng (#F8F9FA)
  // ─────────────────────────────────────────────────────────────────────────
  const brand = {
    iuhRed:       "#8B0000",   // Primary — IUH Red
    iuhRedDark:   "#700000",   // Primary dark / hover
    iuhRedLight:  "#FFF5F5",   // Primary container light
    iuhGold:      "#D4AF37",   // Secondary — IUH Royal Gold
    iuhGoldDark:  "#B38E22",   // Secondary dark
    iuhGoldLight: "#FFF8E7",   // Secondary container light
    iuhNavy:      "#0A2540",   // Navy accent
    iuhNavyDark:  "#061729",   // Dark Navy
    iuhNavyLight: "#E8EEF5",   // Navy container light
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brand.iuhRed,
        dark: brand.iuhRedDark,
        light: dark ? "#A31D1D" : "#900C3F",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: brand.iuhGold,
        dark: brand.iuhGoldDark,
        light: "#E6A100",
        contrastText: dark ? "#1C1917" : "#0A2540",
      },
      success: {
        main: dark ? "#34D399" : "#198754",
        contrastText: "#FFFFFF",
      },
      warning: {
        main: dark ? "#FBBF24" : "#D97706",
        contrastText: "#FFFFFF",
      },
      error: {
        main: dark ? "#F87171" : "#8B0000",
        contrastText: "#FFFFFF",
      },
      info: {
        main: dark ? "#38BDF8" : brand.iuhNavy,
        contrastText: "#FFFFFF",
      },
      background: {
        default: dark ? "#071524" : "#F8F9FA",
        paper:   dark ? "#0C1E32" : "#FFFFFF",
      },
      text: {
        primary:   dark ? "#F8F9FA" : "#0A2540",
        secondary: dark ? "#94A3B8" : "#4B5563",
        disabled:  dark ? "#64748B" : "#9CA3AF",
      },
      divider: dark ? "#1E3347" : "#DEE2E6",
      action: {
        hover:    dark ? "rgba(139, 0, 0, 0.12)" : "rgba(139, 0, 0, 0.06)",
        selected: dark ? "rgba(139, 0, 0, 0.20)" : "rgba(139, 0, 0, 0.12)",
      },
    },
    shape: {
      borderRadius: 4, // 2px - 4px industrial crisp border radius
    },
    typography: {
      fontFamily: "'Source Sans 3', sans-serif",
      h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.03em" },
      h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "-0.01em" },
      h4: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
      h5: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
      h6: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: {
        fontWeight: 600,
        textTransform: "none",
        letterSpacing: "0.01em",
      },
      caption: { letterSpacing: "0.02em" },
      overline: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "0.08em" },
    },
    transitions: {
      duration: {
        shortest: shouldReduceMotion ? 0 : 150,
        shorter:  shouldReduceMotion ? 0 : 200,
        short:    shouldReduceMotion ? 0 : 250,
        standard: shouldReduceMotion ? 0 : 300,
        complex:  shouldReduceMotion ? 0 : 375,
        enteringScreen: shouldReduceMotion ? 0 : 225,
        leavingScreen:  shouldReduceMotion ? 0 : 195,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "html, body": {
            scrollBehavior: "smooth",
          },
          body: {
            backgroundColor: dark ? "#0D1B2A" : "#F0F6FB",
            fontFamily: "'Source Sans 3', sans-serif",
          },
          // Scrollbar styling
          "::-webkit-scrollbar": { width: "6px", height: "6px" },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            background: dark ? "#2A4A62" : "#C2D8E8",
            borderRadius: "3px",
          },
          "::-webkit-scrollbar-thumb:hover": {
            background: dark ? "#3B6180" : "#8BAFC7",
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "9px 22px",
            fontWeight: 600,
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1), box-shadow ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1), transform ${shouldReduceMotion ? 0 : 90}ms cubic-bezier(0.4,0,0.2,1)`,
            "&:hover": {
              boxShadow: "0 4px 12px rgba(30, 96, 145, 0.25)",
            },
            "&:active": {
              transform: shouldReduceMotion ? "none" : "scale(0.97)",
            },
          },
          sizeLarge: { padding: "12px 30px", fontSize: "1rem" },
          sizeSmall: { padding: "6px 14px", fontSize: "0.8125rem" },
          contained: {
            "&:hover": {
              boxShadow: "0 6px 16px rgba(30, 96, 145, 0.30)",
            },
          },
          outlined: {
            borderWidth: "1.5px",
            "&:hover": { borderWidth: "1.5px" },
          },
        },
      },

      MuiTextField: {
        defaultProps: { variant: "outlined", fullWidth: true },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: `border-color ${transitionDuration}ms ease, box-shadow ${transitionDuration}ms ease`,
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${dark ? "rgba(30,96,145,0.28)" : "rgba(30,96,145,0.16)"}`,
            },
            "&.Mui-error.Mui-focused": {
              boxShadow: "0 0 0 3px rgba(220,38,38,0.16)",
            },
          },
          input: { padding: "12px 16px" },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: dark
              ? "0 4px 20px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)"
              : "0 2px 12px rgba(30,96,145,0.08), 0 1px 3px rgba(30,96,145,0.06)",
            border: "1px solid",
            borderColor: dark ? "rgba(30,96,145,0.18)" : "rgba(30,96,145,0.10)",
            backgroundImage: "none",
            transition: `box-shadow ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1)`,
            "&:hover": {
              boxShadow: dark
                ? "0 8px 28px rgba(0,0,0,0.5)"
                : "0 6px 20px rgba(30,96,145,0.14)",
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          rounded: { borderRadius: 14 },
          elevation1: {
            boxShadow: dark
              ? "0 2px 8px rgba(0,0,0,0.35)"
              : "0 1px 6px rgba(30,96,145,0.08)",
          },
          elevation8: {
            boxShadow: dark
              ? "0 8px 24px rgba(0,0,0,0.5)"
              : "0 8px 24px rgba(30,96,145,0.14)",
          },
          elevation24: {
            boxShadow: dark
              ? "0 20px 50px rgba(0,0,0,0.6)"
              : "0 20px 50px rgba(30,96,145,0.18)",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            fontSize: "0.78rem",
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1)`,
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1), color ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1)`,
          },
        },
      },

      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: "0.75rem",
            fontWeight: 500,
            backgroundColor: dark ? "#1E3347" : "#1A2744",
            color: "#EEF2F7",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          },
          arrow: {
            color: dark ? "#1E3347" : "#1A2744",
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4,0,0.2,1), transform ${shouldReduceMotion ? 0 : 90}ms cubic-bezier(0.4,0,0.2,1)`,
            "&:active": {
              transform: shouldReduceMotion ? "none" : "scale(0.9)",
            },
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${dark ? "rgba(30,96,145,0.18)" : "rgba(30,96,145,0.12)"}`,
            backgroundImage: "none",
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: dark
              ? "0 24px 60px rgba(0,0,0,0.7)"
              : "0 24px 60px rgba(30,96,145,0.20)",
            backgroundImage: "none",
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: "1.2rem" },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "16px 24px" },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-head": {
              fontWeight: 700,
              fontSize: "0.78rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: dark ? "#8FA8BF" : "#4B6484",
              backgroundColor: dark ? "rgba(30,96,145,0.08)" : "rgba(30,96,145,0.05)",
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td": { borderBottom: 0 },
            "&.MuiTableRow-hover:hover": {
              backgroundColor: dark ? "rgba(30,96,145,0.08)" : "rgba(30,96,145,0.04)",
            },
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
          standard: {
            "& .MuiAlert-icon": {
              color: "inherit",
            },
          },
        },
      },

      MuiSnackbar: {
        styleOverrides: {
          root: {
            "& .MuiSnackbarContent-root": { borderRadius: 10 },
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4 },
          bar: { borderRadius: 4 },
        },
      },
    },
  });
}


const CYCLE_ORDER: ColorModePreference[] = ["auto", "light", "dark"];

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorModePreference>("auto");
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemPreference());
  const [reducedMotion, setReducedMotion] = useState<ReducedMotionPreference>("unknown");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const stored = window.localStorage.getItem("themeMode") as ColorModePreference | null;
    if (stored && CYCLE_ORDER.includes(stored)) {
      setPreferenceState(stored);
    }
  }, []);

  useEffect(() => {
    const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReducedMotion(getReducedMotionPreference());

    const handleDarkChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches ? "reduce" : "no-preference");
    };

    darkMq.addEventListener("change", handleDarkChange);
    motionMq.addEventListener("change", handleMotionChange);

    return () => {
      darkMq.removeEventListener("change", handleDarkChange);
      motionMq.removeEventListener("change", handleMotionChange);
    };
  }, []);

  const effectiveMode = useMemo(() => {
    if (preference === "auto") {
      return systemPrefersDark ? "dark" : "light";
    }
    return preference;
  }, [preference, systemPrefersDark]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveMode === "dark");
    document.documentElement.classList.toggle("light", effectiveMode === "light");
  }, [effectiveMode]);

  const toggleMode = useCallback(() => {
    setPreferenceState((current) => {
      const idx = CYCLE_ORDER.indexOf(current);
      const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
      window.localStorage.setItem("themeMode", next);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: ColorModePreference) => {
    window.localStorage.setItem("themeMode", mode);
    setPreferenceState(mode);
  }, []);

  const value = useMemo<ColorModeContextValue>(() => ({
    mode: effectiveMode,
    effectiveMode,
    preference,
    reducedMotion,
    toggleMode,
    setMode,
  }), [effectiveMode, preference, reducedMotion, toggleMode, setMode]);

  const theme = useMemo(() => buildTheme(effectiveMode, reducedMotion), [effectiveMode, reducedMotion]);

  const emotionCache = useMemo(() => createCache({ key: "mui", prepend: true }), []);

  return (
    <CacheProvider value={emotionCache}>
      <ColorModeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          {mounted && <CssBaseline />}
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </CacheProvider>
  );
}