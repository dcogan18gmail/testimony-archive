"use client";

import { useState, useEffect, useCallback } from "react";

type MetadataEditorProps = {
  eventName: string | null;
  eventLocation: string | null;
  interviewer: string | null;
  organization: string | null;
  onSave: (metadata: {
    eventName: string;
    eventLocation: string;
    interviewer: string;
    organization: string;
  }) => void;
  readOnly?: boolean;
};

const FIELDS = [
  { key: "eventName", label: "Event Name" },
  { key: "eventLocation", label: "Location" },
  { key: "interviewer", label: "Interviewer" },
  { key: "organization", label: "Organization" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function MetadataEditor({
  eventName,
  eventLocation,
  interviewer,
  organization,
  onSave,
  readOnly,
}: MetadataEditorProps) {
  const initial = useCallback(
    () => ({
      eventName: eventName ?? "",
      eventLocation: eventLocation ?? "",
      interviewer: interviewer ?? "",
      organization: organization ?? "",
    }),
    [eventName, eventLocation, interviewer, organization]
  );

  const [values, setValues] = useState(initial);
  const [showCheck, setShowCheck] = useState(false);

  // Sync when props change (e.g. after external update)
  useEffect(() => {
    setValues(initial());
  }, [initial]);

  const isDirty =
    values.eventName !== (eventName ?? "") ||
    values.eventLocation !== (eventLocation ?? "") ||
    values.interviewer !== (interviewer ?? "") ||
    values.organization !== (organization ?? "");

  function handleChange(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(values);
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 2000);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted mb-3">
        Metadata
      </h3>

      {FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label className="block text-[11px] uppercase tracking-[0.03em] text-muted mb-1">
            {label}
          </label>

          {readOnly ? (
            <p className="text-[13px] text-heading">
              {values[key] || <span className="text-faint">&mdash;</span>}
            </p>
          ) : (
            <input
              type="text"
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full border border-border rounded px-2 py-1.5 text-[13px]
                         text-heading focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className={`text-[13px] px-3 py-1 rounded transition-colors ${
              isDirty
                ? "bg-accent text-white hover:bg-accent-hover cursor-pointer"
                : "bg-subtle text-faint cursor-not-allowed"
            }`}
          >
            Save
          </button>

          <span
            className={`text-success text-[13px] transition-opacity duration-500 ${
              showCheck ? "opacity-100" : "opacity-0"
            }`}
          >
            &#10003; Saved
          </span>
        </div>
      )}
    </div>
  );
}
