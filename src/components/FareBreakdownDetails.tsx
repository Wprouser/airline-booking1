import type { FareBreakdown } from "../types";
import { formatMoney } from "../utils/format";

export function FareBreakdownDetails({ breakdown }: { breakdown: FareBreakdown }) {
  const money = (amount: number) => formatMoney(amount, breakdown.currency);

  return (
    <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
      <Row label="Base Fare" value={money(breakdown.baseFare)} />
      <Row label="Airport Taxes" value={money(breakdown.airportTax)} />
      <Row label="Fuel Surcharge" value={money(breakdown.fuelSurcharge)} />
      <Row label="Service Charges" value={money(breakdown.serviceCharge)} />
      <Row label="Convenience Fee" value={money(breakdown.convenienceFee)} />
      {breakdown.discount > 0 && <Row label="Discount" value={`-${money(breakdown.discount)}`} highlight="text-emerald-600 dark:text-emerald-400" />}
      <Row label={breakdown.taxLabel} value={money(breakdown.gst)} />
      <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
        <span>Total Payable</span>
        <span>{money(breakdown.total)}</span>
      </div>
      {breakdown.currency !== "USD" && (
        <div className="text-right text-[11px] text-slate-400 dark:text-slate-500">≈ {formatMoney(breakdown.approxUsd, "USD")}</div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className={`flex items-center justify-between ${highlight ?? ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
