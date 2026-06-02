// ClinicPro — Clinic & Doctor Settings
// All keys use cp_settings_ prefix

export interface ClinicSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctor1Name: string;
  doctor1Designation: string;
  doctor2Name: string;
  doctor2Designation: string;
  isSetupDone: boolean;
}

export interface ActiveSession {
  doctorId: 1 | 2;
  loginTime: string;
}

const SETTINGS_KEY = "cp_clinic_settings";
const SESSION_KEY = "cp_active_session";

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "My Clinic",
  clinicAddress: "",
  clinicPhone: "",
  doctor1Name: "Doctor 1",
  doctor1Designation: "MBBS",
  doctor2Name: "Doctor 2",
  doctor2Designation: "MBBS",
  isSetupDone: false,
};

export function getSettings(): ClinicSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<ClinicSettings>) {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

export function isSetupDone(): boolean {
  return getSettings().isSetupDone;
}

export function completeSetup(settings: Omit<ClinicSettings, "isSetupDone">) {
  saveSettings({ ...settings, isSetupDone: true });
}

// ── Session (who is logged in) ──────────────────────────────

export function getActiveSession(): ActiveSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function login(doctorId: 1 | 2) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    doctorId,
    loginTime: new Date().toISOString(),
  }));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getActiveDoctor(): { id: 1 | 2; name: string; designation: string } | null {
  const session = getActiveSession();
  if (!session) return null;
  const settings = getSettings();
  return {
    id: session.doctorId,
    name: session.doctorId === 1 ? settings.doctor1Name : settings.doctor2Name,
    designation: session.doctorId === 1 ? settings.doctor1Designation : settings.doctor2Designation,
  };
}
