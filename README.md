# ClinicPro — Manglam Clinic

Complete clinic management system for Dr. Vijay Girglani, Manglam Skin Care Clinic.

## Features

### Original (from Manglam Clinic app)
- Patient Registration
- Daily Register (General + Ayurvedic)
- Complaint Codes
- Pathya-Apathya dietary guidelines

### New in ClinicPro
- **Medicine Master** — item catalogue with MRP, landing cost, stock levels
- **Purchase Bills** — enter supplier bills with auto landing cost calculator (handles qty+free, discount, GST)
- **Medicine Billing** — sell medicines to patients, auto stock deduction, auto profit calculation
- **Stock & Expiry** — real-time stock status, low/out alerts, expiry tracking from purchase bills
- **Daily Report** — doctor profit sharing (configurable %), WhatsApp report generator, backup/restore

## Tech Stack
- React + Vite + TypeScript
- Tailwind CSS 4, shadcn/ui components
- 100% offline — localStorage only, no backend
- All data keys prefixed `cp_` (no collision with old app's `mc_` keys)

## Run
```bash
npm install
npm run dev
```

## Data Safety
- All data in `localStorage` under `cp_` keys
- Use Daily Report → Backup to export JSON backup
- Old Manglam Clinic data (mc_* keys) is completely separate and untouched

## Clinic Info
- Manglam Skin Care Clinic
- Dr. Vijay Girglani, B.A.M.S., C.S.D. (Skin), Reg. No. GBI 17318
