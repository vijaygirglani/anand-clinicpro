import * as z from "zod";
import { format } from "date-fns";

export const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(1, "Mobile / Case No. required"),
  visitDate: z.string().min(1, "Visit date required"),
  age: z.coerce.number().min(0).optional(),
  ageMonths: z.coerce.number().min(0).max(11).optional(),
  weight: z.string().optional(),
  address: z.string().optional(),
  complaintCode: z.string().optional(),
  complaint: z.string().optional(),
  treatment: z.string().optional(),
  advice: z.string().optional(),
  reports: z.string().optional(),
  fees: z.coerce.number().min(0).optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export const todayStr = format(new Date(), "yyyy-MM-dd");

export const emptyDefaults: PatientFormValues = {
  name: "", mobile: "", visitDate: todayStr,
  age: 0, ageMonths: 0, weight: "", address: "",
  complaintCode: "", complaint: "", treatment: "",
  advice: "", reports: "", fees: 0,
};

export interface MedRow {
  _id: string;
  medicineName: string;
  qty: number;
  mrp: number;
  batchNo: string;
  billId: string;
  landingCostPerTablet: number;
}

export const emptyMedRow = (): MedRow => ({
  _id: crypto.randomUUID(),
  medicineName: "", qty: 0, mrp: 0, batchNo: "", billId: "", landingCostPerTablet: 0,
});
