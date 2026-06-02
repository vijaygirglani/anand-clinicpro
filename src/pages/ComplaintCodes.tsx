import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getComplaintCodes, addComplaintCode, updateComplaintCode, deleteComplaintCode,
  getMedicineNamesFromPurchases,
  type ComplaintCode, type ComplaintCodeMedicine,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Code2, Plus, Pencil, Trash2, X, Save, Pill } from "lucide-react";

export default function ComplaintCodes() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<ComplaintCode[]>(() => getComplaintCodes());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [complaint, setComplaint] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medicines, setMedicines] = useState<ComplaintCodeMedicine[]>([]);
  const medNames = getMedicineNamesFromPurchases();

  const refresh = () => setCodes(getComplaintCodes());

  const resetForm = () => {
    setCode(""); setComplaint(""); setTreatment(""); setMedicines([]);
    setEditId(null); setShowForm(false);
  };

  const handleEdit = (c: ComplaintCode) => {
    setEditId(c.id); setCode(c.code); setComplaint(c.complaint);
    setTreatment(c.treatment); setMedicines(c.medicines || []);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!code.trim() || !complaint.trim()) return toast({ title: "Code and complaint required", variant: "destructive" });
    const validMeds = medicines.filter(m => m.medicineName.trim());
    if (editId !== null) {
      updateComplaintCode(editId, { code, complaint, treatment, medicines: validMeds });
      toast({ title: "Updated" });
    } else {
      addComplaintCode({ code, complaint, treatment, medicines: validMeds });
      toast({ title: "Added" });
    }
    refresh(); resetForm();
  };

  const addMedRow = () => setMedicines(p => [...p, { medicineName: "", defaultQty: 1, mrp: 0 }]);
  const updateMed = (i: number, field: keyof ComplaintCodeMedicine, val: string | number) =>
    setMedicines(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Complaint Codes</h1>
              <p className="text-sm text-slate-500">{codes.length} codes · with medicine templates</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Code
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-slate-900">{editId ? "Edit" : "New"} Complaint Code</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Code * <span className="text-slate-400 font-normal">(e.g. CCF)</span></label>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CCF"
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary font-mono uppercase" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Complaint Name *</label>
                <input value={complaint} onChange={e => setComplaint(e.target.value)} placeholder="Cough Cold Fever"
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700">Treatment Notes</label>
                <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2}
                  placeholder="Treatment instructions..."
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" />
              </div>
            </div>

            {/* Medicine Template */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-slate-800 text-sm">Default Medicines</span>
                  <span className="text-xs text-slate-400">(auto-fill when code is typed)</span>
                </div>
                <button onClick={addMedRow}
                  className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </button>
              </div>

              {medicines.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-6 text-center text-slate-400 text-sm">
                  No medicines yet — click "Add Medicine" to add default prescriptions
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-500 font-semibold">Medicine Name</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-semibold w-24">Default Qty</th>

                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medicines.map((m, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">
                            <input value={m.medicineName}
                              onChange={e => updateMed(i, "medicineName", e.target.value)}
                              list="med-template-names"
                              placeholder="Type medicine name..."
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            <datalist id="med-template-names">
                              {medNames.map(n => <option key={n} value={n} />)}
                            </datalist>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={m.defaultQty} min={1}
                              onChange={e => updateMed(i, "defaultQty", Number(e.target.value))}
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setMedicines(p => p.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" /> {editId ? "Update" : "Save"} Code
              </button>
              <button onClick={resetForm}
                className="border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Codes List */}
        <div className="space-y-3">
          {codes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl text-center py-16 text-slate-400">
              <Code2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No complaint codes yet</p>
              <p className="text-sm">Add codes with medicine templates for fast prescribing</p>
            </div>
          ) : codes.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg font-mono">{c.code}</span>
                    <span className="font-semibold text-slate-900">{c.complaint}</span>
                  </div>
                  {c.treatment && <p className="text-xs text-slate-500 mb-2">{c.treatment}</p>}
                  {c.medicines && c.medicines.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.medicines.map((m, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">
                          {m.medicineName} × {m.defaultQty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this code?")) { deleteComplaintCode(c.id); refresh(); } }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
