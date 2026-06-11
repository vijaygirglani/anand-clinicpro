export const PENDING_KEY = "cp_pending_fees";

export interface PendingEntry {
  id: string;
  patientId: number;
  patientName: string;
  patientMobile: string;
  amount: number;
  date: string;
  billDate: string;
  markedAt: string;
}

export function getPendingFees(): PendingEntry[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch { return []; }
}

/** One pending entry per mobile — replacing any prior entry for the same patient */
export function addPendingFee(e: PendingEntry) {
  const rest = getPendingFees().filter(x => x.patientMobile.replace(/\D/g,"") !== e.patientMobile.replace(/\D/g,""));
  localStorage.setItem(PENDING_KEY, JSON.stringify([...rest, e]));
}

export function removePendingFee(id: string) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(getPendingFees().filter(e => e.id !== id)));
}
