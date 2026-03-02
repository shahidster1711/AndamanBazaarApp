import { useMemo, useState } from "react";
import { ActivityCard } from "../components/ActivityCard";
import { ActivityFilters, type FilterValues } from "../components/ActivityFilters";
import { LeadFormModal } from "../components/LeadFormModal";
import { useActivities } from "../hooks/useActivities";
import { KNOWN_ACTIVITY_NAMES, KNOWN_LOCATIONS, KNOWN_TYPES } from "../lib/constants";
import type { Activity } from "../types";

const defaultFilters: FilterValues = {
  location: "",
  type: "",
  priceMin: "",
  priceMax: "",
};

export const ActivitiesPage = () => {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [page, setPage] = useState(1);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState<{ activity?: string; location?: string }>({});

  const { activities, loading, error, meta } = useActivities({
    location: filters.location || undefined,
    type: filters.type || undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    page,
    pageSize: 9,
  });

  const activityNames = useMemo(() => {
    return Array.from(
      new Set([...KNOWN_ACTIVITY_NAMES, ...activities.map((activity) => activity.title)]),
    );
  }, [activities]);

  const openLeadModal = (activity: Activity) => {
    setLeadPrefill({ activity: activity.title, location: activity.location });
    setLeadOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-sky-700 to-cyan-600 px-6 py-8 text-white">
        <h1 className="text-3xl font-extrabold">All Water Adventures</h1>
        <p className="mt-1 text-sky-100">
          18 activities across 7 island locations — filter, compare, and book your perfect experience.
        </p>
      </header>

      <ActivityFilters
        values={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
        locations={KNOWN_LOCATIONS}
        types={KNOWN_TYPES}
      />

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-slate-100"
            />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {activities.length === 0 ? (
            <p className="rounded-xl border bg-white p-8 text-center text-slate-500">
              No activities found for the selected filters.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onRequestBooking={openLeadModal}
                />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-40"
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={activityNames}
        prefill={leadPrefill}
      />
    </div>
  );
};
