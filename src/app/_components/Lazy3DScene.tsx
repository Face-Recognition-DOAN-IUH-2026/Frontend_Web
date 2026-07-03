"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

interface Lazy3DSceneProps {
  children: ReactNode;
  height?: number | string;
  placeholder?: ReactNode;
  sx?: SxProps<Theme>;
  /** Margin before the element enters viewport (default: "200px") */
  rootMargin?: string;
}

function BlurPlaceholder({ height }: { height: number | string }) {
  return (
    <Box
      sx={{
        width: "100%",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        backgroundImage:
          "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.1) 100%)",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
          "&::after": {
            content: '""',
            display: "block",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "3px solid",
            borderColor: "divider",
            borderTopColor: "primary.main",
            animation: "spin 0.8s linear infinite",
          },
          "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
        }}
      />
    </Box>
  );
}

export default function Lazy3DScene({
  children,
  height = 400,
  placeholder,
  sx,
  rootMargin = "200px",
}: Lazy3DSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <Box ref={ref} sx={{ width: "100%", height, position: "relative", ...sx }}>
      {inView ? children : placeholder || <BlurPlaceholder height={height} />}
    </Box>
  );
}
