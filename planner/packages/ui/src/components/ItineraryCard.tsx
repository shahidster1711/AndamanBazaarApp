import React from "react";
import type { ItinerarySummary } from "@andaman-planner/shared";
import { formatDisplayDate } from "@andaman-planner/shared";
import { clsx } from "clsx";

export interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick?: (id: string) => void;
  className?: string;
}

export function ItineraryCard({ itinerary, onClick, className }: ItineraryCardProps) {
  return (
    <div
      className={clsx("ap-card", className)}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={() => onClick?.(itinerary.id)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(itinerary.id);
        }
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{itinerary.name}</h3>
      <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "#64748b" }}>
        {formatDisplayDate(itinerary.startDate)} — {formatDisplayDate(itinerary.endDate)}
      </p>
      {itinerary.islandsCovered.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
          {itinerary.islandsCovered.map((island) => (
            <span key={island} className="ap-chip">{island}</span>
          ))}
        </div>
      )}
      {itinerary.estimatedBudgetRange && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#0d9488", fontWeight: 500 }}>
          {itinerary.estimatedBudgetRange}
        </p>
      )}
    </div>
  );
}
