import { useState } from "react";
import { RadioTower } from "lucide-react";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/format";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import type { LiveStatusResponse } from "../types";

const STATUS_VARIANT: Record<string, "success" | "neutral" | "danger" | "info"> = {
  scheduled: "info",
  active: "success",
  landed: "success",
  cancelled: "danger",
  incident: "danger",
  diverted: "danger",
};

// On-demand only, deliberately — AviationStack's free plan is capped at 100 requests/month
// total, so this is a manual button rather than something that loads automatically. It also only
// returns data for flights within AviationStack's real-time/recent window, so most future-dated
// bookings will correctly show "not available yet" rather than an error.
export function LiveFlightStatus({ flightId }: { flightId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveStatusResponse | null>(null);

  async function check() {
    setLoading(true);
    try {
      const data = await apiFetch<LiveStatusResponse>(`/api/flights/${flightId}/live-status`);
      setResult(data);
    } catch {
      setResult({ available: false, reason: "Could not check live status right now." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button variant="outline" size="sm" loading={loading} onClick={check}>
        {!loading && <RadioTower className="h-3.5 w-3.5" />}
        Check Live Status
      </Button>

      {result && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/50">
          {result.available ? (
            <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[result.status.status] ?? "neutral"}>{result.status.status}</Badge>
                {result.status.departureDelayMinutes ? <span>Delayed {result.status.departureDelayMinutes} min</span> : null}
              </div>
              {result.status.departureScheduled && (
                <div>Departure: {formatDateTime(result.status.departureScheduled)}</div>
              )}
              {result.status.arrivalScheduled && <div>Arrival: {formatDateTime(result.status.arrivalScheduled)}</div>}
              {result.status.departureTerminal && <div>Terminal {result.status.departureTerminal}, Gate {result.status.departureGate ?? "—"}</div>}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">{result.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
