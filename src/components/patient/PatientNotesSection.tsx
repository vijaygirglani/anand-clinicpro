import React, {
  useRef, useEffect, forwardRef, useImperativeHandle,
} from "react";
import { UseFormReturn } from "react-hook-form";
import { Paperclip, X } from "lucide-react";
import { type PatientFormValues } from "./types";

export interface PatientNotesSectionRef {
  focusAdvice: () => void;
}

interface PatientNotesSectionProps {
  form: UseFormReturn<PatientFormValues>;
  attachments: string[];
  setAttachments: (v: string[] | ((prev: string[]) => string[])) => void;
  onReportsEnter: () => void;
}

export const PatientNotesSection = React.memo(forwardRef<PatientNotesSectionRef, PatientNotesSectionProps>(
  function PatientNotesSection({ form, attachments, setAttachments, onReportsEnter }, ref) {
    const adviceRef = useRef<HTMLTextAreaElement | null>(null);
    const reportsRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusAdvice: () => adviceRef.current?.focus(),
    }));

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files || []).forEach(file => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = ev => setAttachments(prev => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const { ref: adviceRHFRef, ...adviceRest } = form.register("advice");
    const { ref: reportsRHFRef, ...reportsRest } = form.register("reports");

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Advice / Notes
              <span className="text-slate-400 font-normal text-xs ml-2">— F5 = follow-up after 5 days</span>
            </label>
            <textarea {...adviceRest}
              ref={el => { adviceRHFRef(el); adviceRef.current = el; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); reportsRef.current?.focus(); } }}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none text-slate-800" placeholder="F5 · Rest, diet..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Reports Required</label>
            <textarea {...reportsRest}
              ref={el => { reportsRHFRef(el); reportsRef.current = el; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onReportsEnter(); } }}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none text-slate-800" placeholder="Blood test, X-ray..." />
          </div>
        </div>
        {/* Attachments */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-slate-400" /> Attach Report Images
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-6 h-6 text-slate-300" />
            <p className="text-sm text-slate-400">Click to upload image reports</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {attachments.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} className="w-20 h-20 object-cover rounded-xl border border-slate-200" alt={`Report ${i + 1}`} />
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
));
