import { useMemo } from "react";

interface Seat {
  seatNumber: string;
  isBooked: boolean;
}

export function SeatMapGrid({
  seats,
  selectedSeat,
  takenByOthersInDraft,
  onSelect,
}: {
  seats: Seat[];
  selectedSeat: string | null;
  /** seat numbers already claimed by other passengers in this same in-progress booking */
  takenByOthersInDraft: Set<string>;
  onSelect: (seatNumber: string) => void;
}) {
  const rows = useMemo(() => {
    const byRow = new Map<number, Seat[]>();
    for (const seat of seats) {
      const match = /^(\d+)([A-Z])$/.exec(seat.seatNumber);
      if (!match) continue;
      const row = Number(match[1]);
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push(seat);
    }
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, rowSeats]) => [
        row,
        rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)),
      ] as const);
  }, [seats]);

  return (
    <div className="inline-flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
      {rows.map(([row, rowSeats]) => {
        const half = Math.ceil(rowSeats.length / 2);
        const left = rowSeats.slice(0, half);
        const right = rowSeats.slice(half);
        return (
          <div key={row} className="flex items-center gap-2">
            <span className="w-5 text-right text-xs text-slate-400">{row}</span>
            {[left, right].map((group, groupIdx) => (
              <div key={groupIdx} className="flex gap-1">
                {group.map((seat) => {
                  const isSelected = seat.seatNumber === selectedSeat;
                  const isTakenByDraft = takenByOthersInDraft.has(seat.seatNumber);
                  const unavailable = seat.isBooked || (isTakenByDraft && !isSelected);
                  return (
                    <button
                      key={seat.seatNumber}
                      type="button"
                      disabled={unavailable}
                      onClick={() => onSelect(seat.seatNumber)}
                      title={seat.seatNumber}
                      className={
                        "grid h-8 w-8 place-items-center rounded text-[10px] font-semibold " +
                        (isSelected
                          ? "bg-brand-600 text-white"
                          : unavailable
                            ? "cursor-not-allowed bg-slate-200 text-slate-400 line-through"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
                      }
                    >
                      {seat.seatNumber.slice(String(row).length)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-50" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-brand-600" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-200" /> Taken
        </span>
      </div>
    </div>
  );
}
