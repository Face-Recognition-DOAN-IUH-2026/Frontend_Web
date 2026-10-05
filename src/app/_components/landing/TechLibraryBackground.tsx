"use client";

import React, { useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  color: string;
}

export default function TechLibraryBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse tracking for interactive knowledge nodes
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 160,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Palette: IUH Navy, Cyber Cyan, Golden Amber, Crisp White
    const palette = isDark
      ? ["#38BDF8", "#818CF8", "#F59E0B", "#60A5FA", "#E2E8F0"]
      : ["#1E6091", "#0284C7", "#D97706", "#2563EB", "#0A2540"];

    // Initialize particles
    const particleCount = Math.min(Math.floor((width * height) / 18000), 75);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.25,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connections between close nodes
      const maxDistance = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * (isDark ? 0.22 : 0.14);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isDark
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(30, 96, 145, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction (gentle attraction / highlight)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let currentAlpha = p.baseAlpha;
        let currentRadius = p.radius;

        if (dist < mouse.radius) {
          const factor = (1 - dist / mouse.radius);
          currentAlpha = Math.min(1, p.baseAlpha + factor * 0.5);
          currentRadius = p.radius + factor * 1.5;

          // Connect to mouse
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = isDark
            ? `rgba(245, 158, 11, ${factor * 0.35})`
            : `rgba(217, 119, 6, ${factor * 0.25})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        // Glow ring around nodes
        if (p.radius > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = currentAlpha * 0.25;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        bgcolor: isDark ? "#071321" : "#F4F7FB",
        transition: "background-color 0.4s ease",
      }}
    >
      {/* ── 1. Animated Gradient Mesh Blobs ──────────────────────────────── */}
      <Box
        sx={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: { xs: "380px", md: "650px" },
          height: { xs: "380px", md: "650px" },
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, rgba(30, 96, 145, 0.08) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(30, 96, 145, 0.16) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)",
          filter: "blur(60px)",
          animation: "meshFloat1 22s ease-in-out infinite alternate",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          top: "30%",
          left: "-12%",
          width: { xs: "320px", md: "580px" },
          height: { xs: "320px", md: "580px" },
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, rgba(139, 0, 0, 0.06) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(217, 119, 6, 0.12) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 75%)",
          filter: "blur(70px)",
          animation: "meshFloat2 28s ease-in-out infinite alternate",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          bottom: "-10%",
          right: "20%",
          width: { xs: "350px", md: "600px" },
          height: { xs: "350px", md: "600px" },
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(10, 37, 64, 0.1) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(10, 37, 64, 0.12) 0%, rgba(30, 96, 145, 0.06) 50%, transparent 75%)",
          filter: "blur(80px)",
          animation: "meshFloat3 25s ease-in-out infinite alternate",
        }}
      />

      {/* ── 2. Subtle Tech Blueprint Grid & Digital Flow ────────────────── */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: isDark
            ? "radial-gradient(rgba(56, 189, 248, 0.12) 1.2px, transparent 1.2px)"
            : "radial-gradient(rgba(10, 37, 64, 0.09) 1.2px, transparent 1.2px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 35%, black 40%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 35%, black 40%, transparent 95%)",
          opacity: 0.85,
        }}
      />

      {/* High-tech circuit / laser scan line accent */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: isDark
            ? "linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.6) 50%, transparent 100%)"
            : "linear-gradient(90deg, transparent 0%, rgba(30, 96, 145, 0.4) 50%, transparent 100%)",
          boxShadow: isDark
            ? "0 0 15px rgba(56, 189, 248, 0.5)"
            : "0 0 10px rgba(30, 96, 145, 0.3)",
        }}
      />

      {/* ── 3. High-Performance Knowledge Constellation Canvas ─────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* ── 4. Keyframe Animations Style Tag ──────────────────────────── */}
      <style jsx global>{`
        @keyframes meshFloat1 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-50px, 40px) scale(1.08);
          }
          100% {
            transform: translate(30px, -30px) scale(0.95);
          }
        }
        @keyframes meshFloat2 {
          0% {
            transform: translate(0, 0) scale(0.95);
          }
          50% {
            transform: translate(60px, -45px) scale(1.1);
          }
          100% {
            transform: translate(-30px, 35px) scale(1);
          }
        }
        @keyframes meshFloat3 {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-40px, -50px) scale(1.06);
          }
          100% {
            transform: translate(45px, 20px) scale(0.96);
          }
        }
      `}</style>
    </Box>
  );
}
