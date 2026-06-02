import { useState } from "react";
import { completeSetup } from "@/lib/settings";
import { Building2, User, ChevronRight, CheckCircle2 } from "lucide-react";

interface Props {
  onDone: () => void;
}

export default function Setup({ onDone }: Props) {
  const [step, setStep] = useState(1);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [doctor1Name, setDoctor1Name] = useState("");
  const [doctor1Designation, setDoctor1Designation] = useState("MBBS");
  const [doctor2Name, setDoctor2Name] = useState("");
  const [doctor2Designation, setDoctor2Designation] = useState("MBBS");

  const handleFinish = () => {
    if (!clinicName.trim() || !doctor1Name.trim() || !doctor2Name.trim()) return;
    completeSetup({
      clinicName: clinicName.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicPhone: clinicPhone.trim(),
      doctor1Name: doctor1Name.trim(),
      doctor1Designation: doctor1Designation.trim(),
      doctor2Name: doctor2Name.trim(),
      doctor2Designation: doctor2Designation.trim(),
    });
    onDone();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">CP</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome to ClinicPro</h1>
          <p className="text-slate-500 mt-1">Let's set up your clinic in 2 steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${step > s ? "bg-green-500 text-white" : step === s ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm font-medium ${step === s ? "text-slate-900" : "text-slate-400"}`}>
                {s === 1 ? "Clinic Info" : "Doctors"}
              </span>
              {s < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Step 1 — Clinic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Clinic Information</h2>
                  <p className="text-sm text-slate-500">This will appear on all reports</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Clinic Name *</label>
                <input
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  placeholder="e.g. Manglam Skin Care Clinic"
                  className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Address</label>
                <input
                  value={clinicAddress}
                  onChange={e => setClinicAddress(e.target.value)}
                  placeholder="e.g. Main Road, Rajkot"
                  className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <input
                  value={clinicPhone}
                  onChange={e => setClinicPhone(e.target.value)}
                  placeholder="e.g. 99999 99999"
                  className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                onClick={() => clinicName.trim() && setStep(2)}
                disabled={!clinicName.trim()}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                Next — Add Doctors →
              </button>
            </div>
          )}

          {/* Step 2 — Doctors */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Doctor Details</h2>
                  <p className="text-sm text-slate-500">Add both doctors at your clinic</p>
                </div>
              </div>

              {/* Doctor 1 */}
              <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">Doctor 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Full Name *</label>
                    <input
                      value={doctor1Name}
                      onChange={e => setDoctor1Name(e.target.value)}
                      placeholder="e.g. Dr. Vijay Girglani"
                      className="mt-1 w-full border-2 border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Designation</label>
                    <input
                      value={doctor1Designation}
                      onChange={e => setDoctor1Designation(e.target.value)}
                      placeholder="e.g. B.A.M.S., C.S.D."
                      className="mt-1 w-full border-2 border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor 2 */}
              <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Doctor 2</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Full Name *</label>
                    <input
                      value={doctor2Name}
                      onChange={e => setDoctor2Name(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Shah"
                      className="mt-1 w-full border-2 border-emerald-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Designation</label>
                    <input
                      value={doctor2Designation}
                      onChange={e => setDoctor2Designation(e.target.value)}
                      placeholder="e.g. MBBS, MD"
                      className="mt-1 w-full border-2 border-emerald-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!doctor1Name.trim() || !doctor2Name.trim()}
                  className="flex-2 flex-grow bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Launch ClinicPro 🚀
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can change these settings anytime from the Settings page
        </p>
      </div>
    </div>
  );
}
