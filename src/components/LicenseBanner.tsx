// ── src/components/LicenseBanner.tsx ────────────────────────────────────────
import { getLicenseInfo } from "@/lib/license";
import { AlertTriangle, Clock } from "lucide-react";

export function LicenseBanner() {
  const info = getLicenseInfo();
  console.log("LicenseBanner rendering", info.status);
  console.log("License info:", info);

  if (info.status === "active" || info.status === "blocked") return null;

  if (info.status === "warning") {
    return (
      <div className="w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold"
        style={{ background: "linear-gradient(90deg,#fef9c3,#fde68a)", color: "#92400e" }}>
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          License expires in <strong>{info.daysLeft} days</strong> —{" "}
          {info.expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
          Please renew to avoid interruption.
        </span>
      </div>
    );
  }

  if (info.status === "grace") {
    return (
      <div className="w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold"
        style={{ background: "linear-gradient(90deg,#fed7aa,#fca5a5)", color: "#7f1d1d" }}>
        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
        <span>
          ⚠️ License EXPIRED — Grace period: <strong>{info.graceDaysLeft} day{info.graceDaysLeft !== 1 ? "s" : ""} left</strong>.
          App will stop working after this. Contact Manglam ClinicPro to renew.
        </span>
      </div>
    );
  }

  return null;
}
