"use client";

import { useState } from "react";

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "month"
  | "checkbox"
  | "textarea";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
};

const inputCls =
  "rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800";

function Field({ f }: { f: FieldDef }) {
  const dv = f.defaultValue;
  if (f.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={f.name} defaultChecked={Boolean(dv)} />
        <span>{f.label}</span>
      </label>
    );
  }
  return (
    <label className="grid gap-1">
      <span className="text-xs text-gray-500">
        {f.label}
        {f.required ? " *" : ""}
      </span>
      {f.type === "select" ? (
        <select
          name={f.name}
          required={f.required}
          defaultValue={dv == null ? "" : String(dv)}
          className={inputCls}
        >
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.type === "textarea" ? (
        <textarea
          name={f.name}
          required={f.required}
          placeholder={f.placeholder}
          defaultValue={dv == null ? "" : String(dv)}
          className={inputCls}
          rows={2}
        />
      ) : (
        <input
          name={f.name}
          type={
            f.type === "number"
              ? "number"
              : f.type === "date"
                ? "date"
                : f.type === "month"
                  ? "month"
                  : "text"
          }
          step={f.step}
          inputMode={f.type === "number" ? "decimal" : undefined}
          required={f.required}
          placeholder={f.placeholder}
          defaultValue={dv == null ? "" : String(dv)}
          className={inputCls}
        />
      )}
    </label>
  );
}

// Generic collapsible create/edit form driven entirely by field-input definitions.
export default function RecordForm({
  action,
  fields,
  hidden,
  addLabel = "+ Add",
  editLabel = "Edit",
  mode,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: FieldDef[];
  hidden?: Record<string, string>;
  addLabel?: string;
  editLabel?: string;
  mode: "create" | "edit";
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        {mode === "create" ? addLabel : editLabel}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setOpen(false);
      }}
      className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {fields.map((f) => (
        <Field key={f.name} f={f} />
      ))}
      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
