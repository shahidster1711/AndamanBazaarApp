import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const WHY_US = [
  {
    icon: "🏆",
    title: "Verified Operators Only",
    desc: "Every operator on AndamanBazaar.in is vetted for safety certifications and guest reviews.",
  },
  {
    icon: "💬",
    title: "12-Hour Response Guarantee",
    desc: "Submit your request and our team personally reaches out within 12 hours with a custom quote.",
  },
  {
    icon: "🎯",
    title: "18 Unique Adventures",
    desc: "From beginner snorkeling to premium seaplane rides — we have something for every traveller.",
  },
];

export const HomePage = () => {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState<{ activity?: string; location?: string }>({});

  const { activities, loading, error } = useActivities({
    location: filters.location || undefined,
    type: filters.type || undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    page: 1,
    pageSize: 6,
    featured: true,
  });

  const activityNames = useMemo(
    () =>
      Array.from(new Set([...KNOWN_ACTIVITY_NAMES, ...activities.map((item) => item.title)])),
    [activities],
  );

  const openLeadModal = (activity?: Activity) => {
    setLeadPrefill(
      activity
        ? { activity: activity.title, location: activity.location }
        : {},
    );
    setLeadOpen(true);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 px-6 py-14 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
            🌊 Andaman's #1 Water Adventures Marketplace
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Discover Water Adventures<br className="hidden sm:block" /> in Port Blair &amp; the Andamans
          </h1>
          <p className="mt-4 text-lg text-sky-100">
            Browse 18 curated water sports, compare prices, and get a custom
            quote from verified local operators — usually within 12 hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => openLeadModal()}
              className="rounded-xl bg-white px-6 py-3 font-bold text-sky-700 shadow-md hover:bg-sky-50"
            >
              🎯 Plan My Adventure
            </button>
            <Link
              to="/activities"
              className="rounded-xl border border-white/50 bg-white/10 px-6 py-3 font-semibold backdrop-blur hover:bg-white/20"
            >
              Browse All Activities →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { num: "18", label: "Water Sports" },
          { num: "7+", label: "Island Locations" },
          { num: "₹600", label: "Starting Price" },
          { num: "12h", label: "Response Time" },
        ].map(({ num, label }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-center shadow-sm"
          >
            <p className="text-2xl font-extrabold text-sky-600">{num}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Featured Activities */}
      <section className="space-y-4">
        <ActivityFilters
          values={filters}
          onChange={setFilters}
          locations={KNOWN_LOCATIONS}
          types={KNOWN_TYPES}
        />

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Activities</h2>
          <Link to="/activities" className="text-sm font-semibold text-sky-600 hover:underline">
            View all →
          </Link>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
        {!loading && !error && activities.length === 0 && (
          <p className="rounded-xl border bg-white p-6 text-center text-slate-500">
            No activities found for selected filters.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onRequestBooking={openLeadModal} />
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Why AndamanBazaar.in?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {WHY_US.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-3xl bg-gradient-to-r from-sky-600 to-cyan-600 p-8 text-center text-white shadow-md">
        <h2 className="text-2xl font-extrabold">Ready to dive in?</h2>
        <p className="mt-2 text-sky-100">
          Fill out a quick form and our team will curate the perfect adventure itinerary for you.
        </p>
        <button
          type="button"
          onClick={() => openLeadModal()}
          className="mt-5 rounded-xl bg-white px-8 py-3 font-bold text-sky-700 shadow hover:bg-sky-50"
        >
          Get a Free Custom Quote
        </button>
      </section>

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={activityNames}
        prefill={leadPrefill}
      />
    </div>
  );
};
