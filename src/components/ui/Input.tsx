import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-body-sm font-medium text-text-2 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`input ${icon ? "pl-10" : ""} ${iconRight ? "pr-10" : ""} ${error ? "border-error focus:border-error focus:ring-error/30" : ""} ${className}`}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-body-sm text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-body-sm text-text-3">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-body-sm font-medium text-text-2 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`input min-h-[100px] resize-y ${error ? "border-error focus:border-error focus:ring-error/30" : ""} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-body-sm text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-body-sm text-text-3">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };