import React from "react";
import { clsx } from "clsx";

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = "Generating your itinerary…", className }: LoadingSpinnerProps) {
  return (
    <div className={clsx(className)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "3rem 1rem" }}>
      <div className="ap-spinner" />
      <p style={{ color: "#64748b", fontSize: "0.9rem", textAlign: "center" }}>{message}</p>
    </div>
  );
}
