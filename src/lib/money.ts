// All money is stored as integer paise (₹1 = 100 paise).

/** Format paise as "₹1,234" (or "₹12.50" when there are paise). */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Convert a rupee amount (number or numeric string) to integer paise. */
export function toPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convert integer paise to a rupee number (for form inputs). */
export function toRupees(paise: number): number {
  return paise / 100;
}
