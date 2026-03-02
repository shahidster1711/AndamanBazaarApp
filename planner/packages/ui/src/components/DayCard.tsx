import React from "react";
import type { ItineraryDay } from "@andaman-planner/shared";
import { formatDisplayDate } from "@andaman-planner/shared";
import { clsx } from "clsx";

export interface DayCardProps {
  day: ItineraryDay;
  className?: string;
}

export function DayCard({ day, className }: DayCardProps) {
  return (
    <div className={clsx("ap-card ap-day-card", className)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
          Day {day.dayNumber}: {day.theme}
        </h3>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
          {formatDisplayDate(day.date)}
        </span>
      </div>

      <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.85rem", color: "#0d9488", fontWeight: 500 }}>
        📍 {day.island}
      </p>

      {day.activities.map((act, i) => (
        <div key={i} className="ap-activity">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b", minWidth: "3rem" }}>
              {act.time}
            </span>
            <div>
              <strong style={{ fontSize: "0.9rem" }}>{act.title}</strong>
              <p style={{ margin: "0.15rem 0", fontSize: "0.8rem", color: "#475569" }}>
                {act.description}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
                <span>📍 {act.location}</span>
                <span>⏱ {act.duration}</span>
                {act.estimatedCost && <span>💰 {act.estimatedCost}</span>}
              </div>
              {act.tips && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#0d9488" }}>
                  💡 {act.tips}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {(day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
        <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "#f8fafc", borderRadius: "0.5rem", fontSize: "0.8rem" }}>
          <strong>Meals:</strong>
          {day.meals.breakfast && <span> 🌅 {day.meals.breakfast}</span>}
          {day.meals.lunch && <span> | 🍽 {day.meals.lunch}</span>}
          {day.meals.dinner && <span> | 🌙 {day.meals.dinner}</span>}
        </div>
      )}

      {day.accommodation && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#475569" }}>
          🏨 <strong>Stay:</strong> {day.accommodation}
        </p>
      )}

      {day.travelNotes && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#f59e0b" }}>
          ⚠️ {day.travelNotes}
        </p>
      )}
    </div>
  );
}
