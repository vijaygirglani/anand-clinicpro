// ClinicPro Storage Adapter
// In Electron: uses file-based storage (data saved to disk permanently)
// In Browser: uses localStorage

const isElectron = typeof window !== 'undefined' && !!(window as any).electronStorage;

// Keys whose values are large enough that repeated localStorage / electronCache
// round-trips are measurably slow.  These are kept in a plain JS object so every
// read after the first is a single property lookup — no DOM API, no IPC.
const HEAVY_KEYS = ['cp_purchase_bills', 'cp_patient_bills', 'cp_stock_adjustments'];
const memoryCache: Record<string, string> = {};

export const storage = {
  getItem(key: string): string | null {
    // Fast path: heavy keys are served from the JS-level memory cache
    if (HEAVY_KEYS.includes(key) && memoryCache[key] !== undefined) {
      return memoryCache[key];
    }

    let result: string | null;

    if (isElectron) {
      if (electronCache[key] !== undefined) {
        result = electronCache[key];
      } else {
        // Fallback: check localStorage (for keys saved by old versions)
        const lsVal = localStorage.getItem(key);
        if (lsVal !== null) {
          // Migrate to cache + disk
          electronCache[key] = lsVal;
          (window as any).electronStorage.setItem(key, lsVal);
          localStorage.removeItem(key);
        }
        result = lsVal;
      }
    } else {
      result = localStorage.getItem(key);
    }

    // Populate memory cache on first read so subsequent calls skip this path
    if (HEAVY_KEYS.includes(key) && result !== null) {
      memoryCache[key] = result;
    }

    return result;
  },

  setItem(key: string, value: string): void {
    // Keep memory cache in sync so the next getItem sees the new value instantly
    if (HEAVY_KEYS.includes(key)) {
      memoryCache[key] = value;
    }

    if (isElectron) {
      electronCache[key] = value;
      (window as any).electronStorage.setItem(key, value);
      // Also keep in localStorage as backup for license reading
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    if (HEAVY_KEYS.includes(key)) {
      delete memoryCache[key];
    }

    if (isElectron) {
      delete electronCache[key];
      (window as any).electronStorage.removeItem(key);
      localStorage.removeItem(key);
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

    // Preload heavy keys into the memory cache so the very first read is instant
    for (const key of HEAVY_KEYS) {
      if (electronCache[key] !== undefined) memoryCache[key] = electronCache[key];
    }

    console.log(`[ClinicPro] Loaded ${keys.length} keys from disk storage`);
  } catch (e) {
    console.error('[ClinicPro] Failed to init electron storage:', e);
  }
}
