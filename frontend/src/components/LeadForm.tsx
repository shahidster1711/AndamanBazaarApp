import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { KNOWN_LOCATIONS } from "../lib/constants";
 
export type LeadFormPrefill = {
  activity?: string;
  location?: string;
};
 
type LeadFormProps = {
  availableActivities: string[];
  prefill?: LeadFormPrefill;
  autoFocus?: boolean;
  submitLabel?: string;
};
 
type FormState = {
  name: string;
  phone: string;
  email: string;
  preferred_date: string;
  locationChoice: string;
  locationOther: string;
  activities: string[];
  adults: string;
  children: string;
  swimming_ability: string;
  budgetChoice: string;
  referral_source: string;
  special_requests: string;
  consent: boolean;
};
 
type FormErrors = Partial<Record<keyof FormState, string>>;
 
const initialState: FormState = {
  name: "",
  phone: "",
  email: "",
  preferred_date: "",
  locationChoice: "",
  locationOther: "",
  activities: [],
  adults: "1",
  children: "0",
  swimming_ability: "",
  budgetChoice: "",
  referral_source: "",
  special_requests: "",
  consent: false,
};
 
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
const ACTIVITY_EMOJI: Record<string, string> = {
  "Scuba Diving": "🤿",
  "Sea Walking": "🚶",
  Snorkeling: "🐠",
  Parasailing: "🪂",
  "Jet Skiing": "🛥️",
  "Speed Boat": "⚡",
  "Banana Boat": "🍌",
  "Glass Bottom Boat": "🔭",
  "Semi-Submarine": "🚢",
  Kayaking: "🛶",
  "Mangrove Kayaking": "🛶",
  Windsurfing: "🏄",
  "Water Skiing": "🏄",
  "Sea Karting": "🏎️",
  "Sport Fishing": "🎣",
  Seaplane: "✈️",
  "Harbour Cruise": "🛳️",
  SUP: "🛶",
};
 
const BUDGET_OPTIONS: Array<{ value: string; label: string; budgetValue: number }> = [
  { value: "under_1000", label: "Under ₹1,000", budgetValue: 999 },
  { value: "1000_2500", label: "₹1,000 – ₹2,500", budgetValue: 2500 },
  { value: "2500_4500", label: "₹2,500 – ₹4,500", budgetValue: 4500 },
  { value: "4500_7000", label: "₹4,500 – ₹7,000", budgetValue: 7000 },
  { value: "7000_10000", label: "₹7,000 – ₹10,000", budgetValue: 10000 },
  { value: "above_10000", label: "Above ₹10,000", budgetValue: 15000 },
];
 
const today = new Date().toISOString().slice(0, 10);
 
const validate = (values: FormState): FormErrors => {
  const errors: FormErrors = {};
  const location = values.locationChoice === "__other__" ? values.locationOther.trim() : values.locationChoice.trim();
 
  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!values.phone.trim()) errors.phone = "Please enter your phone number.";
  if (!values.preferred_date) errors.preferred_date = "Please select a preferred date.";
  if (!location) errors.locationChoice = "Please choose a location.";
  if (values.locationChoice === "__other__" && !values.locationOther.trim())
    errors.locationOther = "Please enter your location.";
  if (values.activities.length === 0) errors.activities = "Select at least one activity.";
  if (Number(values.adults) < 1) errors.adults = "At least one adult is required.";
  if (!values.swimming_ability.trim()) errors.swimming_ability = "Please select your swimming ability.";
  if (!values.budgetChoice) errors.budgetChoice = "Please select your budget range per person.";
  if (values.email && !emailRegex.test(values.email)) errors.email = "Please enter a valid email.";
  if (!values.consent) errors.consent = "Consent is required to continue.";
 
  return errors;
};
 
const formatActivityLabel = (activity: string) => {
  const emoji = ACTIVITY_EMOJI[activity];
  return emoji ? `${emoji} ${activity}` : activity;
};
 
export const LeadForm = ({ availableActivities, prefill, autoFocus = false, submitLabel }: LeadFormProps) => {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
 
  const uniqueActivities = useMemo(() => {
    const merged = Array.from(new Set(availableActivities)).filter(Boolean);
    return merged.sort((a, b) => a.localeCompare(b));
  }, [availableActivities]);
 
  const locationOptions = useMemo(() => {
    const merged = Array.from(new Set(KNOWN_LOCATIONS)).filter(Boolean);
    return merged;
  }, []);
 
  useEffect(() => {
    const prefillLocation = (prefill?.location ?? "").trim();
    const prefillActivity = (prefill?.activity ?? "").trim();
 
    const locationIsKnown = prefillLocation && locationOptions.includes(prefillLocation);
    setFormState({
      ...initialState,
      locationChoice: locationIsKnown ? prefillLocation : prefillLocation ? "__other__" : "",
      locationOther: locationIsKnown ? "" : prefillLocation,
      activities: prefillActivity ? [prefillActivity] : [],
    });
    setErrors({});
    setSubmitError("");
    setIsSuccess(false);
 
    if (autoFocus) {
      const timer = window.setTimeout(() => firstInputRef.current?.focus(), 10);
      return () => window.clearTimeout(timer);
    }
 
    return;
  }, [autoFocus, locationOptions, prefill?.activity, prefill?.location]);
 
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
 
  const toggleActivity = (activity: string) => {
    setFormState((prev) => {
      const exists = prev.activities.includes(activity);
      const activities = exists ? prev.activities.filter((item) => item !== activity) : [...prev.activities, activity];
      return { ...prev, activities };
    });
    setErrors((prev) => ({ ...prev, activities: undefined }));
  };
 
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(formState);
    setErrors(nextErrors);
    setSubmitError("");
 
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
 
    const location =
      formState.locationChoice === "__other__" ? formState.locationOther.trim() : formState.locationChoice.trim();
 
    const budgetOption = BUDGET_OPTIONS.find((option) => option.value === formState.budgetChoice);
    const budgetValue = budgetOption?.budgetValue ?? 1500;
 
    const budgetNote = budgetOption ? `Budget range per person: ${budgetOption.label}` : "";
    const specialRequests = formState.special_requests.trim();
    const specialRequestsWithBudget =
      budgetNote && !specialRequests.includes("Budget range") ? [budgetNote, specialRequests].filter(Boolean).join("\n") : specialRequests;
 
    setIsSubmitting(true);
    try {
      await api.createLead({
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        email: formState.email.trim() || undefined,
        preferred_date: formState.preferred_date,
        location,
        activities: formState.activities,
        adults: Number(formState.adults),
        children: Number(formState.children || 0),
        swimming_ability: formState.swimming_ability.trim(),
        budget: budgetValue,
        referral_source: formState.referral_source.trim() || undefined,
        special_requests: specialRequestsWithBudget || undefined,
        consent: formState.consent,
      });
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };
 
  if (isSuccess) {
    return (
      <p className="rounded-md bg-emerald-50 p-4 font-medium text-emerald-800">
        Thank you — we will get back to you as soon as possible. We usually reach out within 12 hours of submission.
        Kindly wait.
      </p>
    );
  }
 
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name *
          </label>
          <input
            ref={firstInputRef}
            id="name"
            value={formState.name}
            onChange={(event) => setField("name", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            Phone *
          </label>
          <input
            id="phone"
            value={formState.phone}
            onChange={(event) => setField("phone", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(event) => setField("email", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="preferred_date" className="mb-1 block text-sm font-medium">
            Preferred Date *
          </label>
          <input
            id="preferred_date"
            type="date"
            min={today}
            value={formState.preferred_date}
            onChange={(event) => setField("preferred_date", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.preferred_date)}
          />
          {errors.preferred_date && <p className="mt-1 text-sm text-red-600">{errors.preferred_date}</p>}
        </div>
        <div>
          <label htmlFor="location_choice" className="mb-1 block text-sm font-medium">
            Location *
          </label>
          <select
            id="location_choice"
            value={formState.locationChoice}
            onChange={(event) => setField("locationChoice", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.locationChoice)}
          >
            <option value="">Select</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
            <option value="__other__">Other</option>
          </select>
          {errors.locationChoice && <p className="mt-1 text-sm text-red-600">{errors.locationChoice}</p>}
        </div>
        <div>
          <label htmlFor="location_other" className="mb-1 block text-sm font-medium">
            If other, type location
          </label>
          <input
            id="location_other"
            value={formState.locationOther}
            onChange={(event) => setField("locationOther", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            disabled={formState.locationChoice !== "__other__"}
            aria-invalid={Boolean(errors.locationOther)}
          />
          {errors.locationOther && <p className="mt-1 text-sm text-red-600">{errors.locationOther}</p>}
        </div>
        <div>
          <label htmlFor="swimming_ability" className="mb-1 block text-sm font-medium">
            Swimming Ability *
          </label>
          <select
            id="swimming_ability"
            value={formState.swimming_ability}
            onChange={(event) => setField("swimming_ability", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.swimming_ability)}
          >
            <option value="">Select</option>
            <option value="Non-swimmer">Non-swimmer</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          {errors.swimming_ability && <p className="mt-1 text-sm text-red-600">{errors.swimming_ability}</p>}
        </div>
        <div>
          <label htmlFor="adults" className="mb-1 block text-sm font-medium">
            Adults *
          </label>
          <input
            id="adults"
            type="number"
            min={1}
            value={formState.adults}
            onChange={(event) => setField("adults", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.adults)}
          />
          {errors.adults && <p className="mt-1 text-sm text-red-600">{errors.adults}</p>}
        </div>
        <div>
          <label htmlFor="children" className="mb-1 block text-sm font-medium">
            Children (below 12)
          </label>
          <input
            id="children"
            type="number"
            min={0}
            value={formState.children}
            onChange={(event) => setField("children", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="budget_choice" className="mb-1 block text-sm font-medium">
            Budget Range per Person *
          </label>
          <select
            id="budget_choice"
            value={formState.budgetChoice}
            onChange={(event) => setField("budgetChoice", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            aria-invalid={Boolean(errors.budgetChoice)}
          >
            <option value="">Select</option>
            {BUDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.budgetChoice && <p className="mt-1 text-sm text-red-600">{errors.budgetChoice}</p>}
        </div>
        <div>
          <label htmlFor="referral_source" className="mb-1 block text-sm font-medium">
            Referral Source
          </label>
          <input
            id="referral_source"
            value={formState.referral_source}
            onChange={(event) => setField("referral_source", event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Instagram, Google, Friend, Hotel, etc."
          />
        </div>
      </div>
 
      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Activities * (multi-select)</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {uniqueActivities.map((activity) => (
            <label key={activity} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.activities.includes(activity)}
                onChange={() => toggleActivity(activity)}
              />
              <span>{formatActivityLabel(activity)}</span>
            </label>
          ))}
        </div>
        {errors.activities && <p className="mt-1 text-sm text-red-600">{errors.activities}</p>}
      </fieldset>
 
      <div>
        <label htmlFor="special_requests" className="mb-1 block text-sm font-medium">
          Special Requests
        </label>
        <textarea
          id="special_requests"
          rows={3}
          value={formState.special_requests}
          onChange={(event) => setField("special_requests", event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Accessibility needs, medical notes, group discounts, underwater photos, etc."
        />
      </div>
 
      <label className="inline-flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={formState.consent}
          onChange={(event) => setField("consent", event.target.checked)}
          className="mt-1"
        />
        <span>I agree to be contacted by AndamanBazaar regarding this booking enquiry. *</span>
      </label>
      {errors.consent && <p className="text-sm text-red-600">{errors.consent}</p>}
 
      {submitError && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </p>
      )}
 
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Submitting..." : submitLabel ?? "Submit Request"}
      </button>
    </form>
  );
};
