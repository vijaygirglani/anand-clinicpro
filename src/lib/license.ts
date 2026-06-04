// ── src/lib/license.ts ──────────────────────────────────────────────────────
// Manglam ClinicPro — License System
// Key format: MNGM-XXXX-XXXX-XXXX-XXXX

const LICENSE_STORAGE_KEY = "manglam_license_key";
const SECRET_SALT = "MNGM2024CLPRO";
const GRACE_DAYS = 7;
const WARNING_DAYS = 30;

export interface LicenseInfo {
  valid: boolean;
  clinicName: string;
  expiryDate: Date;
  daysLeft: number;
  graceDaysLeft: number;
  status: "active" | "warning" | "grace" | "blocked";
}

// ── Checksum ─────────────────────────────────────────────────────────────────
function checksum(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return Math.abs(h).toString(36).toUpperCase().padStart(8, "0");
}

// ── Key generation (used in keygen.html too, duplicated there in plain JS) ──
export function generateLicenseKey(clinicName: string, expiryYYYYMMDD: string): string {
  const payload = `${clinicName.trim().toUpperCase()}::${expiryYYYYMMDD}`;
  const cs = checksum(payload + SECRET_SALT);
  // Encode payload to base36-like string
  const encoded = btoa(unescape(encodeURIComponent(payload + "::" + cs)))
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .padEnd(16, "0")
    .substring(0, 16);
  return `MNGM-${encoded.slice(0,4)}-${encoded.slice(4,8)}-${encoded.slice(8,12)}-${encoded.slice(12,16)}`;
}

// ── Decode ───────────────────────────────────────────────────────────────────
export function decodeLicenseKey(key: string): { clinicName: string; expiryDate: string } | null {
  try {
    const clean = key.trim().toUpperCase().replace(/\s/g, "");
    if (!clean.startsWith("MNGM-")) return null;
    const parts = clean.split("-");
    // parts: ["MNGM", "XXXX", "XXXX", "XXXX", "XXXX"]
    if (parts.length !== 5) return null;
    const encoded = parts.slice(1).join("");
    // Pad with = for base64
    const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    let decoded: string;
    try {
      decoded = decodeURIComponent(escape(atob(padded)));
    } catch {
      return null;
    }
    const segments = decoded.split("::");
    if (segments.length < 3) return null;
    const clinicName = segments[0];
    const expiryDate = segments[1];
    const storedCs = segments[2];
    const payload = `${clinicName}::${expiryDate}`;
    const expectedCs = checksum(payload + SECRET_SALT);
    if (storedCs !== expectedCs) return null;
    // Validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return null;
    return { clinicName, expiryDate };
  } catch {
    return null;
  }
}

// ── Storage ──────────────────────────────────────────────────────────────────
export function saveLicenseKey(key: string): void {
  localStorage.setItem(LICENSE_STORAGE_KEY, key.trim().toUpperCase());
}

export function getSavedKey(): string | null {
  return localStorage.getItem(LICENSE_STORAGE_KEY);
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

// ── Status ───────────────────────────────────────────────────────────────────
export function getLicenseInfo(): LicenseInfo {
  const key = getSavedKey();
  const blocked: LicenseInfo = {
    valid: false, clinicName: "",
    expiryDate: new Date(), daysLeft: -999,
    graceDaysLeft: 0, status: "blocked",
  };

  if (!key) return blocked;
  const decoded = decodeLicenseKey(key);
  if (!decoded) return blocked;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(decoded.expiryDate + "T00:00:00");
  const msPerDay = 86400000;
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / msPerDay);
  const graceDaysLeft = daysLeft < 0 ? Math.max(0, GRACE_DAYS + daysLeft) : GRACE_DAYS;

  let status: LicenseInfo["status"];
  if (daysLeft > WARNING_DAYS)       status = "active";
  else if (daysLeft > 0)             status = "warning";
  else if (graceDaysLeft > 0)        status = "grace";
  else                               status = "blocked";

  return {
    valid: status !== "blocked",
    clinicName: decoded.clinicName,
    expiryDate: expiry,
    daysLeft,
    graceDaysLeft,
    status,
  };
}

export function isLicenseBlocked(): boolean {
  return getLicenseInfo().status === "blocked";
}
