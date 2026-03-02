import React from "react";
import { cn } from "../lib/cn.js";

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorAlertProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 p-4",
        className
      )}
      role="alert"
    >
      <h4 className="text-sm font-semibold text-red-800">{title}</h4>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
