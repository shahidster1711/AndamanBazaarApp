import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Andaman Planner Pro",
  description: "AI itinerary planner for AndamanBazaar with shared Supabase auth.",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body
      style={{
        margin: 0,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      {children}
    </body>
  </html>
);

export default RootLayout;
