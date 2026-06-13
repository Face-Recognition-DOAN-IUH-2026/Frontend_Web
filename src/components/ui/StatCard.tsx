import { HTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

type AccentColor = "primary" | "success" | "error" | "warning" | "info";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: AccentColor;
  trend?: { value: number; label?: string };
  description?: string;
}

const accentBars: Record<AccentColor, string> = {
  primary: "bg-primary",
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-info",
};

const accentText: Record<AccentColor, string> = {
  primary: "text-primary",
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-info",
};

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon: Icon, accentColor = "primary", trend, description, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`stat-card ${className}`}
        style={{ paddingLeft: "20px" }}
        {...props}
      >
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${accentBars[accentColor]}`} />
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-label mb-1">{label}</p>
            <p className="text-display-xl text-text font-display font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
            </p>
            {description && (
              <p className="text-body-sm text-text-3 mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-body-sm font-medium ${trend.value >= 0 ? "text-success" : "text-error"}`}>
                  {trend.value >= 0 ? "+" : ""}{trend.value}
                </span>
                {trend.label && (
                  <span className="text-caption text-text-3">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-2.5 rounded-lg bg-surface-2 ${accentText[accentColor]}`}>
              <Icon size={20} />
            </div>
          )}
        </div>
        {children}
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

export default StatCard;