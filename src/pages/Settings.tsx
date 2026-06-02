import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getSettings, saveSettings, logout, type ClinicSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Building2, User, LogOut, Save } from "lucide-react";

interface Props {
  onLogout: () => void;
}

export default function Settings({ onLogout }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClinicSettings>(() => getSettings());

  const update = (field: keyof ClinicSettings, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.clinicName.trim() || !form.doctor1Name.trim() || !form.doctor2Name.trim()) {
      return toast({ title: "Clinic name and both doctor names are required", variant: "destructive" });
    }
    saveSettings(form);
    toast({ title: "Settings saved ✓" });
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500">Edit clinic and doctor information</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Switch Doctor
          </button>
        </div>

        {/* Clinic Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-slate-900">Clinic Information</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Clinic Name *</label>
            <input value={form.clinicName} onChange={e => update("clinicName", e.target.value)}
              className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Address</label>
            <input value={form.clinicAddress} onChange={e => update("clinicAddress", e.target.value)}
              className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <input value={form.clinicPhone} onChange={e => update("clinicPhone", e.target.value)}
              className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        {/* Doctor 1 */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-blue-900">Doctor 1</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Full Name *</label>
            <input value={form.doctor1Name} onChange={e => update("doctor1Name", e.target.value)}
              className="mt-1.5 w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Designation</label>
            <input value={form.doctor1Designation} onChange={e => update("doctor1Designation", e.target.value)}
              placeholder="e.g. MBBS, MD"
              className="mt-1.5 w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white transition-colors" />
          </div>
        </div>

        {/* Doctor 2 */}
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-emerald-900">Doctor 2</h2>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Full Name *</label>
            <input value={form.doctor2Name} onChange={e => update("doctor2Name", e.target.value)}
              className="mt-1.5 w-full border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Designation</label>
            <input value={form.doctor2Designation} onChange={e => update("doctor2Designation", e.target.value)}
              placeholder="e.g. MBBS, MD"
              className="mt-1.5 w-full border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white transition-colors" />
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </Layout>
  );
}
