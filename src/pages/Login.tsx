import { useState } from "react";
import { getSettings, loginWithPassword } from "@/lib/settings";
import { Stethoscope, Eye, EyeOff, Lock } from "lucide-react";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const settings = getSettings();
  const [selected, setSelected] = useState<1 | 2 | null>(null);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = (id: 1 | 2) => {
    setSelected(id);
    setPassword("");
    setError("");
  };

  const handleLogin = () => {
    if (!selected) return;
    const ok = loginWithPassword(selected, password);
    if (ok) { onLogin(); }
    else { setError("Wrong password. Try again."); }
  };

  const doctor1HasPwd = !!settings.doctor1Password;
  const doctor2HasPwd = !!settings.doctor2Password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Clinic Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-4 border border-white/20">
            <span className="text-white font-bold text-2xl">CP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{settings.clinicName}</h1>
          {settings.clinicAddress && <p className="text-slate-400 text-sm mt-1">{settings.clinicAddress}</p>}
          <p className="text-slate-500 text-sm mt-3">Select your profile to login</p>
        </div>

        {/* Doctor Cards */}
        {!selected ? (
          <div className="space-y-4">
            {/* Doctor 1 */}
            <button onClick={() => handleSelect(1)}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-6 text-left transition-all duration-200 shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.99]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-100 font-semibold uppercase tracking-wider">Doctor 1</p>
                  <p className="text-lg font-bold text-white">{settings.doctor1Name}</p>
                  <p className="text-sm text-blue-100">{settings.doctor1Designation}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {doctor1HasPwd && <Lock className="w-4 h-4 text-blue-200" />}
                  <span className="bg-white/20 rounded-lg px-3 py-1 text-sm font-semibold">Select →</span>
                </div>
              </div>
            </button>

            {/* Doctor 2 */}
            <button onClick={() => handleSelect(2)}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl p-6 text-left transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.99]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-100 font-semibold uppercase tracking-wider">Doctor 2</p>
                  <p className="text-lg font-bold text-white">{settings.doctor2Name}</p>
                  <p className="text-sm text-emerald-100">{settings.doctor2Designation}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {doctor2HasPwd && <Lock className="w-4 h-4 text-emerald-200" />}
                  <span className="bg-white/20 rounded-lg px-3 py-1 text-sm font-semibold">Select →</span>
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Password Entry */
          <div className={`bg-white rounded-2xl p-6 shadow-xl border-t-4 ${selected === 1 ? "border-blue-500" : "border-emerald-500"}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected === 1 ? "bg-blue-100" : "bg-emerald-100"}`}>
                <Stethoscope className={`w-5 h-5 ${selected === 1 ? "text-blue-600" : "text-emerald-600"}`} />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {selected === 1 ? settings.doctor1Name : settings.doctor2Name}
                </p>
                <p className="text-xs text-slate-500">
                  {selected === 1 ? settings.doctor1Designation : settings.doctor2Designation}
                </p>
              </div>
            </div>

            {(selected === 1 ? doctor1HasPwd : doctor2HasPwd) ? (
              <>
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoFocus
                    placeholder="Enter your password"
                    className={`w-full border-2 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition-colors
                      ${error ? "border-red-400 focus:border-red-500" : selected === 1 ? "border-slate-200 focus:border-blue-500" : "border-slate-200 focus:border-emerald-500"}`}
                  />
                  <button onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                No password set — click Login to continue.
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setSelected(null); setError(""); }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                ← Back
              </button>
              <button onClick={handleLogin}
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-sm transition-colors
                  ${selected === 1 ? "bg-blue-500 hover:bg-blue-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                Login →
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">ClinicPro • All data stored locally</p>
      </div>
    </div>
  );
}
