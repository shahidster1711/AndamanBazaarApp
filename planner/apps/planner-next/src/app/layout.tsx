import type { Metadata } from "next";
import React from "react";
import "@andaman-planner/ui/styles.css";

export const metadata: Metadata = {
  title: "Andaman Planner Pro",
  description: "AI-powered Andaman Islands trip planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}
