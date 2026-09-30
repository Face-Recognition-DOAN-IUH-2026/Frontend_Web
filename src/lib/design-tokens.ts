/**
 * ═══════════════════════════════════════════════════════════════════
 *  IUH LIBRARY DESIGN SYSTEM — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Mọi design token (color, spacing, typography, motion) đều
 *  được định nghĩa TẬP TRUNG tại đây. MUI theme, globals.css,
 *  và tất cả component đều reference từ file này.
 *
 *  Quy ước:
 *  - Tầng 1: Primitive tokens (raw color hex, raw spacing px)
 *  - Tầng 2: Semantic tokens (brand meaning: primary, secondary, etc.)
 *  - Tầng 3: Component tokens (MUI overrides, CSS variables)
 */

// ─── TẦNG 1: PRIMITIVE COLORS ───────────────────────────────────
export const primitive = {
  red: {
    900: "#700000",
    800: "#8B0000",  // IUH Đỏ đô chính
    700: "#900C3F",
    600: "#A31D1D",
    100: "#FFF5F5",
  },
  gold: {
    700: "#B38E22",
    600: "#D4AF37",  // IUH Vàng hoàng gia
    500: "#E6A100",
    400: "#F59E0B",
    100: "#FFF8E7",
  },
  navy: {
    900: "#061729",
    800: "#0A2540",  // IUH Navy công nghiệp
    700: "#0C1E32",
    600: "#071524",
    100: "#E8EEF5",
  },
  neutral: {
    950: "#0D1B2A",
    900: "#0F172A",
    850: "#1E293B",
    800: "#1E3347",
    700: "#334155",
    600: "#475569",
    500: "#64748B",
    400: "#94A3B8",
    300: "#CBD5E1",
    200: "#DEE2E6",
    150: "#E2E8F0",
    100: "#F0F6FB",
    50:  "#F8F9FA",
    0:   "#FFFFFF",
  },
  green: {
    700: "#047857",
    600: "#059669",
    500: "#198754",
  },
  amber: {
    700: "#B45309",
    600: "#D97706",
  },
  red_status: {
    600: "#DC2626",
    500: "#B91C1C",
  },
} as const;

// ─── TẦNG 2: SEMANTIC BRAND TOKENS ─────────────────────────────
export const brand = {
  primary: {
    main:          primitive.red[800],       // #8B0000
    dark:          primitive.red[900],       // #700000
    light:         primitive.red[600],       // #A31D1D
    contrastText:  primitive.neutral[0],     // #FFFFFF
    container:     primitive.red[100],       // #FFF5F5
  },
  secondary: {
    main:          primitive.gold[600],      // #D4AF37
    dark:          primitive.gold[700],      // #B38E22
    light:         primitive.gold[500],      // #E6A100
    contrastText:  primitive.navy[800],      // #0A2540
    container:     primitive.gold[100],      // #FFF8E7
  },
  accent: {
    navy:          primitive.navy[800],      // #0A2540
    navyDark:      primitive.navy[900],      // #061729
    navyContainer: primitive.navy[100],      // #E8EEF5
  },
  status: {
    success:       primitive.green[500],     // #198754
    successDark:   primitive.green[700],     // #047857
    warning:       primitive.amber[600],     // #D97706
    warningDark:   primitive.amber[700],     // #B45309
    error:         primitive.red[800],       // #8B0000
    errorBright:   primitive.red_status[600],// #DC2626
  },
} as const;

// ─── TẦNG 2: SEMANTIC SURFACE TOKENS (Light / Dark) ────────────
export const surface = {
  light: {
    bg:            primitive.neutral[100],   // #F0F6FB — trang nhẹ, không trắng tinh
    bgAlt:         primitive.neutral[50],    // #F8F9FA
    paper:         primitive.neutral[0],     // #FFFFFF
    divider:       primitive.neutral[200],   // #DEE2E6
    textPrimary:   primitive.navy[800],      // #0A2540
    textSecondary: "#4B5563",
    textDisabled:  "#9CA3AF",
    hoverOverlay:  "rgba(139, 0, 0, 0.06)",
    selectedOverlay: "rgba(139, 0, 0, 0.12)",
  },
  dark: {
    bg:            primitive.navy[600],      // #071524
    bgAlt:         primitive.neutral[950],   // #0D1B2A
    paper:         primitive.navy[700],      // #0C1E32
    divider:       primitive.navy[800] + "4D", // #1E3347 with alpha
    textPrimary:   primitive.neutral[50],    // #F8F9FA
    textSecondary: primitive.neutral[400],   // #94A3B8
    textDisabled:  primitive.neutral[500],   // #64748B
    hoverOverlay:  "rgba(139, 0, 0, 0.12)",
    selectedOverlay: "rgba(139, 0, 0, 0.20)",
  },
} as const;

// ─── SPACING (8px Grid System) ──────────────────────────────────
export const spacing = {
  /** 4px  — minimum micro-gap */  xxs: 4,
  /** 8px  — standard unit */      xs:  8,
  /** 12px — tight padding */      sm:  12,
  /** 16px — default padding */    md:  16,
  /** 24px — section gap */        lg:  24,
  /** 32px — large section gap */  xl:  32,
  /** 48px — page margin */        xxl: 48,

  /** MUI spacing multiplier base = 8px */
  unit: 8,
} as const;

// ─── TYPOGRAPHY ─────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    heading: "'Space Grotesk', sans-serif",
    body:    "'Source Sans 3', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },
  /** Google Fonts import URL — only 3 families */
  googleFontsUrl:
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
} as const;

// ─── SHAPE ──────────────────────────────────────────────────────
export const shape = {
  /** 2px — Industrial crisp (chips, badges) */
  borderRadiusXs: 2,
  /** 4px — Default shape radius */
  borderRadius:   4,
  /** 8px — Buttons, inputs */
  borderRadiusMd: 8,
  /** 12px — Cards, dialogs */
  borderRadiusLg: 12,
  /** 16px — Large modals */
  borderRadiusXl: 16,
} as const;

// ─── MOTION ─────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant:  0,
    fast:     150,
    normal:   200,
    moderate: 250,
    slow:     300,
    complex:  375,
  },
  easing: {
    standard:  "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0.0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    sharp:     "cubic-bezier(0.4, 0, 0.6, 1)",
  },
} as const;

// ─── SIDEBAR (luôn Navy tối — brand decision) ──────────────────
export const sidebar = {
  width: 264,
  bg:              primitive.navy[800],       // #0A2540 — Navy IUH
  textColor:       primitive.neutral[0],      // #FFFFFF
  textMuted:       primitive.neutral[300],    // #CBD5E1
  textInactive:    primitive.neutral[400],    // #94A3B8
  sectionLabel:    primitive.gold[600],       // #D4AF37
  selectedBg:      "rgba(212, 175, 55, 0.16)",
  selectedHoverBg: "rgba(212, 175, 55, 0.22)",
  selectedAccent:  primitive.gold[600],       // #D4AF37
  hoverBg:         "rgba(255, 255, 255, 0.08)",
  borderRight:     "1px solid rgba(255, 255, 255, 0.12)",
  roleChip: {
    admin: { bg: primitive.red[800], color: "#FFFFFF" },
    staff:  { bg: "rgba(212, 175, 55, 0.2)", color: primitive.gold[600] },
  },
} as const;

// ─── TOPBAR ─────────────────────────────────────────────────────
export const topbar = {
  height: 64,
  brandStripeHeight: 3,
  brandStripeColor: brand.primary.main,
  chipBg: (isDark: boolean) => isDark ? `rgba(212, 175, 55, 0.12)` : `rgba(212, 175, 55, 0.12)`,
  chipColor: (isDark: boolean) => isDark ? primitive.gold[400] : primitive.gold[700],
  chipBorder: (isDark: boolean) => `1px solid rgba(212, 175, 55, 0.35)`,
} as const;

// ─── TABLE ──────────────────────────────────────────────────────
export const table = {
  headBg: {
    light: "rgba(10, 37, 64, 0.05)",
    dark:  "rgba(10, 37, 64, 0.08)",
  },
  headColor: {
    light: "#4B6484",
    dark:  "#8FA8BF",
  },
  hoverBg: {
    light: "rgba(10, 37, 64, 0.04)",
    dark:  "rgba(10, 37, 64, 0.08)",
  },
} as const;
