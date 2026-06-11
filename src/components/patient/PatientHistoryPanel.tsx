import React, { useState, useEffect } from "react";
import {
  lookupByComplaint, lookupByAddress,
  type Patient,
} from "@/lib/store";
import {
  User, FileText, Search, Activity, MapPin, RefreshCw,
  SlidersHorizontal, WalletCards, CheckCircle2, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { removePendingFee, type PendingEntry } from "@/lib/pendingFees";
import { type PatientBill } from "@/lib/inventory";
import { useToast } from "@/hooks/use-toast";

type FilterMode = "history" | "complaint" | "address";

// ── VisitCard (private) ──────────────────────────────────────────────
interface VisitCardProps {
  visit: Patient;
  bill: PatientBill | undefined;
  onSelect: (visit: Patient) => void;
  onPrint: (visit: Patient) => void;
}
const VisitCard = React.memo(function VisitCard({ visit, bill, onSelect, onPrint }: VisitCardProps) {
  return (
    <div
      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-primary/5 hover:border-primary/20 transition-colors cursor-pointer"
      onClick={() => { onSelect(visit); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold px-2 py-1 bg-white rounded-md border border-slate-200 text-slate-600">
          {format(new Date(visit.visitDate), "dd MMM yyyy")}
        </span>
        <div className="flex items-center gap-1.5">
{visit.fees > 0 && (
            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">₹{visit.fees}</span>
          )}
          <span className="text-[10px] text-slate-400 font-medium">tap to edit</span>
        </div>
      </div>
      <div className="space-y-1">
        {visit.complaint && <p className="text-xs text-slate-700"><span className="text-[10px] uppercase text-slate-400 font-bold">Complaint: </span>{visit.complaint}</p>}
        {visit.treatment && <p className="text-xs text-slate-600"><span className="text-[10px] uppercase text-slate-400 font-bold">Treatment: </span>{visit.treatment}</p>}
        {bill && bill.items.length > 0 && (
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-bold">Medicines: </span>
            <span className="text-xs text-slate-700">{bill.items.map(it => `${it.medicineName} ×${it.qtyTablets}`).join(", ")}</span>
          </div>
        )}
        {visit.advice && <p className="text-xs text-slate-500"><span className="text-[10px] uppercase text-slate-400 font-bold">Advice: </span>{visit.advice}</p>}
        {visit.reports && <p className="text-xs text-slate-500"><span className="text-[10px] uppercase text-slate-400 font-bold">Reports: </span>{visit.reports}</p>}
        {visit.fees > 0 && <p className="text-xs text-slate-500"><span className="text-[10px] uppercase text-slate-400 font-bold">Fees: </span>₹{visit.fees}</p>}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={e => { e.stopPropagation(); onPrint(visit); }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors">
          <Printer className="w-3 h-3" /> Print
        </button>
      </div>
    </div>
  );
});

interface PatientHistoryPanelProps {
  patientHistory: Patient[];
  historyName: string;
  historyMobile: string;
  historyBillMap: Record<string, PatientBill>;
  pendingFees: PendingEntry[];
  refreshPending: () => void;
  onSelectVisit: (patient: Patient) => void;
  onPrintVisit: (patient: Patient) => void;
}

export const PatientHistoryPanel = React.memo(function PatientHistoryPanel({
  patientHistory,
  historyName,
  historyMobile,
  historyBillMap,
  pendingFees,
  refreshPending,
  onSelectVisit,
  onPrintVisit,
}: PatientHistoryPanelProps) {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<FilterMode>("history");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterResults, setFilterResults] = useState<Patient[]>([]);

  // Auto-switch to history mode when patient history loads
  useEffect(() => {
    if (patientHistory.length > 0) setFilterMode("history");
  }, [patientHistory]);

  useEffect(() => {
    if (filterMode !== "complaint" && filterMode !== "address") {
      setFilterResults([]);
      return;
    }
    if (!filterQuery || filterQuery.length < 2) {
      setFilterResults([]);
      return;
    }
    const timer = setTimeout(() => {
      if (filterMode === "complaint") setFilterResults(lookupByComplaint(filterQuery));
      else setFilterResults(lookupByAddress(filterQuery));
    }, 300);
    return () => clearTimeout(timer);
  }, [filterQuery, filterMode]);

  return (
    <>
      {/* Filter Mode Selector */}
      <div className="medical-card p-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setFilterMode("history")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${filterMode === "history" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}>
            <RefreshCw className="w-3 h-3" /> History
          </button>
          <button onClick={() => setFilterMode("complaint")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${filterMode === "complaint" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}>
            <Activity className="w-3 h-3" /> Complaint
          </button>
          <button onClick={() => setFilterMode("address")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${filterMode === "address" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}>
            <MapPin className="w-3 h-3" /> Village
          </button>
        </div>

        {(filterMode === "complaint" || filterMode === "address") && (
          <div className="mt-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder={filterMode === "complaint" ? "Search complaint or code..." : "Search village / city..."}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary text-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Results Panel */}
      <AnimatePresence mode="wait">
        {/* ── HISTORY MODE ── */}
        {filterMode === "history" && (
          <motion.div key="history" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="medical-card overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
            {patientHistory.length > 0 ? (
              <>
                {/* Patient identity header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{historyName || patientHistory[0]?.name}</p>
                      <p className="text-xs font-mono text-slate-500">{historyMobile || patientHistory[0]?.mobile}</p>
                    </div>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">{patientHistory.length} visits</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {patientHistory.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      bill={historyBillMap[`${visit.id}_${visit.visitDate}`]}
                      onSelect={onSelectVisit}
                      onPrint={onPrintVisit}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 h-64">
                <FileText className="w-12 h-12 mb-4 text-slate-300" />
                <p className="font-medium">No history yet</p>
                <p className="text-sm mt-2">Type mobile / case no. then press<br /><kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs mx-1">Enter</kbd>or click <Search className="w-3 h-3 inline mx-1" /></p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── COMPLAINT / VILLAGE MODE ── compact list ── */}
        {(filterMode === "complaint" || filterMode === "address") && (
          <motion.div key="filter" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="medical-card overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
            {filterResults.length > 0 ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-slate-800">
                    {filterMode === "complaint" ? "By Complaint" : "By Village"}
                  </span>
                  <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    {filterResults.length} patients
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filterResults.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <span className="text-xs text-slate-400 font-medium w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs font-mono text-slate-400">{p.mobile}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {format(new Date(p.visitDate), "dd/MM/yy")}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 h-48">
                {filterMode === "complaint" ? <Activity className="w-10 h-10 mb-3 text-slate-300" /> : <MapPin className="w-10 h-10 mb-3 text-slate-300" />}
                <p className="text-sm font-medium">{filterQuery.length < 2 ? "Type to search..." : "No results found"}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PENDING FEES PANEL ── */}
      <div className="medical-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-slate-800">Pending Fees</span>
            {pendingFees.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{pendingFees.length}</span>
            )}
          </div>
          {pendingFees.length > 0 && (
            <span className="text-xs font-bold text-amber-700">
              Total: ₹{pendingFees.reduce((s, e) => s + e.amount, 0)}
            </span>
          )}
        </div>
        {pendingFees.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
            <p className="text-xs font-medium">No pending fees</p>
            <p className="text-xs mt-1 text-slate-300">Use "Mark Pending" when saving a patient</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-50 max-h-64 overflow-y-auto">
            {pendingFees.map((e, i) => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-amber-50/50 transition-colors">
                <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-slate-900 truncate">{e.patientName}</p>
                  <p className="text-[10px] font-mono text-slate-400">{e.patientMobile} · {format(new Date(e.date + "T00:00:00"), "dd MMM")}</p>
                </div>
                <span className="font-bold text-amber-600 text-sm shrink-0">₹{e.amount}</span>
                <button
                  onClick={() => { removePendingFee(e.id); refreshPending(); toast({ title: "Collected", description: `₹${e.amount} from ${e.patientName} marked as collected.` }); }}
                  title="Mark as collected"
                  className="shrink-0 p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="px-3 py-2 bg-amber-50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600">Total Pending</span>
              <span className="font-bold text-amber-600">₹{pendingFees.reduce((s, e) => s + e.amount, 0)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
});
