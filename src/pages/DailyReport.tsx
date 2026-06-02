import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getDailyProfitReport, getDoctors, saveDoctors, generateWhatsAppReport,
  exportBackup, type Doctor,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Copy, Settings, Save, Download } from "lucide-react";
import { format } from "date-fns";

export default function DailyReport() {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showSettings, setShowSettings] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>(() => getDoctors());

  const report = getDailyProfitReport(date);
  const whatsAppText = generateWhatsAppReport(date);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsAppText);
    toast({ title: "Copied to clipboard", description: "Paste in WhatsApp" });
  };

  const handleSaveDoctors = () => {
    const total = doctors.reduce((s, d) => s + d.profitSharePct, 0);
    if (total !== 100) return toast({ title: "Profit share must total 100%", variant: "destructive" });
    saveDoctors(doctors);
    setShowSettings(false);
    toast({ title: "Doctor settings saved" });
  };

  const handleBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicpro-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded" });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Daily Report</h1>
              <p className="text-sm text-slate-500">Profit & doctor sharing summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBackup}
              className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Backup
            </button>
            <button onClick={() => setShowSettings(s => !s)}
              className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Settings className="w-4 h-4" /> Doctor Settings
            </button>
          </div>
        </div>

        {/* Doctor Settings */}
        {showSettings && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Doctor Profit Share Settings</h2>
            {doctors.map((doc, idx) => (
              <div key={doc.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700">Doctor Name</label>
                  <input value={doc.name}
                    onChange={e => setDoctors(prev => prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d))}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="w-36">
                  <label className="text-sm font-medium text-slate-700">Profit Share %</label>
                  <input type="number" value={doc.profitSharePct} min={0} max={100}
                    onChange={e => setDoctors(prev => prev.map((d, i) => i === idx ? { ...d, profitSharePct: Number(e.target.value) } : d))}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">
                Total: <span className={`font-bold ${doctors.reduce((s, d) => s + d.profitSharePct, 0) === 100 ? "text-green-600" : "text-red-500"}`}>
                  {doctors.reduce((s, d) => s + d.profitSharePct, 0)}%
                </span> (must be 100%)
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSettings(false)}
                  className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSaveDoctors}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Picker */}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Select Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="mt-1 block border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Patients</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{report.totalPatients}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Consultation</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{report.consultationFees.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Med Sales</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{report.medicineSales.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Med Cost</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{report.medicineCost.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Med Profit</p>
            <p className="text-2xl font-bold text-green-700 mt-1">₹{report.medicineProfit.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Doctor Profit Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.doctors.map(({ doctor, consultationShare, medicineProfitShare, total }) => (
            <div key={doctor.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900">{doctor.name}</p>
                  <p className="text-xs text-slate-500">{doctor.profitSharePct}% profit share</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary">₹{total.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Consultation ({doctor.profitSharePct}%)</span>
                  <span className="font-semibold text-slate-800">₹{consultationShare.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Medicine Profit ({doctor.profitSharePct}%)</span>
                  <span className="font-semibold text-green-600">₹{medicineProfitShare.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2 mt-2">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Low Stock Alerts */}
        {report.lowStockAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-2">⚠️ Low Stock Alert</p>
            <div className="flex flex-wrap gap-2">
              {report.lowStockAlerts.map((a, i) => (
                <span key={i} className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  {a.name} — {a.currentStock} left
                </span>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp Report */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <p className="font-semibold text-slate-800">WhatsApp Report</p>
            <button onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <pre className="px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white">
            {whatsAppText}
          </pre>
        </div>
      </div>
    </Layout>
  );
}
