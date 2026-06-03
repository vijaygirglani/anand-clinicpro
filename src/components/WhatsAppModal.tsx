import { useState } from "react";
import { getWATemplates, fillTemplate, openWhatsApp, saveWATemplate, type WATemplate } from "@/lib/whatsapp";
import { getSettings, getActiveDoctor } from "@/lib/settings";
import { X, Send, Pencil, Check } from "lucide-react";
import { format } from "date-fns";

interface Props {
  patientName: string;
  mobile: string;
  onClose: () => void;
}

export function WhatsAppModal({ patientName, mobile, onClose }: Props) {
  const settings = getSettings();
  const doctor = getActiveDoctor();
  const templates = getWATemplates();

  const [selectedId, setSelectedId] = useState(templates[0]?.id || "followup");
  const [editingMsg, setEditingMsg] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const vars = {
    patientName,
    clinicName: settings.clinicName,
    doctorName: `${doctor?.name || settings.doctor1Name} (${doctor?.designation || settings.doctor1Designation})`,
    date: format(new Date(), "dd/MM/yyyy"),
  };

  const selected = templates.find(t => t.id === selectedId) || templates[0];
  const filled = fillTemplate(editingMsg ? customMsg : selected.message, vars);

  const handleSelectTemplate = (t: WATemplate) => {
    setSelectedId(t.id);
    setCustomMsg(fillTemplate(t.message, vars));
    setEditingMsg(false);
  };

  const handleSend = () => {
    const msg = editingMsg ? customMsg : filled;
    if (!mobile || mobile === "0000000000") {
      alert("No mobile number for this patient");
      return;
    }
    openWhatsApp(mobile, msg);
    onClose();
  };

  const handleSaveTemplate = () => {
    if (!selected) return;
    saveWATemplate({ ...selected, message: customMsg });
    setEditingMsg(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Send WhatsApp</p>
              <p className="text-xs text-slate-500">{patientName} · {mobile}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template selector */}
        <div className="p-5 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Message Template</p>
          <div className="grid grid-cols-2 gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => handleSelectTemplate(t)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border-2
                  ${selectedId === t.id ? "border-green-400 bg-green-50 text-green-700" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"}`}>
                <span className="text-base">{t.icon}</span>
                <span className="text-xs leading-tight">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message preview */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Preview</p>
            {!editingMsg ? (
              <button onClick={() => { setEditingMsg(true); setCustomMsg(filled); }}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSaveTemplate}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                  <Check className="w-3 h-3" /> Save Template
                </button>
                <button onClick={() => setEditingMsg(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
            )}
          </div>
          {editingMsg ? (
            <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={6}
              className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-sm bg-green-50 focus:outline-none focus:border-green-400 resize-none" />
          ) : (
            <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap border border-green-100">
              {filled}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSend}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
