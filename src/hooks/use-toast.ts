// Thin shim — keeps the old useToast() API but delegates to SimpleToast
// (no Radix primitives, no viewport, no transitionend events)
import { toast } from "@/components/ui/SimpleToast";

export function useToast() {
  return { toast, toasts: [] as never[], dismiss: (_id?: string) => {} };
}

export { toast };
