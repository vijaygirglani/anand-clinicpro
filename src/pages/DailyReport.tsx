import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getDailyProfitReport as getInventoryReport, getPatientBillsByDate, getExpensesByDateRange } from "@/lib/inventory";
import { getDailyProfitReport, generateWhatsAppReport, exportBackup } from "@/lib/store";
import { getSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Copy, Download, Users, IndianRupee, Pill, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function DailyReport() {
  const { toast } = useToast();
  const settings = getSettings();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Get patients from store for consultation fees
  const { getPatientsByDate } = require("@/lib/store");
  
  // Use inventory-based profit report (reads from cp_patient_bills)
  const patientBills = getPatientBillsByDate(date);
  
  // Fall back to store report for consultation data, but add med profit from inventory
  const storeReport = getDailyProfitReport(date, {
    doctor1Name: settings.doctor1Name,
    doctor2Name: settings.doctor2Name,
  });

  // Override med stats with inventory data
  const d1Bills = patientBills.filter(b => b.doctorId === 1);
  const d2Bills = patientBills.filter(b => b.doctorId === 2);
  
  const report = {
    ...storeReport,
    doctor1: {
      ...storeReport.doctor1,
      medicineSales: d1Bills.reduce((s, b) => s + b.totalSale, 0),
      medicineCost: d1Bills.reduce((s, b) => s + b.totalCost, 0),
      medicineProfit: d1Bills.reduce((s, b) => s + b.totalProfit, 0),
      total: storeReport.doctor1.consultationFees + d1Bills.reduce((s, b) => s + b.totalProfit, 0),
    },
    doctor2: {
      ...storeReport.doctor2,
      medicineSales: d2Bills.reduce((s, b) => s + b.totalSale, 0),
      medicineCost: d2Bills.reduce((s, b) => s + b.totalCost, 0),
      medicineProfit: d2Bills.reduce((s, b) => s + b.totalProfit, 0),
      total: storeReport.doctor2.consultationFees + d2Bills.reduce((s, b) => s + b.totalProfit, 0),
    },
    totalMedicineSales: patientBills.reduce((s, b) => s + b.totalSale, 0),
    totalMedicineProfit: patientBills.reduce((s, b) => s + b.totalProfit, 0),
  };

  const whatsAppText = generateWhatsAppReport(date, settings.clinicName, {
    doctor1Name: settings.doctor1Name,
    doctor2Name: settings.doctor2Name,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText);
    toast({ title: "Copied! Paste in WhatsApp" });
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

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const StatCard = ({ label, value, sub, color = "slate" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm`}>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 text-${color === "green" ? "green-600" : "slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

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
              <p className="text-sm text-slate-500">{settings.clinicName}</p>
            </div>
          </div>
          <button onClick={handleBackup}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Backup
          </button>
        </div>

        {/* Date */}
        <div>
          <label className="text-sm font-semibold text-slate-700">Select Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="mt-1.5 block border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>

        {/* Clinic Total Cards */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinic Total</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Patients" value={String(report.totalPatients)} />
            <StatCard label="Total Collection" value={fmt(report.totalConsultation)} />
            <StatCard label="Med Profit" value={fmt(report.totalMedicineProfit)} color="green" />
            <StatCard label="Grand Total" value={fmt(report.grandTotal)} color="green"
              sub={`Cost: ${fmt(report.totalMedicineCost)}`} />
          </div>
        </div>

        {/* Per Doctor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Doctor 1 — Blue */}
          <div className="bg-white border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Doctor 1</p>
              <p className="text-white font-bold text-lg">{settings.doctor1Name}</p>
              <p className="text-blue-100 text-xs">{settings.doctor1Designation}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4 text-blue-400" />Patients</span>
                <span className="font-bold text-slate-900">{report.doctor1.patients}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><IndianRupee className="w-4 h-4 text-blue-400" />Consultation</span>
                <span className="font-bold text-slate-900">{fmt(report.doctor1.consultationFees)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-blue-400" />Med Sales</span>
                <span className="font-bold text-slate-900">{fmt(report.doctor1.medicineSales)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-slate-400" />Med Cost</span>
                <span className="font-semibold text-slate-500">{fmt(report.doctor1.medicineCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><TrendingUp className="w-4 h-4 text-green-400" />Med Profit</span>
                <span className="font-bold text-green-600">{fmt(report.doctor1.medicineProfit)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-bold text-blue-600 text-lg">{fmt(report.doctor1.total)}</span>
              </div>
            </div>
          </div>

          {/* Doctor 2 — Emerald */}
          <div className="bg-white border-2 border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4">
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Doctor 2</p>
              <p className="text-white font-bold text-lg">{settings.doctor2Name}</p>
              <p className="text-emerald-100 text-xs">{settings.doctor2Designation}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4 text-emerald-400" />Patients</span>
                <span className="font-bold text-slate-900">{report.doctor2.patients}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><IndianRupee className="w-4 h-4 text-emerald-400" />Consultation</span>
                <span className="font-bold text-slate-900">{fmt(report.doctor2.consultationFees)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-emerald-400" />Med Sales</span>
                <span className="font-bold text-slate-900">{fmt(report.doctor2.medicineSales)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-slate-400" />Med Cost</span>
                <span className="font-semibold text-slate-500">{fmt(report.doctor2.medicineCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><TrendingUp className="w-4 h-4 text-green-400" />Med Profit</span>
                <span className="font-bold text-green-600">{fmt(report.doctor2.medicineProfit)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-bold text-emerald-600 text-lg">{fmt(report.doctor2.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock */}
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
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <pre className="px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap font-mono">{whatsAppText}</pre>
        </div>

      </div>
    </Layout>
  );
}
