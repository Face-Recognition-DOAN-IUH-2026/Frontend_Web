"use client";

import React from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { EASINGS, SPRINGS, DURATIONS, MOTION_VARIANTS, useMotionPreference } from "@/lib/motion";

/* ─── 1. MotionButton (Spring Micro-interaction) ─── */
export interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg",
  secondary: "bg-secondary text-white hover:bg-secondary-dark",
  outline: "border border-border text-text hover:bg-surface-2",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  danger: "bg-error text-white hover:opacity-90",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-2xl gap-2.5",
};

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, variant = "primary", size = "md", className = "", disabled, ...props }, ref) => {
    const { shouldReduceMotion } = useMotionPreference();

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={shouldReduceMotion || disabled ? undefined : { scale: 1.02, y: -1 }}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.96 }}
        transition={SPRINGS.snappy}
        className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed will-change-transform ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";

/* ─── 2. MotionCard (Smooth Composite Elevation) ─── */
export interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, interactive = false, className = "", ...props }, ref) => {
    const { shouldReduceMotion } = useMotionPreference();

    return (
      <motion.div
        ref={ref}
        whileHover={interactive && !shouldReduceMotion ? { y: -4, scale: 1.01 } : undefined}
        whileTap={interactive && !shouldReduceMotion ? { scale: 0.99 } : undefined}
        transition={SPRINGS.gentle}
        className={`rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow ${
          interactive ? "cursor-pointer hover:shadow-md hover:border-primary/40 will-change-transform" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

/* ─── 3. MotionModal (Backdrop + Spring Pop-up) ─── */
export interface MotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function MotionModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}: MotionModalProps) {
  const { shouldReduceMotion } = useMotionPreference();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : DURATIONS.fast }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            variants={MOTION_VARIANTS.modalDialog}
            initial={shouldReduceMotion ? { opacity: 0 } : "initial"}
            animate={shouldReduceMotion ? { opacity: 1 } : "animate"}
            exit={shouldReduceMotion ? { opacity: 0 } : "exit"}
            className={`relative z-10 w-full ${maxWidthStyles[maxWidth]} overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-2xl will-change-transform`}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">{title}</h3>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── 4. StaggerList & StaggerItem (60fps Cascading) ─── */
export function StaggerList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={MOTION_VARIANTS.staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={MOTION_VARIANTS.staggerItem}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
