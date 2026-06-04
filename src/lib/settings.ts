import { storage } from "./storage";

export interface ClinicSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctor1Name: string;
  doctor1Designation: string;
  doctor1Password: string;
  doctor2Name: string;
  doctor2Designation: string;
  doctor2Password: string;
  isSetupDone: boolean;
}

export interface ActiveSession {
  doctorId: 1 | 2;
  loginTime: string;
}

const SETTINGS_KEY = "cp_clinic_settings";
const SESSION_KEY  = "cp_active_session";

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "My Clinic",
  clinicAddress: "",
  clinicPhone: "",
  doctor1Name: "Doctor 1",
  doctor1Designation: "MBBS",
  doctor1Password: "",
  doctor2Name: "Doctor 2",
  doctor2Designation: "MBBS",
  doctor2Password: "",
  isSetupDone: false,
};

export function getSettings(): ClinicSettings {
  try {
    const stored = storage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: Partial<ClinicSettings>) {
  const current = getSettings();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

export function isSetupDone(): boolean {
  return getSettings().isSetupDone;
}

export function completeSetup(settings: Omit<ClinicSettings, "isSetupDone">) {
  saveSettings({ ...settings, isSetupDone: true });
}

export function isAdmin(): boolean {
  const session = getActiveSession();
  return session?.doctorId === 1;
}

export function loginWithPassword(doctorId: 1 | 2, password: string): boolean {
  const s = getSettings();
  const correctPwd = doctorId === 1 ? s.doctor1Password : s.doctor2Password;
  if (correctPwd && correctPwd !== password) return false;
  // ── No persistent session — store in sessionStorage so it clears on app close ──
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    doctorId,
    loginTime: new Date().toISOString(),
  }));
  return true;
}

export function login(doctorId: 1 | 2) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    doctorId,
    loginTime: new Date().toISOString(),
  }));
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getActiveSession(): ActiveSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function getActiveDoctor(): { id: 1 | 2; name: string; designation: string } | null {
  const session = getActiveSession();
  if (!session) return null;
  const s = getSettings();
  return {
    id: session.doctorId,
    name: session.doctorId === 1 ? s.doctor1Name : s.doctor2Name,
    designation: session.doctorId === 1 ? s.doctor1Designation : s.doctor2Designation,
  };
}