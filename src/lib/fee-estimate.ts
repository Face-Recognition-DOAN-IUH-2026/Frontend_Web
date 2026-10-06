export interface FineBracket {
  from: number;
  to: number | null;
  amount: number;
}

export interface FineConfigDto {
  fine_brackets?: FineBracket[];
  fine_per_day?: number;
  damage_fee_pct?: { minor: number; major: number; lost: number };
  damage_fee_fixed?: { minor: number; major: number; lost: number };
  fallback_book_price?: number;
  fine_lock_threshold_days?: number;
}

export function estimateOverdueFine(overdueDays: number, fine?: FineConfigDto | null): number {
  if (overdueDays <= 0) return 0;

  const brackets = fine?.fine_brackets;
  const finePerDay = (fine?.fine_per_day ?? 5000) as number;

  if (brackets && brackets.length > 0) {
    for (const b of brackets) {
      const from = Number(b.from);
      const to = b.to === null || b.to === undefined ? Infinity : Number(b.to);
      if (overdueDays >= from && overdueDays <= to) return Number(b.amount);
    }
    const lastBracket = brackets[brackets.length - 1];
    if (lastBracket.to === null || lastBracket.to === undefined) return Number(lastBracket.amount);
    if (finePerDay > 0) return overdueDays * finePerDay;
    return Number(lastBracket.amount);
  }

  if (overdueDays <= 7) return 10000;
  if (overdueDays <= 14) return 20000;
  if (overdueDays <= 30) return 50000;
  return 100000;
}

export function estimateDamageFee(
  condition: string | null | undefined,
  priceVnd: number | null | undefined,
  fine?: FineConfigDto | null,
): number {
  const pct = fine?.damage_fee_pct ?? { minor: 30, major: 70, lost: 100 };
  const fixed = fine?.damage_fee_fixed ?? { minor: 5000, major: 10000, lost: 10000 };
  const fallback = fine?.fallback_book_price ?? 100000;
  const effectivePrice = priceVnd !== null && priceVnd !== undefined && Number(priceVnd) > 0 ? Number(priceVnd) : fallback;

  switch (condition) {
    case "minor_damage":
      return Math.round(effectivePrice * pct.minor / 100) + fixed.minor;
    case "major_damage":
      return Math.round(effectivePrice * pct.major / 100) + fixed.major;
    case "lost":
      return Math.round(effectivePrice * pct.lost / 100) + fixed.lost;
    default:
      return 0;
  }
}
