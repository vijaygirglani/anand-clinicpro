import React, {
  useState, useEffect, useCallback, useRef, useMemo,
  forwardRef, useImperativeHandle,
} from "react";
import { UseFormReturn } from "react-hook-form";
import { Activity, CheckCircle2, Hourglass } from "lucide-react";
import {
  searchMedicineNames, getAvailableBatchesForMedicine, formatExpiry,
} from "@/lib/inventory";
import { findComplaintCode } from "@/lib/store";
import { type PatientFormValues } from "./types";
import { type MedRow } from "./types";

export interface MedicineBillingSectionRef {
  focusComplaintCode: () => void;
  /** Read the current DOM value of the discount field without waiting for blur.
   *  Call this from savePatient to avoid stale-state bugs when the user
   *  submits while the discount input is still focused. */
  flushOtherCharges: () => number;
}

interface MedicineBillingSectionProps {
  form: UseFormReturn<PatientFormValues>;
  medRows: MedRow[];
  setMedRows: (rows: MedRow[] | ((prev: MedRow[]) => MedRow[])) => void;
  otherCharges: number;
  setOtherCharges: (v: number) => void;
  feesMarkedPending: boolean;
  setFeesMarkedPending: (v: boolean | ((prev: boolean) => boolean)) => void;
  pendingAmount: string;
  setPendingAmount: (v: string) => void;
  onOtherChargesEnter: () => void;
}

export const MedicineBillingSection = React.memo(forwardRef<MedicineBillingSectionRef, MedicineBillingSectionProps>(
  function MedicineBillingSection(
    {
      form,
      medRows,
      setMedRows,
      otherCharges,
      setOtherCharges,
      feesMarkedPending,
      setFeesMarkedPending,
      pendingAmount,
      setPendingAmount,
      onOtherChargesEnter,
    },
    ref
  ) {
    const [medSuggestions, setMedSuggestions] = useState<{name: string; mrpPerTablet: number; currentStock: number; bestBatch: any; batchLabel: string}[]>([]);
    const [activeMedIdx, setActiveMedIdx] = useState<number | null>(null);
    const [highlightedSugIdx, setHighlightedSugIdx] = useState<number | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const medInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const medQtyRefs = useRef<(HTMLInputElement | null)[]>([]);
    const otherChargesRef = useRef<HTMLInputElement | null>(null);
    const complaintCodeRef = useRef<HTMLInputElement | null>(null);
    const complaintRef = useRef<HTMLTextAreaElement | null>(null);
    const medSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Keep a ref in sync for imperative reads (mirrors medRows)
    const medRowsRef = useRef<MedRow[]>(medRows);
    useEffect(() => { medRowsRef.current = medRows; }, [medRows]);

    useImperativeHandle(ref, () => ({
      focusComplaintCode: () => complaintCodeRef.current?.focus(),
      flushOtherCharges:  () => Number(otherChargesRef.current?.value) || 0,
    }));

    const medGross = useMemo(() => medRows.reduce((s, r) => s + r.mrp * r.qty, 0), [medRows]);

    // Single memo: compute both batchesMap (used in render) and multiBatchSet (used for row highlight).
    // Runs only when medRows changes — subsequent re-renders from displayBillTotal / feesMarkedPending
    // / discount changes get O(1) map lookups instead of repeated getAllBatchStocks() reads.
    const { batchesMap, multiBatchSet } = useMemo(() => {
      const names = [...new Set(medRows.map(r => r.medicineName).filter(Boolean))];
      const bMap = new Map<string, ReturnType<typeof getAvailableBatchesForMedicine>>();
      const mSet = new Set<string>();
      for (const name of names) {
        const batches = getAvailableBatchesForMedicine(name);
        bMap.set(name, batches);
        if (batches.length > 1) {
          const mrps = new Set(batches.map(b => b.mrpPerTablet.toFixed(2)));
          if (mrps.size > 1) mSet.add(name);
        }
      }
      return { batchesMap: bMap, multiBatchSet: mSet };
    }, [medRows]);

    // Uncontrolled discount field: local ref holds the typed value so keystrokes
    // never propagate to Home.tsx or cause the medicine table to re-render.
    // Only the tiny displayBillTotal state changes while the user is typing.
    const otherChargesLocalRef = useRef(otherCharges);
    const [displayBillTotal, setDisplayBillTotal] = useState(() => Math.ceil(medGross + otherCharges));

    // ── Complaint-code auto-fill ──
    // Declared here (after displayBillTotal) so it can batch ALL updates — complaint,
    // treatment, medRows, AND bill total — into a single React render via auto-batching.
    const applyComplaintCode = useCallback((val: string) => {
      if (!val || val.length < 2) return;
      const codeRecord = findComplaintCode(val);
      if (!codeRecord) return;
      // Compute new rows eagerly so we can derive the new bill total in the same tick.
      const newRows = codeRecord.medicines && codeRecord.medicines.length > 0
        ? codeRecord.medicines.map(m => {
            const results = searchMedicineNames(m.medicineName);
            const match = results.find(r => r.name.toLowerCase() === m.medicineName.toLowerCase());
            return {
              _id: crypto.randomUUID(),
              medicineName: m.medicineName,
              qty: m.defaultQty ?? 0,
              mrp: match?.bestBatch ? +match.bestBatch.mrpPerTablet.toFixed(2) : 0,
              batchNo: match?.bestBatch?.batchNo || "",
              billId: match?.bestBatch?.billId || "",
              landingCostPerTablet: match?.bestBatch?.landingCostPerTablet || 0,
            };
          })
        : null;
      // All four setters fire in the same synchronous call — React 18 auto-batches them
      // into one render so complaint, medicines, and bill total all appear together.
      form.setValue("complaint", codeRecord.complaint);
      form.setValue("treatment", codeRecord.treatment);
      if (newRows) {
        setMedRows(newRows);
        const newGross = newRows.reduce((s, r) => s + r.mrp * r.qty, 0);
        setDisplayBillTotal(Math.ceil(newGross + otherChargesLocalRef.current));
      }
    }, [form, setMedRows, setDisplayBillTotal]);

    // ── Uncontrolled fees field: same pattern as otherCharges.
    // Avoids form-subscription re-renders on every fees keystroke.
    const feesLocalRef = useRef(0);
    const [feesLocalDisplay, setFeesLocalDisplay] = useState(0);
    // Sync display when feesMarkedPending toggles on — snapshot current form value
    useEffect(() => {
      if (feesMarkedPending) {
        const v = Number(form.getValues("fees")) || feesLocalRef.current;
        feesLocalRef.current = v;
        setFeesLocalDisplay(v);
      }
    }, [feesMarkedPending, form]);

    const medDropdownStyle = useMemo(() => ({
      position: "fixed" as const,
      zIndex: 99999,
      backgroundColor: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      width: `${Math.max(dropdownPos.width, 320)}px`,
      maxHeight: "240px",
      overflowY: "auto" as const,
      top: `${dropdownPos.top}px`,
      left: `${dropdownPos.left}px`,
    }), [dropdownPos]);

    // Re-sync displayBillTotal when medGross changes (medicine qty/mrp edited)
    useEffect(() => {
      setDisplayBillTotal(Math.ceil(medGross + otherChargesLocalRef.current));
    }, [medGross]);

    // Re-sync DOM input + displayBillTotal when the prop changes externally
    // (e.g. reset after save, or prefillFromPatient loading a previous bill)
    useEffect(() => {
      otherChargesLocalRef.current = otherCharges;
      if (otherChargesRef.current) {
        otherChargesRef.current.value = otherCharges ? String(otherCharges) : "";
      }
      setDisplayBillTotal(Math.ceil(medGross + otherCharges));
    }, [otherCharges]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close dropdowns on scroll. Functional update: return same ref if already
    // empty so React bails out and skips the re-render on every scroll event.
    const closeOnScroll = useCallback((e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[id^="med-dropdown-"]')) return;
      setMedSuggestions(prev => prev.length === 0 ? prev : []);
      setActiveMedIdx(null);
      setHighlightedSugIdx(null);
    }, []);

    useEffect(() => {
      window.addEventListener('scroll', closeOnScroll, true);
      return () => window.removeEventListener('scroll', closeOnScroll, true);
    }, [closeOnScroll]);

    const getMedSuggestions = useCallback((query: string) => {
      if (!query || query.length < 1) return [];
      const results = searchMedicineNames(query);
      const suggestions: {name: string; mrpPerTablet: number; currentStock: number; bestBatch: any; batchLabel: string}[] = [];
      for (const r of results) {
        if (r.batches.length === 1) {
          suggestions.push({
            name: r.name,
            mrpPerTablet: r.bestBatch?.mrpPerTablet || 0,
            currentStock: r.batches.reduce((s, b) => s + b.tabletsAvailable, 0),
            bestBatch: r.bestBatch,
            batchLabel: "",
          });
        } else {
          for (const batch of r.batches) {
            suggestions.push({
              name: r.name,
              mrpPerTablet: batch.mrpPerTablet,
              currentStock: batch.tabletsAvailable,
              bestBatch: batch,
              batchLabel: `Batch ${batch.batchNo} · exp:${formatExpiry(batch.expiryDate)}`,
            });
          }
        }
      }
      return suggestions.slice(0, 10);
    }, []);

    const updateMedRow = (i: number, field: keyof MedRow, val: string | number) =>
      setMedRows(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

    const removeMedRow = (i: number) => setMedRows(p => p.filter((_, idx) => idx !== i));

    const addMedRow = () => setMedRows(p => [...p, { _id: crypto.randomUUID(), medicineName: "", qty: 0, mrp: 0, batchNo: "", billId: "", landingCostPerTablet: 0 }]);

    const { ref: complaintCodeRHFRef, onBlur: complaintCodeRHFBlur, ...complaintCodeRest } = form.register("complaintCode");
    const { ref: complaintRHFRef, ...complaintRest } = form.register("complaint");
    const { ref: feesRHFRef, onChange: feesRHFOnChange, onBlur: feesRHFBlur, ...feesRest } = form.register("fees");

    return (
      <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" /> Complaint Code
            </label>
            <input {...complaintCodeRest}
              ref={el => { complaintCodeRHFRef(el); complaintCodeRef.current = el; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyComplaintCode(complaintCodeRef.current?.value || ""); complaintRef.current?.focus(); } }}
              onBlur={e => { complaintCodeRHFBlur(e); applyComplaintCode(e.target.value); }}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase text-slate-800"
              placeholder="E.G. CCF" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Bill Amount (₹)
              {medRows.length > 0 && <span className="ml-2 text-xs text-green-600 font-normal">auto from medicines</span>}
            </label>
            <div className="flex gap-2 items-center">
              <input type="number"
                value={medRows.length > 0 ? displayBillTotal : undefined}
                readOnly={medRows.length > 0}
                {...(medRows.length === 0 ? {
                  ...feesRest,
                  ref: feesRHFRef,
                  onBlur: feesRHFBlur,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    feesRHFOnChange(e);
                    const v = Number(e.target.value) || 0;
                    feesLocalRef.current = v;
                    if (feesMarkedPending) setFeesLocalDisplay(v);
                  },
                } : {})}
                min={0}
                className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold text-slate-900 ${medRows.length > 0 ? "bg-green-50 border-green-300 cursor-not-allowed" : "bg-white border-slate-200"}`}
                placeholder="Amount" />
              <button type="button"
                onClick={() => setFeesMarkedPending(p => !p)}
                title={feesMarkedPending ? "Click to unmark pending" : "Mark fees as pending"}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-xl border font-semibold text-xs transition-colors ${
                  feesMarkedPending
                    ? "bg-amber-100 border-amber-400 text-amber-700 shadow-inner"
                    : "bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500"
                }`}>
                <Hourglass className="w-4 h-4" />
                {feesMarkedPending ? "Pending" : "Mark Pending"}
              </button>
            </div>
            {feesMarkedPending && (() => {
              const hasMeds = medRows.some(r => r.medicineName.trim());
              const billTotal = hasMeds ? displayBillTotal : feesLocalDisplay;
              const paid = pendingAmount.trim() !== "" ? Math.max(0, Number(pendingAmount) || 0) : 0;
              const pendingAmt = Math.round(billTotal - paid);
              return (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <Hourglass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-amber-700 mb-1">
                        Amount Paid Now (&#8377;) — Bill Total: &#8377;{billTotal}
                      </p>
                      <input
                        type="number" min={0}
                        value={pendingAmount}
                        onChange={e => setPendingAmount(e.target.value)}
                        placeholder="0 — leave blank if nothing paid"
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm font-bold text-amber-800 focus:outline-none focus:border-amber-500 placeholder:text-amber-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid: &#8377;{paid}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className={`flex items-center gap-1 font-bold ${pendingAmt > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      <Hourglass className="w-3.5 h-3.5" /> Pending: &#8377;{Math.max(0, pendingAmt)}
                    </span>
                  </div>
                  {pendingAmt <= 0 && paid > 0 && (
                    <p className="text-xs text-emerald-600 px-1 font-semibold">✓ Fully paid — nothing will be saved as pending</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Presenting Complaints</label>
          <textarea {...complaintRest}
            ref={el => { complaintRHFRef(el); complaintRef.current = el; }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (medInputRefs.current[0] ?? otherChargesRef.current)?.focus(); } }}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none text-slate-800" placeholder="Describe the symptoms..." />
        </div>

        {/* ── Medicine Table ── */}
        <div className="space-y-2">
          {/* Medicine Table Header */}
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              💊 Medicines
              {medGross > 0 && <span className="text-xs text-green-600 font-normal">Gross: ₹{medGross.toFixed(2)}</span>}
            </label>
          </div>

          {/* Visual Infosoft style table */}
          <div className="rounded-xl overflow-visible border border-slate-300 shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs w-8">No</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Item Name</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs w-24">Batch</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs w-16">Qty</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs w-24">MRP/Tab</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs w-24">Amount</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {medRows.map((r, i) => {
                  const multiBatch = multiBatchSet.has(r.medicineName);
                  return (
                    <tr key={r._id} className={`border-b border-slate-200 transition-colors hover:bg-blue-50/40
                      ${multiBatch
                        ? "bg-orange-50/60 border-l-2 border-l-orange-400"
                        : i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-3 py-1 text-slate-500 text-xs font-medium">{i + 1}</td>
                      <td className="px-2 py-1">
                        <div className="relative">
                          {multiBatch && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full z-10 pointer-events-none">
                              2 MRP
                            </span>
                          )}
                          <input value={r.medicineName}
                            ref={el => { medInputRefs.current[i] = el; }}
                            onChange={e => {
                              const val = e.target.value;
                              updateMedRow(i, "medicineName", val);
                              updateMedRow(i, "mrp", 0);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 320) });
                              if (medSearchTimerRef.current) clearTimeout(medSearchTimerRef.current);
                              medSearchTimerRef.current = setTimeout(() => {
                                setActiveMedIdx(i);
                                setHighlightedSugIdx(null);
                                setMedSuggestions(getMedSuggestions(val));
                              }, 220);
                            }}
                            onFocus={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 320) });
                              setActiveMedIdx(i);
                              setHighlightedSugIdx(null);
                              if (r.medicineName) setMedSuggestions(getMedSuggestions(r.medicineName));
                            }}
                            onBlur={() => setTimeout(() => { setMedSuggestions([]); setActiveMedIdx(null); setHighlightedSugIdx(null); }, 150)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setMedSuggestions([]); setActiveMedIdx(null); setHighlightedSugIdx(null); return; }
                              if (e.key === "ArrowDown" && medSuggestions.length > 0) {
                                e.preventDefault();
                                setHighlightedSugIdx(prev => prev === null ? 0 : Math.min(prev + 1, medSuggestions.length - 1));
                                return;
                              }
                              if (e.key === "ArrowUp" && medSuggestions.length > 0) {
                                e.preventDefault();
                                setHighlightedSugIdx(prev => prev === null ? medSuggestions.length - 1 : Math.max(prev - 1, 0));
                                return;
                              }
                              if (e.key === "Enter" && medSuggestions.length === 0) {
                                e.preventDefault();
                                medQtyRefs.current[i]?.focus();
                                return;
                              }
                              if (e.key === "Enter" && medSuggestions.length > 0) {
                                e.preventDefault();
                                const s = medSuggestions[highlightedSugIdx ?? 0];
                                setMedRows(p => p.map((r, idx) => idx === i ? {
                                  ...r, medicineName: s.name, qty: 0, mrp: +s.mrpPerTablet.toFixed(2),
                                  batchNo: s.bestBatch?.batchNo || "",
                                  billId: s.bestBatch?.billId || "",
                                  landingCostPerTablet: s.bestBatch?.landingCostPerTablet || 0,
                                } : r));
                                medRowsRef.current = medRowsRef.current.map((r, idx) => idx === i ? {
                                  ...r, medicineName: s.name, qty: 0, mrp: +s.mrpPerTablet.toFixed(2),
                                  batchNo: s.bestBatch?.batchNo || "",
                                  billId: s.bestBatch?.billId || "",
                                  landingCostPerTablet: s.bestBatch?.landingCostPerTablet || 0,
                                } : r);
                                setMedSuggestions([]);
                                setActiveMedIdx(null);
                                setHighlightedSugIdx(null);
                                setTimeout(() => medQtyRefs.current[i]?.focus(), 0);
                              }
                            }}
                            placeholder="Type medicine name..."
                            autoComplete="off"
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          {activeMedIdx === i && medSuggestions.length > 0 && (
                            <div style={medDropdownStyle}
                              id={`med-dropdown-${i}`}>
                              {medSuggestions.map((s, si) => (
                                <button key={si} type="button"
                                  ref={el => { if (el && si === highlightedSugIdx) el.scrollIntoView({ block: "nearest" }); }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setMedRows(p => p.map((r, idx) => idx === i ? {
                                      ...r,
                                      medicineName: s.name, qty: 0,
                                      mrp: +s.mrpPerTablet.toFixed(2),
                                      batchNo: s.bestBatch?.batchNo || "",
                                      billId: s.bestBatch?.billId || "",
                                      landingCostPerTablet: s.bestBatch?.landingCostPerTablet || 0,
                                    } : r));
                                    medRowsRef.current = medRowsRef.current.map((r, idx) => idx === i ? {
                                      ...r,
                                      medicineName: s.name, qty: 0,
                                      mrp: +s.mrpPerTablet.toFixed(2),
                                      batchNo: s.bestBatch?.batchNo || "",
                                      billId: s.bestBatch?.billId || "",
                                      landingCostPerTablet: s.bestBatch?.landingCostPerTablet || 0,
                                    } : r);
                                    setMedSuggestions([]);
                                    setActiveMedIdx(null);
                                    setHighlightedSugIdx(null);
                                    setTimeout(() => medQtyRefs.current[i]?.focus(), 0);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 hover:bg-blue-50 ${si === highlightedSugIdx ? "bg-blue-100" : ""} ${si === 0 ? "rounded-t-lg" : ""}`}>
                                  <span className="font-semibold text-slate-800">{s.name}</span>
                                  <span className="text-slate-500 shrink-0 text-right">
                                    <span className="text-primary font-medium">₹{s.mrpPerTablet.toFixed(2)}/tab</span>
                                    <span className={`ml-2 ${s.currentStock <= 0 ? "text-red-500" : "text-green-600"}`}>
                                      {s.currentStock <= 0 ? "OUT" : `${s.currentStock} tabs`}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1 min-w-[90px]">
                        {r.medicineName ? (() => {
                          const batches = batchesMap.get(r.medicineName) ?? [];
                          const selBatch = batches.find(b => b.batchNo === r.batchNo);
                          return (
                            <div>
                              <select value={r.batchNo}
                                onChange={e => {
                                  const sel = batches.find(b => b.batchNo === e.target.value);
                                  if (sel) {
                                    const updated = { batchNo: sel.batchNo, billId: sel.billId, mrp: +sel.mrpPerTablet.toFixed(2), landingCostPerTablet: sel.landingCostPerTablet };
                                    setMedRows(p => p.map((x, idx) => idx === i ? { ...x, ...updated } : x));
                                    medRowsRef.current = medRowsRef.current.map((x, idx) => idx === i ? { ...x, ...updated } : x);
                                  }
                                }}
                                className="w-full border border-slate-300 rounded px-1 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/50">
                                {batches.map(b => (
                                  <option key={b.batchNo} value={b.batchNo}>{b.batchNo} ({b.tabletsAvailable})</option>
                                ))}
                                {!batches.length && r.batchNo && <option value={r.batchNo}>{r.batchNo}</option>}
                              </select>
                              {selBatch && (
                                <span className={`text-[10px] font-mono block mt-0.5 ${selBatch.expiryStatus === "expired" ? "text-red-500 font-bold" : selBatch.expiryStatus === "critical" ? "text-orange-500" : "text-slate-400"}`}>
                                  Exp: {formatExpiry(selBatch.expiryDate)}
                                </span>
                              )}
                            </div>
                          );
                        })() : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={r.qty}
                          ref={el => { medQtyRefs.current[i] = el; }}
                          onChange={e => updateMedRow(i, "qty", Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const nextIdx = i + 1;
                              if (nextIdx < medRows.length) {
                                medInputRefs.current[nextIdx]?.focus();
                              } else {
                                setMedRows(p => [...p, { _id: crypto.randomUUID(), medicineName: "", qty: 0, mrp: 0, batchNo: "", billId: "", landingCostPerTablet: 0 }]);
                                setTimeout(() => medInputRefs.current[nextIdx]?.focus(), 50);
                              }
                            }
                          }}
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" step="0.01" value={r.mrp || ""}
                          onChange={e => updateMedRow(i, "mrp", Number(e.target.value))}
                          placeholder="0.00"
                          className="w-20 border border-slate-300 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white" />
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-slate-800 text-xs">
                        {r.mrp > 0 ? `₹${(r.mrp * r.qty).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button type="button" onClick={() => removeMedRow(i)}
                          className="text-red-400 hover:text-red-600">✕</button>
                      </td>
                    </tr>
                  ); })}
                  {/* Empty row — always visible for adding new medicine */}
                  <tr className="border-b border-slate-200 bg-white hover:bg-blue-50/40 cursor-pointer" onClick={addMedRow}>
                    <td className="px-3 py-2 text-slate-300 text-xs">{medRows.length + 1}</td>
                    <td className="px-2 py-2" colSpan={4}>
                      <span className="text-slate-400 text-xs">+ Click to add medicine...</span>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-300 text-xs">—</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              {/* Summary row */}
              <div className="bg-slate-700 border-t border-slate-600 px-4 py-2.5 flex items-center justify-between gap-4 rounded-b-xl flex-wrap">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="text-white/70">Med Gross: <strong className="text-white">₹{medGross.toFixed(2)}</strong></span>
                  <span className="text-white/30">|</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-white/70 whitespace-nowrap">Procedure / Discount:</label>
                    <input type="number"
                      defaultValue={otherCharges || ""}
                      ref={otherChargesRef}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        otherChargesLocalRef.current = val;
                        setDisplayBillTotal(Math.ceil(medGross + val));
                      }}
                      onBlur={e => setOtherCharges(Number(e.target.value) || 0)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setOtherCharges(Number(e.currentTarget.value) || 0);
                          onOtherChargesEnter();
                        }
                      }}
                      className="w-24 border border-white/20 rounded px-2 py-1 text-xs text-right focus:outline-none bg-white/10 text-white placeholder-white/30"
                      placeholder="0" />
                    <span className="text-white/40 text-xs">(-=discount +procedure)</span>
                  </div>
                </div>
                <div className="text-base font-bold text-white whitespace-nowrap">
                  Bill Total: ₹{displayBillTotal.toFixed(2)}
                </div>
              </div>
          </div>
        </div>
      </div>
    );
  }
));
