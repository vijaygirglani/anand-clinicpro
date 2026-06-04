// ── src/components/LicenseGate.tsx ──────────────────────────────────────────
import { useState } from "react";
import { getLicenseInfo, saveLicenseKey, decodeLicenseKey } from "@/lib/license";
import { ShieldCheck, KeyRound, AlertTriangle, Eye, EyeOff } from "lucide-react";

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const [key, setKey]         = useState("");
  const [error, setError]     = useState("");
  const [showKey, setShowKey] = useState(false);

  const info = getLicenseInfo();

  if (info.status !== "blocked") return <>{children}</>;

  const isExpired = info.daysLeft < -7;

  const handleActivate = () => {
    setError("");
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) { setError("Please enter a license key."); return; }
    const decoded = decodeLicenseKey(trimmed);
    if (!decoded) { setError("Invalid key. Please check and try again."); return; }
    const expiry = new Date(decoded.expiryDate + "T00:00:00");
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < -7) { setError("This key has already expired. Please contact Manglam ClinicPro for a new key."); return; }
    saveLicenseKey(trimmed);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Manglam ClinicPro</h1>
          <p className="text-slate-400 text-sm">Clinic Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-5 text-center"
            style={{ background: isExpired ? "linear-gradient(135deg,#fef2f2,#fee2e2)" : "linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
            {isExpired ? (
              <>
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h2 className="text-lg font-black text-red-800">License Expired</h2>
                <p className="text-sm text-red-600 mt-1">Your grace period has ended. Please renew your license.</p>
              </>
            ) : (
              <>
                <KeyRound className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h2 className="text-lg font-black text-slate-800">Activate ClinicPro</h2>
                <p className="text-sm text-slate-500 mt-1">Enter your license key to get started</p>
              </>
            )}
          </div>

          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">License Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={key}
                  onChange={e => { setKey(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleActivate()}
                  placeholder="MNGM-XXXXXX-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-indigo-400 font-mono text-sm tracking-wider"
                />
                <button type="button" onClick={() => setShowKey(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <button onClick={handleActivate}
              className="w-full py-3.5 rounded-xl font-black text-white text-sm shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              Activate License
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">Need a license key?</p>
              <p className="text-xs font-semibold text-indigo-600 mt-1">Contact: Manglam ClinicPro Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
