import React, { useState, useEffect, useCallback, useRef } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import {
  lookupByMobile, lookupByName, getNextCaseNo, searchPatientSuggestions,
  type Patient, type PatientSuggestion,
} from "@/lib/store";
import {
  Loader2, User, Phone, MapPin, Weight, Calendar, Zap, Search,
  RefreshCw, Sheet, X, WalletCards, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getPendingFees, removePendingFee, type PendingEntry } from "@/lib/pendingFees";
import { type PatientFormValues, todayStr } from "./types";

// ── Google Sheet helpers ──────────────────────────────────────────────
const SHEET_KEY = "manglam_sheet_url";

function extractSheetId(input: string): string | null {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
  return null;
}

function sheetCsvUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
}

interface SheetRow {
  name: string;
  mobile: string;
  age: string;
  weight: string;
  address: string;
}

async function fetchSheetRows(sheetId: string): Promise<SheetRow[]> {
  const url = sheetCsvUrl(sheetId);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch sheet. Make sure it is published to web as CSV.");
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const idx = (names: string[]) => names.reduce((found, n) => found >= 0 ? found : header.indexOf(n), -1);
  const nameIdx    = idx(["name", "patientname", "patient"]);
  const mobileIdx  = idx(["mobile", "mobileno", "phone", "caseno", "case"]);
  const ageIdx     = idx(["age"]);
  const weightIdx  = idx(["weight"]);
  const addressIdx = idx(["address", "village", "city", "area"]);

  return lines.slice(1).map(line => {
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return {
      name:    nameIdx    >= 0 ? cols[nameIdx]    || "" : "",
      mobile:  mobileIdx  >= 0 ? cols[mobileIdx]  || "" : "",
      age:     ageIdx     >= 0 ? cols[ageIdx]      || "" : "",
      weight:  weightIdx  >= 0 ? cols[weightIdx]   || "" : "",
      address: addressIdx >= 0 ? cols[addressIdx]  || "" : "",
    };
  }).filter(r => r.name || r.mobile);
}

interface PatientInfoFormProps {
  form: UseFormReturn<PatientFormValues>;
  mobileRef: React.RefObject<HTMLInputElement>;
  nameRef: React.RefObject<HTMLInputElement>;
  pendingAlert: PendingEntry | null;
  setPendingAlert: (v: PendingEntry | null) => void;
  refreshPending: () => void;
  onPatientFound: (history: Patient[], name: string, mobile: string) => void;
  onAddressEnter: () => void;
}

export const PatientInfoForm = React.memo(function PatientInfoForm({
  form,
  mobileRef,
  nameRef,
  pendingAlert,
  setPendingAlert,
  refreshPending,
  onPatientFound,
  onAddressEnter,
}: PatientInfoFormProps) {
  const { toast } = useToast();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<PatientSuggestion[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [highlightedNameIdx, setHighlightedNameIdx] = useState<number | null>(null);
  const isPrefillingRef = useRef(false);

  // Sheet state
  const [sheetUrl, setSheetUrl] = useState<string>(() => localStorage.getItem(SHEET_KEY) || "");
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetInput, setSheetInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [showSheetPicker, setShowSheetPicker] = useState(false);
  const sheetConnected = !!sheetUrl;

  // Internal refs for keyboard tab-through
  const ageRef = useRef<HTMLInputElement | null>(null);
  const ageMonthsRef = useRef<HTMLInputElement | null>(null);
  const weightRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);

  const visitDateValue = useWatch({ control: form.control, name: "visitDate" });
  const nameValue = useWatch({ control: form.control, name: "name" });

  // Live dropdown: watch name field, search on every keystroke
  useEffect(() => {
    if (isPrefillingRef.current) {
      isPrefillingRef.current = false;
      return;
    }
    if (!nameValue || nameValue.length < 2) {
      setNameSuggestions([]);
      setShowNameDropdown(false);
      setHighlightedNameIdx(null);
      return;
    }
    const timer = setTimeout(() => {
      const results = searchPatientSuggestions(nameValue);
      setNameSuggestions(results);
      setShowNameDropdown(results.length > 0);
      setHighlightedNameIdx(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameValue]);

  const runMobileLookup = useCallback(() => {
    const mobile = (mobileRef.current?.value || form.getValues("mobile") || "").trim();
    if (!mobile || mobile.length < 3) return;
    setIsLookingUp(true);
    const result = lookupByMobile(mobile);
    if (result.latestInfo) {
      form.setValue("name", result.latestInfo.name);
      form.setValue("age", result.latestInfo.age || 0);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("weight", result.latestInfo.weight || "");
      form.setValue("address", result.latestInfo.address || "");
      const pendingMatch = getPendingFees().find(e => e.patientMobile.replace(/\D/g, "") === mobile.replace(/\D/g, ""));
      if (pendingMatch) setPendingAlert(pendingMatch);
      toast({ title: "Patient found", description: `${result.history.length} visit(s) found.` });
    } else {
      if (mobile.length >= 5) {
        toast({ title: "No patient found", description: `No record for "${mobile}".` });
      }
    }
    onPatientFound(result.history, result.latestInfo?.name || "", mobile);
    setIsLookingUp(false);
  }, [form, mobileRef, toast, setPendingAlert, onPatientFound]);

  const runNameLookup = useCallback(() => {
    const name = (nameRef.current?.value || form.getValues("name") || "").trim();
    if (!name || name.length < 2) return;
    setIsLookingUp(true);
    const result = lookupByName(name);
    if (result.latestInfo) {
      form.setValue("age", result.latestInfo.age || 0);
      form.setValue("ageMonths", result.latestInfo.ageMonths || 0);
      form.setValue("weight", result.latestInfo.weight || "");
      form.setValue("address", result.latestInfo.address || "");
      form.setValue("mobile", result.latestInfo.mobile);
      const pendingMatch = getPendingFees().find(e => e.patientMobile.replace(/\D/g, "") === result.latestInfo!.mobile.replace(/\D/g, ""));
      if (pendingMatch) setPendingAlert(pendingMatch);
      toast({ title: "Patient found", description: `${result.history.length} visit(s) found.` });
      onPatientFound(result.history, name, result.latestInfo.mobile);
    } else {
      toast({ title: "No patient found", description: `No record for "${name}".` });
      onPatientFound([], name, "");
    }
    setIsLookingUp(false);
  }, [form, nameRef, toast, setPendingAlert, onPatientFound]);

  const handleSelectSuggestion = useCallback((s: PatientSuggestion) => {
    isPrefillingRef.current = true;
    form.setValue("name", s.name);
    form.setValue("mobile", s.mobile);
    form.setValue("age", s.age || 0);
    form.setValue("ageMonths", s.ageMonths || 0);
    form.setValue("weight", s.weight || "");
    form.setValue("address", s.address || "");
    if (mobileRef.current) mobileRef.current.value = s.mobile;
    if (nameRef.current) nameRef.current.value = s.name;
    setShowNameDropdown(false);
    const result = lookupByMobile(s.mobile);
    const pendingMatch = getPendingFees().find(e => e.patientMobile.replace(/\D/g, "") === s.mobile.replace(/\D/g, ""));
    if (pendingMatch) setPendingAlert(pendingMatch);
    toast({ title: "Patient found", description: `${s.visitCount} visit(s) found.` });
    onPatientFound(result.history, s.name, s.mobile);
  }, [form, mobileRef, nameRef, toast, setPendingAlert, onPatientFound]);

  const handleAutoCase = () => {
    const date = form.getValues("visitDate") || todayStr;
    const caseNo = getNextCaseNo(date);
    form.setValue("mobile", caseNo);
    if (mobileRef.current) mobileRef.current.value = caseNo;
    toast({ title: "Case No. Generated", description: caseNo });
  };

  // Sheet handlers
  const handleSaveSheet = () => {
    const id = extractSheetId(sheetInput);
    if (!id) {
      toast({ title: "Invalid URL", description: "Paste the full Google Sheet URL or just the Sheet ID.", variant: "destructive" });
      return;
    }
    localStorage.setItem(SHEET_KEY, id);
    setSheetUrl(id);
    setShowSheetModal(false);
    toast({ title: "Google Sheet connected!", description: "Tap Sync from Sheet to load patients." });
  };

  const handleSync = async () => {
    if (!sheetUrl) { setShowSheetModal(true); return; }
    setIsSyncing(true);
    try {
      const rows = await fetchSheetRows(sheetUrl);
      if (rows.length === 0) {
        toast({ title: "Sheet is empty", description: "No patient rows found. Check column headers.", variant: "destructive" });
      } else {
        setSheetRows(rows);
        setShowSheetPicker(true);
      }
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message || "Could not reach Google Sheet.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePickRow = (row: SheetRow) => {
    form.setValue("name", row.name);
    form.setValue("mobile", row.mobile);
    if (mobileRef.current) mobileRef.current.value = row.mobile;
    if (nameRef.current) nameRef.current.value = row.name;
    const ageNum = parseInt(row.age) || 0;
    form.setValue("age", ageNum);
    form.setValue("weight", row.weight || "");
    form.setValue("address", row.address || "");
    setShowSheetPicker(false);
    if (row.mobile) {
      const result = lookupByMobile(row.mobile);
      const pendingMatch = getPendingFees().find(e => e.patientMobile.replace(/\D/g, "") === row.mobile.replace(/\D/g, ""));
      if (pendingMatch) setPendingAlert(pendingMatch);
      onPatientFound(result.history, row.name, row.mobile);
    }
    toast({ title: "Patient filled!", description: `Details loaded for ${row.name}` });
  };

  // RHF refs for fields managed in this component
  const { ref: mobileRHFRef, ...mobileRest } = form.register("mobile");
  const { ref: nameRHFRef, ...nameRest } = form.register("name");
  const { ref: ageRHFRef, ...ageRest } = form.register("age");
  const { ref: ageMonthsRHFRef, ...ageMonthsRest } = form.register("ageMonths");
  const { ref: weightRHFRef, ...weightRest } = form.register("weight");
  const { ref: addressRHFRef, ...addressRest } = form.register("address");

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-display text-slate-900">Patient Registration</h2>
          <p className="text-slate-500 text-sm">Register a new visit and view medical history.</p>
        </div>
        {/* Sheet action buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow">
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync from Sheet
          </button>
          <button type="button" onClick={() => { setSheetInput(sheetUrl); setShowSheetModal(true); }}
            title="Connect Google Sheet"
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
            <Sheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sheet connected banner */}
      {sheetConnected && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span><strong>Google Sheet connected.</strong> Press "Sync from Sheet" to load today's patients.</span>
        </div>
      )}

      {/* Visit Date */}
      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Visit Date
            </label>
            <input type="date" {...form.register("visitDate")}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800" />
          </div>
        </div>

        {/* Mobile / Case No */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" /> Mobile / Case No. <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  {...mobileRest}
                  ref={(el) => {
                    mobileRHFRef(el);
                    (mobileRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); runMobileLookup(); nameRef.current?.focus(); }
                  }}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800 font-mono"
                  placeholder="Mobile or Case No."
                />
                {isLookingUp && <Loader2 className="w-4 h-4 absolute right-3 top-3.5 animate-spin text-slate-400" />}
              </div>
              <button type="button" onClick={runMobileLookup}
                className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors" title="Search">
                <Search className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleAutoCase} title="Auto-generate case number"
                className="px-3 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700 transition-colors flex items-center gap-1 shadow whitespace-nowrap">
                <Zap className="w-3.5 h-3.5" /> Auto
              </button>
            </div>
            {form.formState.errors.mobile && <p className="text-destructive text-xs">{form.formState.errors.mobile.message}</p>}
            <p className="text-xs text-slate-400">
              Case format: <span className="font-mono text-purple-600">00{format(new Date(visitDateValue || todayStr), "ddMMyy")}01</span>
              &nbsp;· Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Enter</kbd> or <Search className="w-3 h-3 inline" /> to search
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Patient Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  {...nameRest}
                  ref={(el) => {
                    nameRHFRef(el);
                    (nameRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  }}
                  onKeyDown={e => {
                    if (e.key === "ArrowDown" && showNameDropdown && nameSuggestions.length > 0) {
                      e.preventDefault();
                      setHighlightedNameIdx(prev => prev === null ? 0 : Math.min(prev + 1, nameSuggestions.length - 1));
                      return;
                    }
                    if (e.key === "ArrowUp" && showNameDropdown && nameSuggestions.length > 0) {
                      e.preventDefault();
                      setHighlightedNameIdx(prev => prev === null ? nameSuggestions.length - 1 : Math.max(prev - 1, 0));
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (showNameDropdown && highlightedNameIdx !== null && nameSuggestions[highlightedNameIdx]) {
                        handleSelectSuggestion(nameSuggestions[highlightedNameIdx]);
                        setHighlightedNameIdx(null);
                      } else {
                        setShowNameDropdown(false);
                        setHighlightedNameIdx(null);
                        ageRef.current?.focus();
                      }
                      return;
                    }
                    if (e.key === "Escape") { setShowNameDropdown(false); setHighlightedNameIdx(null); }
                  }}
                  onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800"
                  placeholder="Full Name"
                />
                <button type="button" onClick={runNameLookup}
                  className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors" title="Search by name">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Live patient suggestions dropdown */}
              {showNameDropdown && nameSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-y-auto" style={{ zIndex: 9999, maxHeight: "280px" }}>
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {nameSuggestions.length} patient{nameSuggestions.length > 1 ? "s" : ""} found
                    </span>
                  </div>
                  {nameSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      ref={el => { if (el && i === highlightedNameIdx) el.scrollIntoView({ block: "nearest" }); }}
                      onMouseDown={e => { e.preventDefault(); setHighlightedNameIdx(null); handleSelectSuggestion(s); }}
                      className={`w-full px-4 py-3 transition-colors text-left border-b border-slate-50 last:border-0 hover:bg-blue-50 ${i === highlightedNameIdx ? "bg-blue-100" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">{s.name}</span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                              {s.visitCount} visit{s.visitCount > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono text-slate-500">{s.mobile}</span>
                            {s.age > 0 && <span className="text-xs text-slate-400">{s.age}y</span>}
                            {s.address && <span className="text-xs text-slate-400 truncate max-w-[100px]">· {s.address}</span>}
                          </div>
                          {s.recentVisits[0] && (
                            <div className="mt-1 text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-500">{format(new Date(s.recentVisits[0].visitDate), "dd MMM yyyy")}</span>
                              {s.recentVisits[0].complaint && <span className="ml-1">· {s.recentVisits[0].complaint.slice(0, 40)}</span>}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-primary font-bold shrink-0 mt-1">Fill →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
          </div>
        </div>

        {/* Age + Weight + Address */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Age <span className="text-slate-400 text-xs">(optional)</span></label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type="number" {...ageRest} min={0}
                  ref={el => { ageRHFRef(el); ageRef.current = el; }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ageMonthsRef.current?.focus(); } }}
                  className="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800" placeholder="0" />
                <span className="absolute right-2 top-3.5 text-xs text-slate-400">yrs</span>
              </div>
              <div className="w-20 relative">
                <input type="number" {...ageMonthsRest} min={0} max={11}
                  ref={el => { ageMonthsRHFRef(el); ageMonthsRef.current = el; }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); weightRef.current?.focus(); } }}
                  className="w-full px-2 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800" placeholder="0" />
                <span className="absolute right-2 top-3.5 text-xs text-slate-400">mo</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Weight className="w-4 h-4 text-slate-400" /> Weight
            </label>
            <input {...weightRest}
              ref={el => { weightRHFRef(el); weightRef.current = el; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addressRef.current?.focus(); } }}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800" placeholder="e.g. 65 kg" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> Address
            </label>
            <input {...addressRest}
              ref={el => { addressRHFRef(el); addressRef.current = el; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAddressEnter(); } }}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800" placeholder="City / Area" />
          </div>
        </div>
      </div>

      {/* ── Google Sheet Connect Modal ── */}
      <AnimatePresence>
        {showSheetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sheet className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Connect Google Sheet</h3>
                <button onClick={() => setShowSheetModal(false)} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4 text-sm text-slate-700 space-y-1.5">
                <p className="font-semibold text-emerald-800 mb-2">One-time setup in Google Sheets:</p>
                <p>1. Open your Google Sheet</p>
                <p>2. Click <strong>File → Share → Publish to web</strong></p>
                <p>3. Choose <strong>Sheet1</strong> and <strong>Comma-separated values (.csv)</strong></p>
                <p>4. Click <strong>Publish</strong> → confirm with OK</p>
                <p>5. Copy the URL shown, or just copy the Sheet ID from the browser address bar</p>
                <p>6. Paste it below and click Save</p>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  ⚠️ Use <strong>Publish to web</strong> (not the Share button) — this ensures the app can always read the data.
                </div>
                <p className="mt-2 text-xs text-slate-500">Sheet columns: <strong>Name | Mobile | Age | Weight | Address</strong></p>
              </div>

              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Google Sheet URL or ID</label>
              <input
                value={sheetInput}
                onChange={e => setSheetInput(e.target.value)}
                placeholder="Paste URL or Sheet ID here..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 text-sm font-mono"
              />

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowSheetModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveSheet}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors">
                  Save & Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sheet Patient Picker Modal ── */}
      <AnimatePresence>
        {showSheetPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Select Patient from Sheet</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sheetRows.length} patients</span>
                <button onClick={() => setShowSheetPicker(false)} className="text-slate-400 hover:text-slate-600 ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {sheetRows.map((row, i) => (
                  <button key={i} onClick={() => handlePickRow(row)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-emerald-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{row.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{row.mobile}{row.age ? ` · ${row.age} yrs` : ""}{row.address ? ` · ${row.address}` : ""}</p>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold shrink-0">Fill →</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PENDING FEES ALERT POPUP ── */}
      <AnimatePresence>
        {pendingAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-5 text-center" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}>
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <WalletCards className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-black text-amber-900">Pending Fees Alert!</h2>
                <p className="text-sm text-amber-700 mt-1 font-medium">This patient has an outstanding balance</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div>
                    <p className="font-black text-slate-900 text-base">{pendingAlert.patientName}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{pendingAlert.patientMobile}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-amber-600">&#8377;{pendingAlert.amount}</p>
                    <p className="text-xs text-slate-400">since {new Date(pendingAlert.date + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => setPendingAlert(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  Remind Later
                </button>
                <button
                  onClick={() => { removePendingFee(pendingAlert.id); refreshPending(); setPendingAlert(null); toast({ title: "✓ Fees Collected", description: `₹${pendingAlert.amount} from ${pendingAlert.patientName} marked as collected.` }); }}
                  className="flex-[2] py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                  <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
