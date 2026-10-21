/**
 * Client-safe helpers for the IPD room-status board. Kept free of any
 * database import so it can be used directly in client components.
 */

/**
 * Groups admissions by ward and exposes each bed's occupant so the Room Status
 * screen can render a live grid. `wards` seeds the board with empty wards so
 * a ward with no activity is still shown.
 */
export function buildWardBoard(admissions = [], wards = []) {
  const known = new Set(wards);
  for (const admission of admissions) {
    if (admission.ward) known.add(admission.ward);
  }

  const byWard = new Map([...known].map((ward) => [ward, []]));
  for (const admission of admissions) {
    if (!admission.ward) continue;
    if (!byWard.has(admission.ward)) byWard.set(admission.ward, []);
    byWard.get(admission.ward).push(admission);
  }

  return [...byWard.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ward, occupants]) => {
      const beds = occupants
        .map((occupant) => ({
          bed: occupant.bed || occupant.room || "—",
          room: occupant.room || "",
          occupied: occupant.status === "Admitted",
          admission: occupant,
        }))
        .sort((a, b) => a.bed.localeCompare(b.bed));
      const occupied = beds.filter((bed) => bed.occupied).length;
      return {
        ward,
        beds,
        total: beds.length,
        occupied,
        available: beds.length - occupied,
      };
    });
}
