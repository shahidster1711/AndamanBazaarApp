import { Link } from "react-router-dom";
import type { Activity } from "../types";

type ActivityCardProps = {
  activity: Activity;
  onRequestBooking?: (activity: Activity) => void;
};

const ACTIVITY_IMAGES: Record<string, string> = {
  "Scuba Diving":
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop",
  "Sea Walking":
    "https://images.unsplash.com/photo-1682687220777-2c60708d6889?w=600&auto=format&fit=crop",
  Snorkeling:
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&auto=format&fit=crop",
  Parasailing:
    "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=600&auto=format&fit=crop",
  "Jet Skiing":
    "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=600&auto=format&fit=crop",
  "Speed Boat Ride":
    "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=600&auto=format&fit=crop",
  "Banana Boat Ride":
    "https://images.unsplash.com/photo-1515375632430-5e10f3f7db31?w=600&auto=format&fit=crop",
  "Glass Bottom Boat":
    "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=600&auto=format&fit=crop",
  "Semi Submarine":
    "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?w=600&auto=format&fit=crop",
  Kayaking:
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop",
  Windsurfing:
    "https://images.unsplash.com/photo-1452440503154-d4592d2e9dde?w=600&auto=format&fit=crop",
  "Sea Karting":
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&auto=format&fit=crop",
  "Sport Fishing":
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop",
  "Seaplane Ride":
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&auto=format&fit=crop",
  "Harbour Cruise":
    "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600&auto=format&fit=crop",
  "Stand-Up Paddleboarding":
    "https://images.unsplash.com/photo-1509908759-dab69dc3d44f?w=600&auto=format&fit=crop",
  "Water Skiing":
    "https://images.unsplash.com/photo-1519666336592-e225a99dcd2f?w=600&auto=format&fit=crop",
  "Mangrove Kayaking":
    "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&auto=format&fit=crop",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop";

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const ActivityCard = ({ activity, onRequestBooking }: ActivityCardProps) => {
  const image =
    ACTIVITY_IMAGES[activity.title] ??
    (activity.images[0]?.startsWith("http") ? activity.images[0] : null) ??
    FALLBACK_IMAGE;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-52 overflow-hidden">
        <img
          src={image}
          alt={`${activity.title} in ${activity.location}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-sky-700 backdrop-blur">
            📍 {activity.location}
          </span>
          {activity.age_min && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
              Age {activity.age_min}+
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{activity.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {activity.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activity.types.slice(0, 3).map((type) => (
            <span
              key={type}
              className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700"
            >
              {type}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <span>⏱</span>
            {formatDuration(activity.duration_minutes)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs text-slate-400">Starting from</p>
            <p className="text-base font-bold text-slate-900">
              ₹{activity.price_min.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-slate-400">
                {" "}
                – ₹{activity.price_max.toLocaleString("en-IN")}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/activities/${activity.slug}`}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
            >
              Details
            </Link>
            <button
              type="button"
              onClick={() => onRequestBooking?.(activity)}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
