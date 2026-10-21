/** Client-safe Diagnostic constants (X-Ray/Scan/Specialty/Physio/Dialysis). */

export const DIAG_MODULES = {
  xray: { id: 104, slug: "xray", title: "X-Ray", orderPrefix: "XRAY", resultPrefix: "XRRES", externalPrefix: "XREXT", sponsorPrefix: "XRSD" },
  scan: { id: 105, slug: "scan", title: "Scan", orderPrefix: "SCAN", resultPrefix: "SCRES", externalPrefix: "SCEXT", sponsorPrefix: "SCSD" },
  "specialty-tests": { id: 106, slug: "specialty-tests", title: "Specialty Tests", orderPrefix: "SPT", resultPrefix: "SPRES", externalPrefix: "SPEXT", sponsorPrefix: "SPSD" },
  physiotherapy: { id: 107, slug: "physiotherapy", title: "Physiotherapy", orderPrefix: "PHY", resultPrefix: "PHRES", externalPrefix: "PHEXT", sponsorPrefix: "PHSD" },
  dialysis: { id: 108, slug: "dialysis", title: "Dialysis", orderPrefix: "DIA", resultPrefix: "DIRES", externalPrefix: "DIEXT", sponsorPrefix: "DISD" },
};

export const DIAG_ORDER_STATUSES = ["Received", "Processing", "Reported", "Completed", "Cancelled"];
export const DIAG_RESULT_STATUSES = ["Pending", "Final", "Dispatched"];
export const DIAG_PRIORITIES = ["Routine", "Urgent", "STAT"];
export const DIAG_MODES = ["Cash", "Card", "UPI", "Insurance", "Credit", "Sponsor"];
export const DIAG_SAMPLE_TYPES = ["Film", "Image", "Slide", "Sample", "Other"];

export function getDiagModule(slug) {
  return DIAG_MODULES[slug] || null;
}
