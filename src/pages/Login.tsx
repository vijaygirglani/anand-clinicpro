import { getSettings, login } from "@/lib/settings";
import { Stethoscope } from "lucide-react";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const settings = getSettings();

  const handleLogin = (doctorId: 1 | 2) => {
    login(doctorId);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Clinic Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5 border border-white/20">
            <span className="text-white font-bold text-3xl">CP</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{settings.clinicName}</h1>
          {settings.clinicAddress && (
            <p className="text-slate-400 text-sm mt-1">{settings.clinicAddress}</p>
          )}
          <p className="text-slate-500 text-sm mt-4">Select your profile to continue</p>
        </div>

        {/* Doctor Cards */}
        <div className="space-y-4">

          {/* Doctor 1 — Blue theme */}
          <button
            onClick={() => handleLogin(1)}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-6 text-left transition-all duration-200 shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.99]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 right-8 w-20 h-20 bg-white/5 rounded-full translate-y-10" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-100 font-semibold uppercase tracking-wider mb-0.5">Doctor 1</p>
                <p className="text-xl font-bold text-white">{settings.doctor1Name}</p>
                <p className="text-sm text-blue-100">{settings.doctor1Designation}</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold">Login →</div>
              </div>
            </div>
          </button>

          {/* Doctor 2 — Emerald theme */}
          <button
            onClick={() => handleLogin(2)}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl p-6 text-left transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.99]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 right-8 w-20 h-20 bg-white/5 rounded-full translate-y-10" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-100 font-semibold uppercase tracking-wider mb-0.5">Doctor 2</p>
                <p className="text-xl font-bold text-white">{settings.doctor2Name}</p>
                <p className="text-sm text-emerald-100">{settings.doctor2Designation}</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold">Login →</div>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          ClinicPro • Offline • All data stored locally
        </p>
      </div>
    </div>
  );
}
