"use client";

// Triggers the browser print dialog (Save as PDF). Hidden in the printout itself.
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Save as PDF / Print
    </button>
  );
}
