import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "success" | "error" | "warning" | "info" | "neutral" | "primary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "badge-success",
  error: "badge-error",
  warning: "badge-warning",
  info: "badge-info",
  neutral: "badge-neutral",
  primary: "bg-primary/15 text-primary",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-text-3",
  primary: "bg-primary",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "neutral", dot, className = "", children, ...props }, ref) => {
    return (
      <span ref={ref} className={`badge ${variantClasses[variant]} ${className}`} {...props}>
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export default Badge;