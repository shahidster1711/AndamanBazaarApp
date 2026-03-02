import { useEffect } from "react";
import { LeadForm, type LeadFormPrefill } from "./LeadForm";

type LeadFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableActivities: string[];
  prefill?: {
    activity?: string;
    location?: string;
  };
};

export const LeadFormModal = ({
  isOpen,
  onClose,
  availableActivities,
  prefill,
}: LeadFormModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const leadPrefill: LeadFormPrefill | undefined = prefill
    ? { activity: prefill.activity, location: prefill.location }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 id="lead-form-title" className="text-xl font-bold">
            Request Booking
          </h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 hover:bg-slate-100">
            Close
          </button>
        </div>
        <LeadForm availableActivities={availableActivities} prefill={leadPrefill} autoFocus />
      </section>
    </div>
  );
};
