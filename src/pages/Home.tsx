import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import {
  addPatient, updatePatient, getPatients,
  getNextPatientNo,
  type Patient,
} from "@/lib/store";
import { PrintPrescription, printPatientPrescription } from "@/components/PrintPrescription";
import {
  Save, Printer, X, WalletCards, CheckCircle2, MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getActiveDoctor } from "@/lib/settings";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import {
  getAvailableBatchesForMedicine,
  savePatientBill, deletePatientBill, getPatientBills, newId,
  type PatientBill, type PatientMedicineItem,
} from "@/lib/inventory";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  getPendingFees, addPendingFee, removePendingFee, type PendingEntry,
} from "@/lib/pendingFees";
import { patientSchema, type PatientFormValues, emptyDefaults, emptyMedRow, type MedRow, todayStr } from "@/components/patient/types";
import { PatientInfoForm } from "@/components/patient/PatientInfoForm";
import { MedicineBillingSection, type MedicineBillingSectionRef } from "@/components/patient/MedicineBillingSection";
import { PatientNotesSection, type PatientNotesSectionRef } from "@/components/patient/PatientNotesSection";
import { PatientHistoryPanel } from "@/components/patient/PatientHistoryPanel";

export default function Home() {
  const { toast } = useToast();

  const [patientHistory, setPatientHistory] = useState<Patient[]>([]);
  const [historyName, setHistoryName] = useState("");
  const [historyMobile, setHistoryMobile] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Patient | null>(null);
  const [pendingFees, setPendingFees] = useState<PendingEntry[]>(() => getPendingFees());
  const [pendingAlert, setPendingAlert] = useState<PendingEntry | null>(null);
  const [feesMarkedPending, setFeesMarkedPending] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<string>("");
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [medRows, setMedRows] = useState<MedRow[]>([emptyMedRow()]);
  const medRowsRef = useRef<MedRow[]>([emptyMedRow()]);
  const setMedRowsSync = useCallback((rows: MedRow[] | ((prev: MedRow[]) => MedRow[])) => {
    setMedRows(prev => {
      const next = typeof rows === "function" ? rows(prev) : rows;
      medRowsRef.current = next;
      return next;
    });
  }, []);

  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [editPatientId, setEditPatientId] = useState<number | null>(null);
  const [editBillId, setEditBillId] = useState<string | null>(null);

  // Read once — doctor selection doesn't change mid-session
  const activeDoctor = useMemo(() => getActiveDoctor(), []);

  const [waPatient, setWaPatient] = useState<{name: string; mobile: string; advice?: string} | null>(null);

  const mobileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const medicineSectionRef = useRef<MedicineBillingSectionRef>(null);
  const notesSectionRef = useRef<PatientNotesSectionRef>(null);

  // ── History bill lookup ──
  const historyBillMap = useMemo(() => {
    if (patientHistory.length === 0) return {} as Record<string, PatientBill>;
    const bills = getPatientBills();
    const m: Record<string, PatientBill> = {};
    for (const b of bills) { m[`${b.patientId}_${b.billDate}`] = b; }
    return m;
  }, [patientHistory]);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: emptyDefaults,
    mode: 'onBlur',
  });

  const refreshPending = useCallback(() => setPendingFees(getPendingFees()), []);

  const handlePatientFound = useCallback((history: Patient[], name: string, mobile: string) => {
    setPatientHistory(history);
    setHistoryName(name);
    setHistoryMobile(mobile);
  }, []);

  // ── Pre-fill form from a Patient record (history click OR ?edit= URL param) ──
  const prefillFromPatient = useCallback((patient: Patient) => {
    form.reset({
      name:          patient.name,
      mobile:        patient.mobile,
      visitDate:     patient.visitDate,
      age:           patient.age,
      ageMonths:     patient.ageMonths  || 0,
      weight:        patient.weight     || "",
      address:       patient.address    || "",
      complaintCode: patient.complaintCode || "",
      complaint:     patient.complaint  || "",
      treatment:     patient.treatment  || "",
      advice:        patient.advice     || "",
      reports:       patient.reports    || "",
      fees:          patient.fees,
    });

    const bill = getPatientBills().find(
      b => b.patientId === patient.id && b.billDate === patient.visitDate
    );
    if (bill) {
      setMedRowsSync(bill.items.map(i => ({
        _id:                  crypto.randomUUID(),
        medicineName:         i.medicineName,
        qty:                  i.qtyTablets,
        mrp:                  +i.mrpPerTablet.toFixed(2),
        batchNo:              i.batchNo,
        billId:               i.billId,
        landingCostPerTablet: i.landingCostPerTablet,
      })));
      setOtherCharges(bill.otherCharges ?? 0);
      setEditBillId(bill.id);
    } else {
      setMedRowsSync([emptyMedRow()]);
      setOtherCharges(0);
      setEditBillId(null);
    }
    setEditPatientId(patient.id);
  }, [form, setMedRowsSync]);

  // ── Edit mode: pre-fill form from /?edit=PATIENTID ──
  useEffect(() => {
    const pidStr = new URLSearchParams(window.location.search).get("edit");
    if (!pidStr) return;
    const pid = Number(pidStr);
    if (!pid) return;
    const patient = getPatients().find(p => p.id === pid);
    if (!patient) return;
    prefillFromPatient(patient);
  }, [prefillFromPatient]);

  // ── Stable-ref pattern: onSubmit is stable so memo'd children never get a
  //    stale callback, but always calls the latest savePatient closure. ──
  const savePatientRef = useRef<((data: PatientFormValues) => void) | null>(null);
  const onSubmit = useCallback((data: PatientFormValues) => savePatientRef.current?.(data), []);

  // ── Stable callbacks for cross-component keyboard focus chain ──
  const handleAddressEnter      = useCallback(() => medicineSectionRef.current?.focusComplaintCode(), []);
  const handleOtherChargesEnter = useCallback(() => notesSectionRef.current?.focusAdvice(), []);
  const handleReportsEnter      = useCallback(() => form.handleSubmit(onSubmit)(), [form, onSubmit]);
  const handleClosePendingModal = useCallback(() => setShowPendingModal(false), []);
  const handleOpenPendingModal  = useCallback(() => setShowPendingModal(true), []);
  const handleCloseWaModal      = useCallback(() => setWaPatient(null), []);

  const savePatient = (data: PatientFormValues) => {
    const registerType = "general" as const;
    const visitDate = data.visitDate || todayStr;

    const validMedRows = medRowsRef.current.filter(r => r.medicineName.trim() && r.qty !== 0);

    // Read the discount field's current DOM value — it may not have been blurred
    // yet if the user submitted via keyboard shortcut while focused in that field.
    const currentOtherCharges = medicineSectionRef.current?.flushOtherCharges() ?? otherCharges;

    // Stock check
    if (validMedRows.length > 0) {
      for (const r of validMedRows) {
        if (r.billId) {
          const batches = getAvailableBatchesForMedicine(r.medicineName);
          const available = batches.reduce((s, b) => s + b.tabletsAvailable, 0);
          if (r.qty > 0 && available < r.qty) {
            toast({ title: `Insufficient stock: ${r.medicineName}`, description: `Required: ${r.qty}, Available: ${available}`, variant: "destructive" });
            return;
          }
        }
      }
    }

    const finalFees = Number(data.fees || 0);

    let saved: Patient;
    if (editPatientId) {
      const updated = updatePatient(editPatientId, {
        name: data.name, mobile: data.mobile,
        age: data.age || 0, ageMonths: data.ageMonths || 0,
        weight: data.weight || "", address: data.address || "",
        complaintCode: data.complaintCode || "", complaint: data.complaint || "",
        treatment: data.treatment || "", advice: data.advice || "",
        reports: data.reports || "", fees: finalFees,
        registerType, attachments, visitDate,
      });
      if (!updated) {
        toast({ title: "Error updating patient", variant: "destructive" });
        return;
      }
      saved = updated;
      if (editBillId && validMedRows.length === 0) {
        deletePatientBill(editPatientId);
      }
    } else {
      const autoPatientNo = getNextPatientNo(visitDate);
      saved = addPatient({
        name: data.name, mobile: data.mobile, patientNo: autoPatientNo,
        age: data.age || 0, ageMonths: data.ageMonths || 0,
        weight: data.weight || "", address: data.address || "",
        complaintCode: data.complaintCode || "", complaint: data.complaint || "",
        treatment: data.treatment || "", advice: data.advice || "",
        reports: data.reports || "", fees: finalFees, doctorId: activeDoctor?.id || 1,
        attachments, registerType, visitDate,
      });
    }

    if (validMedRows.length > 0 || currentOtherCharges !== 0) {
      const items: PatientMedicineItem[] = validMedRows.map(r => {
        const salePrice = r.mrp * r.qty;
        const cost = r.landingCostPerTablet * r.qty;
        return {
          medicineName: r.medicineName,
          batchNo: r.batchNo,
          billId: r.billId,
          qtyTablets: r.qty,
          mrpPerTablet: r.mrp,
          landingCostPerTablet: r.landingCostPerTablet,
          salePrice,
          cost,
          profit: salePrice - cost,
        };
      });
      const medSale   = items.reduce((s, i) => s + i.salePrice, 0);
      const medCost   = items.reduce((s, i) => s + i.cost, 0);
      const patientBill: PatientBill = {
        id: editBillId ?? newId(),
        patientId: saved.id,
        patientName: saved.name,
        doctorId: activeDoctor?.id || 1,
        billDate: visitDate,
        items,
        otherCharges: currentOtherCharges,
        totalSale:   Math.ceil(medSale + currentOtherCharges),
        totalCost:   medCost,
        totalProfit: Math.ceil(medSale + currentOtherCharges) - medCost,
        createdAt: new Date().toISOString(),
      };
      savePatientBill(patientBill);
    }

    if (feesMarkedPending) {
      const medGross = validMedRows.reduce((s, r) => s + r.mrp * r.qty, 0);
      const billTotal = validMedRows.length > 0
        ? Math.ceil(medGross + currentOtherCharges)
        : finalFees;
      const paid = pendingAmount.trim() !== "" ? Math.max(0, Number(pendingAmount) || 0) : 0;
      const pendingAmt = Math.round(billTotal - paid);
      if (pendingAmt > 0) {
        addPendingFee({
          id: crypto.randomUUID(),
          patientId: saved.id,
          patientName: saved.name,
          patientMobile: saved.mobile,
          amount: pendingAmt,
          date: visitDate,
          billDate: visitDate,
          markedAt: new Date().toISOString(),
        });
        refreshPending();
      }
    }

    setFeesMarkedPending(false);
    setPendingAmount("");
    setLastSaved(saved);
    toast({ title: "Saved!", description: "Saved to Daily Register." });
    form.reset({ ...emptyDefaults, visitDate });
    if (mobileRef.current) mobileRef.current.value = "";
    if (nameRef.current) nameRef.current.value = "";
    setAttachments([]);
    setPatientHistory([]);
    setHistoryName("");
    setHistoryMobile("");
    setMedRowsSync([emptyMedRow()]);
    setOtherCharges(0);
    setEditPatientId(null);
    setEditBillId(null);
    setTimeout(() => mobileRef.current?.focus(), 50);
  };

  // Keep ref pointing to latest savePatient so the stable onSubmit always works
  savePatientRef.current = savePatient;

  return (
    <Layout>
      {lastSaved && <PrintPrescription patient={lastSaved} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── MAIN FORM ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="medical-card p-6 md:p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <PatientInfoForm
                form={form}
                mobileRef={mobileRef}
                nameRef={nameRef}
                pendingAlert={pendingAlert}
                setPendingAlert={setPendingAlert}
                refreshPending={refreshPending}
                onPatientFound={handlePatientFound}
                onAddressEnter={handleAddressEnter}
              />

              <MedicineBillingSection
                ref={medicineSectionRef}
                form={form}
                medRows={medRows}
                setMedRows={setMedRowsSync}
                otherCharges={otherCharges}
                setOtherCharges={setOtherCharges}
                feesMarkedPending={feesMarkedPending}
                setFeesMarkedPending={setFeesMarkedPending}
                pendingAmount={pendingAmount}
                setPendingAmount={setPendingAmount}
                onOtherChargesEnter={handleOtherChargesEnter}
              />

              <PatientNotesSection
                ref={notesSectionRef}
                form={form}
                attachments={attachments}
                setAttachments={setAttachments}
                onReportsEnter={handleReportsEnter}
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                {lastSaved && (
                  <button type="button" onClick={() => printPatientPrescription(lastSaved)}
                    className="px-5 py-3 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2">
                    <Printer className="w-5 h-5" /> Print Last
                  </button>
                )}
                <button type="submit"
                  className="px-7 py-3 rounded-xl font-semibold text-white shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform flex items-center gap-2"
                  style={{ background: `rgb(var(--primary))` }}>
                  <Save className="w-5 h-5" /> Save Patient
                </button>
                {lastSaved && (
                  <button type="button"
                    onClick={() => setWaPatient({ name: lastSaved.name, mobile: lastSaved.mobile, advice: lastSaved.advice || "" })}
                    className="px-5 py-3 rounded-xl font-semibold bg-green-500 hover:bg-green-600 text-white shadow-lg transition-colors flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4 overflow-y-auto max-h-[calc(100vh-7rem)] pr-0.5">
            <PatientHistoryPanel
              patientHistory={patientHistory}
              historyName={historyName}
              historyMobile={historyMobile}
              historyBillMap={historyBillMap}
              pendingFees={pendingFees}
              refreshPending={refreshPending}
              onSelectVisit={prefillFromPatient}
              onPrintVisit={printPatientPrescription}
            />
          </div>
        </div>
      </div>

      {/* ── WHATSAPP MODAL ── */}
      {waPatient && (
        <WhatsAppModal
          patientName={waPatient.name}
          mobile={waPatient.mobile}
          advice={waPatient.advice}
          onClose={handleCloseWaModal}
        />
      )}

      {/* ── PENDING FEES FULL MODAL ── */}
      <AnimatePresence>
        {showPendingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleClosePendingModal}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100" style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)" }}>
                <WalletCards className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-base">Pending Fees</h3>
                {pendingFees.length > 0 && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">{pendingFees.length}</span>}
                <span className="ml-auto font-bold text-amber-700 text-sm">Total: &#8377;{pendingFees.reduce((s,e) => s+e.amount, 0)}</span>
                <button onClick={handleClosePendingModal} className="text-slate-400 hover:text-slate-600 ml-2"><X className="w-5 h-5" /></button>
              </div>
              {pendingFees.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                  <p className="font-bold text-sm">All fees cleared!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                  {pendingFees.map((e, i) => (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/50 transition-colors">
                      <span className="text-xs text-slate-400 w-5 shrink-0 font-bold">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{e.patientName}</p>
                        <p className="text-[11px] font-mono text-slate-400">{e.patientMobile} &middot; {new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                      </div>
                      <span className="font-black text-amber-600 text-base shrink-0">&#8377;{e.amount}</span>
                      <button onClick={() => { removePendingFee(e.id); refreshPending(); toast({ title: "Deleted", description: `₹${e.amount} entry for ${e.patientName} removed.` }); }}
                        title="Delete entry"
                        className="shrink-0 p-1.5 rounded-xl bg-red-100 text-red-500 hover:bg-red-200 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="px-5 py-3 bg-amber-50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Total Pending</span>
                    <span className="font-black text-amber-600 text-lg">&#8377;{pendingFees.reduce((s,e) => s+e.amount, 0)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING PENDING FEES BUTTON ── */}
      {pendingFees.length > 0 && (
        <button
          onClick={handleOpenPendingModal}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl font-bold text-white text-sm hover:scale-105 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}>
          <WalletCards className="w-4 h-4" />
          <span>Pending Fees</span>
          <span className="bg-white text-amber-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">{pendingFees.length}</span>
        </button>
      )}

    </Layout>
  );
}
