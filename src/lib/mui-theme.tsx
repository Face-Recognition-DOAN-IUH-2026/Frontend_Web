"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";

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

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? "#E0B75D" : "#7A540E",
        contrastText: dark ? "#0D111B" : "#FFFFFF",
      },
      secondary: {
        main: dark ? "#69C58A" : "#226B42",
        contrastText: dark ? "#08140D" : "#FFFFFF",
      },
      success: {
        main: dark ? "#69C58A" : "#226B42",
        contrastText: dark ? "#08140D" : "#FFFFFF",
      },
      warning: {
        main: dark ? "#E4BC62" : "#9A620F",
        contrastText: dark ? "#171003" : "#FFFFFF",
      },
      error: {
        main: dark ? "#FF8A8A" : "#B42318",
        contrastText: dark ? "#250707" : "#FFFFFF",
      },
      info: {
        main: dark ? "#8CC7FF" : "#175CD3",
        contrastText: dark ? "#061421" : "#FFFFFF",
      },
      background: {
        default: dark ? "#0D111B" : "#F6F8FB",
        paper: dark ? "#171C29" : "#FFFFFF",
      },
      text: {
        primary: dark ? "#F7F2E8" : "#101828",
        secondary: dark ? "#D8CEC0" : "#344054",
      },
      divider: dark ? "#3A4358" : "#D0D7E2",
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      h1: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 700 },
      h2: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 700 },
      h3: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 600 },
      h4: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 600 },
      h5: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 600 },
      h6: { fontFamily: "Outfit, Inter, sans-serif", fontWeight: 600 },
      button: { fontWeight: 700, textTransform: "none" },
    },
    transitions: {
      duration: {
        shortest: shouldReduceMotion ? 0 : 150,
        shorter: shouldReduceMotion ? 0 : 200,
        short: shouldReduceMotion ? 0 : 250,
        standard: shouldReduceMotion ? 0 : 300,
        complex: shouldReduceMotion ? 0 : 375,
        enteringScreen: shouldReduceMotion ? 0 : 225,
        leavingScreen: shouldReduceMotion ? 0 : 195,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: dark ? "#12151E" : "#F5F7FA",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1), 
                        box-shadow ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        transform ${shouldReduceMotion ? 0 : 100}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            "&:active": {
              transform: shouldReduceMotion ? "none" : "scale(0.97)",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: `box-shadow ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            transition: `opacity ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: `background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                        transform ${shouldReduceMotion ? 0 : 100}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            "&:active": {
              transform: shouldReduceMotion ? "none" : "scale(0.9)",
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            transition: `width ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
                         background-color ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            transition: `transform ${shouldReduceMotion ? 0 : 300}ms cubic-bezier(0.4, 0, 0.2, 1),
                         opacity ${shouldReduceMotion ? 0 : 300}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            transition: `transform ${shouldReduceMotion ? 0 : 200}ms cubic-bezier(0.4, 0, 0.2, 1),
                         opacity ${shouldReduceMotion ? 0 : 200}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          },
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

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}