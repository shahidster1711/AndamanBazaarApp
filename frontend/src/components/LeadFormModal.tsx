import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { KNOWN_LOCATIONS } from "../lib/constants";

type LeadFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableActivities: string[];
  prefill?: {
    activity?: string;
    location?: string;
  };
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  preferred_date: string;
  location: string;
  activities: string[];
  adults: string;
  children: string;
  swimming_ability: string;
  budget: string;
  referral_source: string;
  special_requests: string;
  consent: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const BUDGET_OPTIONS = [
  { label: "Under ₹2,000", value: "1500" },
  { label: "₹2,000 – ₹5,000", value: "3500" },
  { label: "₹5,000 – ₹10,000", value: "7500" },
  { label: "Above ₹10,000", value: "12000" },
];

const REFERRAL_OPTIONS = [
  "Google Search",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Friend / Family",
  "Travel Agent",
  "Other",
];

const ACTIVITY_EMOJIS: Record<string, string> = {
  "Scuba Diving": "🤿",
  "Sea Walking": "🚶",
  Snorkeling: "🐠",
  Parasailing: "🪂",
  "Jet Skiing": "🛥️",
  "Speed Boat Ride": "⚡",
  "Banana Boat Ride": "🍌",
  "Glass Bottom Boat": "🔭",
  "Semi Submarine": "🚢",
  Kayaking: "🛶",
  Windsurfing: "🏄",
  "Sea Karting": "🏎️",
  "Sport Fishing": "🎣",
  "Seaplane Ride": "✈️",
  "Harbour Cruise": "🛳️",
  "Stand-Up Paddleboarding": "🏄",
  "Water Skiing": "⛷️",
  "Mangrove Kayaking": "🌿",
};

const initialState: FormState = {
  name: "",
  phone: "",
  email: "",
  preferred_date: "",
  location: "",
  activities: [],
  adults: "1",
  children: "0",
  swimming_ability: "",
  budget: "",
  referral_source: "",
  special_requests: "",
  consent: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!values.phone.trim()) errors.phone = "Please enter your phone number.";
  if (!values.preferred_date) errors.preferred_date = "Please select a preferred date.";
  if (!values.location.trim()) errors.location = "Please choose a location.";
  if (values.activities.length === 0) errors.activities = "Select at least one activity.";
  if (Number(values.adults) < 1) errors.adults = "At least one adult is required.";
  if (!values.swimming_ability.trim())
    errors.swimming_ability = "Please select your swimming ability.";
  if (!values.budget) errors.budget = "Please select your budget range.";
  if (values.email && !emailRegex.test(values.email)) errors.email = "Please enter a valid email.";
  if (!values.consent) errors.consent = "Consent is required to continue.";
  return errors;
};

const today = new Date().toISOString().slice(0, 10);

export const LeadFormModal = ({
  isOpen,
  onClose,
  availableActivities,
  prefill,
}: LeadFormModalProps) => {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const uniqueActivities = useMemo(
    () => Array.from(new Set(availableActivities)).sort(),
    [availableActivities],
  );

  useEffect(() => {
    if (!isOpen) return;
    setFormState({
      ...initialState,
      location: prefill?.location ?? "",
      activities: prefill?.activity ? [prefill.activity] : [],
    });
    setErrors({});
    setSubmitError("");
    setIsSuccess(false);
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [isOpen, prefill?.activity, prefill?.location]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleActivity = (activity: string) => {
    setFormState((prev) => {
      const exists = prev.activities.includes(activity);
      const activities = exists
        ? prev.activities.filter((item) => item !== activity)
        : [...prev.activities, activity];
      return { ...prev, activities };
    });
    setErrors((prev) => ({ ...prev, activities: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(formState);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.createLead({
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        email: formState.email.trim() || undefined,
        preferred_date: formState.preferred_date,
        location: formState.location.trim(),
        activities: formState.activities,
        adults: Number(formState.adults),
        children: Number(formState.children || 0),
        swimming_ability: formState.swimming_ability.trim(),
        budget: Number(formState.budget),
        referral_source: formState.referral_source || undefined,
        special_requests: formState.special_requests.trim() || undefined,
        consent: formState.consent,
      });
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 id="lead-form-title" className="text-lg font-bold text-slate-900">
              Request a Custom Adventure Quote
            </h2>
            <p className="text-sm text-slate-500">
              We'll reach out within <strong className="text-sky-600">12 hours</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          {isSuccess ? (
            /* ── Success screen ── */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">
                ✅
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                You're all set!
              </h3>
              <p className="max-w-sm text-slate-600">
                Thank you for reaching out to{" "}
                <strong>AndamanBazaar.in</strong>. We will get back to you as
                soon as possible.
              </p>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-6 py-4">
                <p className="text-sm font-medium text-sky-800">
                  ⏱ We usually reach out within{" "}
                  <span className="text-sky-700 font-extrabold">12 hours</span>{" "}
                  of submission. Kindly wait.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-xl bg-sky-600 px-6 py-2.5 font-semibold text-white hover:bg-sky-700"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Personal Info */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Personal Details
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={firstInputRef}
                      id="name"
                      placeholder="e.g. Priya Sharma"
                      value={formState.name}
                      onChange={(event) => setField("name", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.name ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={formState.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.phone ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                      Email <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="priya@email.com"
                      value={formState.email}
                      onChange={(event) => setField("email", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.email ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>
                  <div>
                    <label
                      htmlFor="preferred_date"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Preferred Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="preferred_date"
                      type="date"
                      min={today}
                      value={formState.preferred_date}
                      onChange={(event) => setField("preferred_date", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.preferred_date ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.preferred_date)}
                    />
                    {errors.preferred_date && (
                      <p className="mt-1 text-xs text-red-500">{errors.preferred_date}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Trip Details */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Trip Details
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">
                      Preferred Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="location"
                      value={formState.location}
                      onChange={(event) => setField("location", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.location ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.location)}
                    >
                      <option value="">Select a location</option>
                      {KNOWN_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    {errors.location && (
                      <p className="mt-1 text-xs text-red-500">{errors.location}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="swimming_ability"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Swimming Ability <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="swimming_ability"
                      value={formState.swimming_ability}
                      onChange={(event) => setField("swimming_ability", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.swimming_ability ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.swimming_ability)}
                    >
                      <option value="">Select ability</option>
                      <option value="Non-swimmer">Non-swimmer 🚫🏊</option>
                      <option value="Beginner">Beginner 🐢</option>
                      <option value="Intermediate">Intermediate 🏊</option>
                      <option value="Advanced">Advanced 🦈</option>
                    </select>
                    {errors.swimming_ability && (
                      <p className="mt-1 text-xs text-red-500">{errors.swimming_ability}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="adults" className="mb-1 block text-sm font-medium text-slate-700">
                      Adults <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="adults"
                      type="number"
                      min={1}
                      max={20}
                      value={formState.adults}
                      onChange={(event) => setField("adults", event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${errors.adults ? "border-red-400" : "border-slate-200"}`}
                      aria-invalid={Boolean(errors.adults)}
                    />
                    {errors.adults && <p className="mt-1 text-xs text-red-500">{errors.adults}</p>}
                  </div>
                  <div>
                    <label htmlFor="children" className="mb-1 block text-sm font-medium text-slate-700">
                      Children{" "}
                      <span className="text-xs font-normal text-slate-400">(below 12)</span>
                    </label>
                    <input
                      id="children"
                      type="number"
                      min={0}
                      max={20}
                      value={formState.children}
                      onChange={(event) => setField("children", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Activities */}
              <fieldset>
                <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Activities <span className="text-red-500">*</span>{" "}
                  <span className="font-normal normal-case text-slate-400">(select all that interest you)</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {uniqueActivities.map((activity) => {
                    const isChecked = formState.activities.includes(activity);
                    return (
                      <label
                        key={activity}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                          isChecked
                            ? "border-sky-400 bg-sky-50 font-medium text-sky-800"
                            : "border-slate-200 hover:border-sky-200 hover:bg-sky-50/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleActivity(activity)}
                          className="h-4 w-4 accent-sky-600"
                        />
                        <span>
                          {ACTIVITY_EMOJIS[activity] ?? "🌊"} {activity}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.activities && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.activities}</p>
                )}
              </fieldset>

              {/* Budget */}
              <fieldset>
                <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Budget per Person <span className="text-red-500">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BUDGET_OPTIONS.map(({ label, value }) => {
                    const isSelected = formState.budget === value;
                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer flex-col items-center rounded-xl border px-3 py-3 text-center text-sm transition-colors ${
                          isSelected
                            ? "border-sky-500 bg-sky-50 font-semibold text-sky-800"
                            : "border-slate-200 hover:border-sky-200 hover:bg-sky-50/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="budget"
                          value={value}
                          checked={isSelected}
                          onChange={() => setField("budget", value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                {errors.budget && <p className="mt-1.5 text-xs text-red-500">{errors.budget}</p>}
              </fieldset>

              {/* Referral + Special Requests */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="referral_source"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    How did you hear about us?{" "}
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <select
                    id="referral_source"
                    value={formState.referral_source}
                    onChange={(event) => setField("referral_source", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">Select source</option>
                    {REFERRAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="special_requests"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Special Requests / Notes{" "}
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="special_requests"
                    rows={3}
                    placeholder="Medical conditions, accessibility needs, group discounts, custom itinerary..."
                    value={formState.special_requests}
                    onChange={(event) => setField("special_requests", event.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Consent */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${errors.consent ? "border-red-300 bg-red-50" : "border-slate-200"}`}
              >
                <input
                  type="checkbox"
                  checked={formState.consent}
                  onChange={(event) => setField("consent", event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-sky-600"
                />
                <span className="text-sm text-slate-700">
                  I agree to be contacted by{" "}
                  <strong>AndamanBazaar.in</strong> regarding this booking enquiry.{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.consent && <p className="text-xs text-red-500">{errors.consent}</p>}

              {submitError && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-sky-600 px-6 py-3.5 font-bold text-white shadow hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting…" : "🎯 Submit Request"}
              </button>

              <p className="text-center text-xs text-slate-400">
                We usually respond within <strong>12 hours</strong> of submission.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
