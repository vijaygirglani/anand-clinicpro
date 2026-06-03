// ClinicPro — WhatsApp Templates

export interface WATemplate {
  id: string;
  name: string;
  icon: string;
  message: string; // supports {patientName}, {clinicName}, {doctorName}, {date}
}

const WA_TEMPLATES_KEY = "cp_wa_templates";

export const DEFAULT_TEMPLATES: WATemplate[] = [
  {
    id: "followup",
    name: "Follow-up Reminder",
    icon: "🔔",
    message: "નમસ્તે {patientName} 🙏\nઆપની સારવારનું ફોલોઅપ ચેકઅપ બાકી છે. કૃપા કરીને સમયસર મુલાકાત લઈ સારવાર ચાલુ રાખશો.\n\n{clinicName}\n{doctorName}",
  },
  {
    id: "medicine",
    name: "Medicine Reminder",
    icon: "💊",
    message: "નમસ્તે {patientName} 🙏\nઆપની દવા પૂરી થઈ ગઈ હશે. નવી દવા માટે ક્લિનિક પર આવો અથવા ફોન કરો.\n\n{clinicName}\n{doctorName}",
  },
  {
    id: "appointment",
    name: "Appointment Reminder",
    icon: "📅",
    message: "નમસ્તે {patientName} 🙏\nઆપનો {date} ના રોજ અમારી ક્લિનિક પર appointment છે. સમયસર પધારવા વિનંતી.\n\n{clinicName}\n{doctorName}",
  },
  {
    id: "suvarnaprashan",
    name: "Suvarnaprashan Invitation",
    icon: "🌿",
    message: "નમસ્તે {patientName} 🙏\nઆગામી સ્વર્ણ પ્રાશન સંસ્કાર નું આયોજન {clinicName} ખાતે થઈ રહ્યું છે. આ અમૃત ઔષધ બાળકોની રોગ પ્રતિકારક શક્તિ, બુદ્ધિ અને સ્મૃતિ વધારે છે. વધુ માહિતી માટે સંપર્ક કરો.\n\n{clinicName}\n{doctorName}",
  },
  {
    id: "camp",
    name: "Free Checkup Camp",
    icon: "✅",
    message: "નમસ્તે {patientName} 🙏\n{clinicName} દ્વારા ફ્રી ચેકઅપ કૅમ્પ નું આયોજન {date} ના રોજ થઈ રહ્યું છે. આ મૌકો ચૂકશો નહિ. વધુ માહિતી માટે સંપર્ક કરો.\n\n{doctorName}",
  },
  {
    id: "seasonal",
    name: "Seasonal Health Awareness",
    icon: "🌦️",
    message: "નમસ્તે {patientName} 🙏\nઋતુ પ્રમાણે સ્વાસ્થ્ય ખ્યાલ રાખો. ઉકાળેલ પાણી પીવો, ખોરાકમાં સ્વચ્છતા રાખો. કોઈ તકલીફ હોય તો {clinicName} પર સંપર્ક કરો.\n\n{doctorName}",
  },
  {
    id: "diabetes",
    name: "Diabetes / BP Follow-up",
    icon: "🩺",
    message: "નમસ્તે {patientName} 🙏\nડાયાબિટીસ/બ્લડ પ્રેશર ની તકલીફ માં નિયમિત ચેકઅપ ખૂબ જ જરૂરી છે. {clinicName} પર આવી ચેકઅપ કરાવો.\n\n{doctorName}",
  },
  {
    id: "thankyou",
    name: "Thank You Message",
    icon: "🙏",
    message: "નમસ્તે {patientName} 🙏\n{clinicName} માં આવવા બદલ ખૂબ ખૂબ આભાર. આપ જલ્દી સ્વસ્થ થાઓ તેવી શુભ કામના.\n\n{doctorName}",
  },
  {
    id: "custom",
    name: "Custom Message",
    icon: "✏️",
    message: "નમસ્તે {patientName} 🙏\n\n{clinicName}\n{doctorName}",
  },
];

export function getWATemplates(): WATemplate[] {
  try {
    const stored = localStorage.getItem(WA_TEMPLATES_KEY);
    if (!stored) return DEFAULT_TEMPLATES;
    const saved = JSON.parse(stored) as WATemplate[];
    // Merge with defaults — add any new default templates not in saved
    const savedIds = new Set(saved.map(t => t.id));
    const merged = [...saved];
    for (const def of DEFAULT_TEMPLATES) {
      if (!savedIds.has(def.id)) merged.push(def);
    }
    return merged;
  } catch { return DEFAULT_TEMPLATES; }
}

export function saveWATemplate(template: WATemplate): void {
  const templates = getWATemplates();
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) templates[idx] = template;
  else templates.push(template);
  localStorage.setItem(WA_TEMPLATES_KEY, JSON.stringify(templates));
}

export function fillTemplate(template: string, vars: {
  patientName?: string;
  clinicName?: string;
  doctorName?: string;
  date?: string;
}): string {
  return template
    .replace(/{patientName}/g, vars.patientName || "")
    .replace(/{clinicName}/g, vars.clinicName || "")
    .replace(/{doctorName}/g, vars.doctorName || "")
    .replace(/{date}/g, vars.date || "");
}

export function openWhatsApp(mobile: string, message: string): void {
  const clean = mobile.replace(/\D/g, "");
  const phone = clean.startsWith("91") ? clean : `91${clean}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
