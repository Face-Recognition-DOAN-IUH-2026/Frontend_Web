import { ButtonHTMLAttributes, forwardRef } from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost";
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-text-3 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-heading-md text-text mb-1">{title}</h3>
      {description && (
        <p className="text-body-sm text-text-3 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`btn-${action.variant || "primary"}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}