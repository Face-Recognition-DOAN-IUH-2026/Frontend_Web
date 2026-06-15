"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleMode: () => void;
  setMode: (mode: PaletteMode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "dark",
  toggleMode: () => {},
  setMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

function buildTheme(mode: PaletteMode) {
  const dark = mode === "dark";

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
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
          },
        },
      },
    },
  });
}

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PaletteMode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("themeMode");
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.classList.toggle("light", mode === "light");
  }, [mode]);

  const value = useMemo<ColorModeContextValue>(() => ({
    mode,
    toggleMode: () => {
      setModeState((current) => {
        const next = current === "dark" ? "light" : "dark";
        window.localStorage.setItem("themeMode", next);
        return next;
      });
    },
    setMode: (next) => {
      window.localStorage.setItem("themeMode", next);
      setModeState(next);
    },
  }), [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
