import { fadeInUp } from "@/lib/animations";

export function useStaggeredAnimation(_count?: number, baseDelay = 0.07) {
  return (index: number) => ({
    animation: `${fadeInUp} 0.4s ease-out`,
    animationDelay: `${index * baseDelay}s`,
    animationFillMode: "both" as const,
  });
}

export function staggerSx(index: number, baseDelay = 0.07) {
  return {
    animation: `${fadeInUp} 0.4s ease-out`,
    animationDelay: `${index * baseDelay}s`,
    animationFillMode: "both" as const,
  };
}
