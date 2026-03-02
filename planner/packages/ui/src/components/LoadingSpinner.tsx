import React from "react";
import { cn } from "../lib/cn.js";

export interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-teal-600" />
      </div>
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}
