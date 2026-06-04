// ── src/lib/license.ts ──────────────────────────────────────────────────────
import { storage } from "./storage";

const LICENSE_KEY   = "manglam_license_key";
const SECRET_SALT   = "MNGM2024CLPRO";
const GRACE_DAYS    = 7;
const WARNING_DAYS  = 30;

export interface LicenseInfo {
  valid: boolean;
  expiryDate: Date;
  daysLeft: number;
  graceDaysLeft: number;
  status: "active" | "warning" | "grace" | "blocked";
}

function hash32(str: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0));
}

function toB36(n: number): string {
  return Math.abs(Math.floor(n)).toString(36).toUpperCase().padStart(4, "0").substring(0, 4);
}

export function generateLicenseKey(expiryDate: string): string {
  const days = Math.floor(new Date(expiryDate + "T00:00:00").getTime() / 86400000);
  const daysStr = days.toString(36).toUpperCase().padStart(6, "0");
  const h1 = toB36(hash32(daysStr + SECRET_SALT + "A"));
  const h2 = toB36(hash32(daysStr + SECRET_SALT + "B"));
  const h3 = toB36(hash32(daysStr + SECRET_SALT + "C"));
  return `MNGM-${daysStr}-${h1}-${h2}-${h3}`;
}

export function decodeLicenseKey(key: string): { expiryDate: string } | null {
  try {
    const parts = key.trim().toUpperCase().split("-");
    if (parts.length !== 5 || parts[0] !== "MNGM") return null;
    const daysStr = parts[1];
    const h1 = parts[2], h2 = parts[3], h3 = parts[4];
    const days = parseInt(daysStr, 36);
    if (isNaN(days) || days < 10000) return null;
    const eh1 = toB36(hash32(daysStr + SECRET_SALT + "A"));
    const eh2 = toB36(hash32(daysStr + SECRET_SALT + "B"));
    const eh3 = toB36(hash32(daysStr + SECRET_SALT + "C"));
    if (h1 !== eh1 || h2 !== eh2 || h3 !== eh3) return null;
    const expiryDate = new Date(days * 86400000).toISOString().split("T")[0];
    return { expiryDate };
  } catch {
    return null;
  }
}

// ── Use storage adapter (works in both Electron and browser) ─────────────────
export function saveLicenseKey(key: string): void {
  storage.setItem(LICENSE_KEY, key.trim().toUpperCase());
}
export function getSavedKey(): string | null {
  return storage.getItem(LICENSE_KEY);
}
export function clearLicense(): void {
  storage.removeItem(LICENSE_KEY);
}

export function getLicenseInfo(): LicenseInfo {
  const blocked: LicenseInfo = {
    valid: false, expiryDate: new Date(),
    daysLeft: -999, graceDaysLeft: 0, status: "blocked",
  };
  const key = getSavedKey();
  if (!key) return blocked;
  const decoded = decodeLicenseKey(key);
  if (!decoded) return blocked;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(decoded.expiryDate + "T00:00:00");
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  const graceDaysLeft = daysLeft < 0 ? Math.max(0, GRACE_DAYS + daysLeft) : GRACE_DAYS;

  let status: LicenseInfo["status"];
  if (daysLeft > WARNING_DAYS)  status = "active";
  else if (daysLeft > 0)        status = "warning";
  else if (graceDaysLeft > 0)   status = "grace";
  else                          status = "blocked";

  return { valid: status !== "blocked", expiryDate: expiry, daysLeft, graceDaysLeft, status };
}

export function isLicenseBlocked(): boolean {
  return getLicenseInfo().status === "blocked";
}