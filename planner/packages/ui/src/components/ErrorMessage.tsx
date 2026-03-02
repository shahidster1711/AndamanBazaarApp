import React from "react";
import { clsx } from "clsx";

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  return (
    <div
      className={clsx("ap-card", className)}
      style={{ borderColor: "#fca5a5", background: "#fef2f2" }}
    >
      <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.9rem" }}>
        ❌ {message}
      </p>
      {onRetry && (
        <button
          className="ap-btn ap-btn-secondary"
          style={{ marginTop: "0.75rem" }}
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
