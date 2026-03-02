import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LeadFormModal } from "../components/LeadFormModal";
import { api } from "../lib/api";
import { KNOWN_ACTIVITY_NAMES } from "../lib/constants";
import type { Activity } from "../types";

const ACTIVITY_IMAGES: Record<string, string> = {
  "Scuba Diving":
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&auto=format&fit=crop",
  "Sea Walking":
    "https://images.unsplash.com/photo-1682687220777-2c60708d6889?w=1000&auto=format&fit=crop",
  Snorkeling:
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1000&auto=format&fit=crop",
  Parasailing:
    "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=1000&auto=format&fit=crop",
  "Jet Skiing":
    "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1000&auto=format&fit=crop",
  "Speed Boat Ride":
    "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=1000&auto=format&fit=crop",
  "Banana Boat Ride":
    "https://images.unsplash.com/photo-1515375632430-5e10f3f7db31?w=1000&auto=format&fit=crop",
  "Glass Bottom Boat":
    "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1000&auto=format&fit=crop",
  "Semi Submarine":
    "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?w=1000&auto=format&fit=crop",
  Kayaking:
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1000&auto=format&fit=crop",
  Windsurfing:
    "https://images.unsplash.com/photo-1452440503154-d4592d2e9dde?w=1000&auto=format&fit=crop",
  "Sea Karting":
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1000&auto=format&fit=crop",
  "Sport Fishing":
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1000&auto=format&fit=crop",
  "Seaplane Ride":
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1000&auto=format&fit=crop",
  "Harbour Cruise":
    "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1000&auto=format&fit=crop",
  "Stand-Up Paddleboarding":
    "https://images.unsplash.com/photo-1509908759-dab69dc3d44f?w=1000&auto=format&fit=crop",
  "Water Skiing":
    "https://images.unsplash.com/photo-1519666336592-e225a99dcd2f?w=1000&auto=format&fit=crop",
  "Mangrove Kayaking":
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1000&auto=format&fit=crop",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop";

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const ActivityDetailPage = () => {
  const { slug = "" } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const item = await api.getActivityBySlug(slug);
        if (!cancelled) setActivity(item);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load activity");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const availableActivities = useMemo(() => {
    if (!activity) return KNOWN_ACTIVITY_NAMES;
    return Array.from(new Set([...KNOWN_ACTIVITY_NAMES, activity.title]));
  }, [activity]);

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      </div>
    );
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!activity) return <p className="text-slate-500">Activity not found.</p>;

  const heroImage =
    ACTIVITY_IMAGES[activity.title] ??
    (activity.images[0]?.startsWith("http") ? activity.images[0] : null) ??
    FALLBACK_IMAGE;

  return (
    <div className="space-y-6">
      <Link
        to="/activities"
        className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline"
      >
        ← Back to all activities
      </Link>

      {/* Hero image */}
      <div className="relative h-72 overflow-hidden rounded-2xl sm:h-96">
        <img
          src={heroImage}
          alt={`${activity.title} in ${activity.location}`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-5">
          <div className="flex flex-wrap gap-2">
            {activity.types.map((type) => (
              <span
                key={type}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur"
              >
                {type}
              </span>
            ))}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">{activity.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sky-200">
            <span>📍</span> {activity.location}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-slate-900">About this Activity</h2>
            <p className="text-slate-600 leading-relaxed">{activity.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-slate-900">Safety Notes</h2>
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-amber-800">{activity.safety_notes}</p>
            </div>
          </div>

          {activity.operator && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-slate-900">Operated By</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-lg">
                  🏪
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{activity.operator.name}</p>
                  <p className="text-sm text-slate-500">{activity.operator.location}</p>
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {activity.operator.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>📞</span>
                    <span>{activity.operator.phone}</span>
                  </div>
                )}
                {activity.operator.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>✉️</span>
                    <span>{activity.operator.email}</span>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Booking sidebar */}
        <div className="space-y-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Price Range</dt>
                <dd className="font-bold text-slate-900">
                  ₹{activity.price_min.toLocaleString("en-IN")} –{" "}
                  ₹{activity.price_max.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-medium">{formatDuration(activity.duration_minutes)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Min Age</dt>
                <dd className="font-medium">
                  {activity.age_min ? `${activity.age_min}+ years` : "No strict limit"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-right">{activity.location}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setLeadOpen(true)}
                className="w-full rounded-xl bg-sky-600 px-4 py-3 font-bold text-white shadow hover:bg-sky-700"
              >
                🎯 Request Booking
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                We respond within 12 hours
              </p>
            </div>
          </div>
        </div>
      </div>

      <LeadFormModal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        availableActivities={availableActivities}
        prefill={{
          activity: activity.title,
          location: activity.location,
        }}
      />
    </div>
  );
};
