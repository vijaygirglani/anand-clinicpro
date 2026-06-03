// ClinicPro Storage Adapter
// In Electron: uses file-based storage (data saved to disk permanently)
// In Browser: uses localStorage

const isElectron = typeof window !== 'undefined' && !!(window as any).electronStorage;

export const storage = {
  getItem(key: string): string | null {
    if (isElectron) {
      // Electron: sync via cached data
      // We use a synchronous cache that gets populated on first load
      return electronCache[key] ?? null;
    }
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (isElectron) {
      electronCache[key] = value;
      (window as any).electronStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    if (isElectron) {
      delete electronCache[key];
      (window as any).electronStorage.removeItem(key);
    } else {
      localStorage.removeItem(key);
    }
  },
};

// Synchronous cache for Electron (populated at startup)
const electronCache: Record<string, string> = {};

// Initialize Electron storage — load all data into cache synchronously
export async function initElectronStorage(): Promise<void> {
  if (!isElectron) return;
  try {
    const es = (window as any).electronStorage;
    const keys: string[] = await es.keys();
    await Promise.all(keys.map(async (key: string) => {
      const val = await es.getItem(key);
      if (val !== null) electronCache[key] = val;
    }));
    console.log(`[ClinicPro] Loaded ${keys.length} keys from disk storage`);
  } catch (e) {
    console.error('[ClinicPro] Failed to init electron storage:', e);
  }
}
