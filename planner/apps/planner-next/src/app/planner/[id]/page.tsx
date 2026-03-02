"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ItineraryView, LoadingSpinner, ErrorAlert } from "@andaman-planner/ui";
import type { Itinerary } from "@andaman-planner/shared";

export default function ItineraryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = (): Record<string, string> => {
    const storageKey = Object.keys(localStorage).find((k) =>
      k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (!storageKey) return {};
    try {
      const session = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const token = session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch {
      // ignore
    }
    return {};
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${basePath}/api/planner/itineraries/${id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message || "Failed to load itinerary");
          return;
        }
        setItinerary(data.itinerary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, basePath]);

  if (loading) return <LoadingSpinner message="Loading itinerary..." />;
  if (error) return <ErrorAlert message={error} className="m-8" />;
  if (!itinerary) return <ErrorAlert message="Itinerary not found" className="m-8" />;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <a
          href={`${basePath}/planner`}
          className="mb-4 inline-block text-sm text-teal-600 hover:text-teal-800"
        >
          ← Back to Planner
        </a>
        <ItineraryView itinerary={itinerary} />
      </div>
    </main>
  );
}
