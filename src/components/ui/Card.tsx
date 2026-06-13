import { HTMLAttributes, forwardRef } from "react";

type CardVariant = "default" | "elevated" | "bordered";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  accent?: "primary" | "success" | "error" | "warning";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClasses: Record<CardVariant, string> = {
  default: "card",
  elevated: "card-elevated",
  bordered: "card-bordered",
};

const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const accentColors = {
  primary: "border-l-4 border-l-primary",
  success: "border-l-4 border-l-success",
  error: "border-l-4 border-l-error",
  warning: "border-l-4 border-l-warning",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", accent, padding = "md", className = "", children, ...props }, ref) => {
    const paddingClass = paddingClasses[padding];
    const accentClass = accent ? accentColors[accent] : "";

    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${paddingClass} ${accentClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`flex items-center justify-between mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = "", children, ...props }, ref) => (
    <h3 ref={ref} className={`text-heading-lg text-text ${className}`} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };