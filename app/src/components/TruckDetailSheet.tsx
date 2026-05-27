import { useEffect, useMemo, useState } from "react";
import { X, Copy, HelpCircle, ChevronUp, ArrowUpDown } from "lucide-react";
import type { Truck } from "../data/types";
import { formatTime } from "../lib/time";
import { CURRENT_TIME_MINUTES, TODAY_ISO } from "../data/mock";

type DisplayStatus = "scheduled" | "in_progress" | "loading" | "departed";

/** Derive a realistic status from the truck's timing vs the prototype's "now". */
function deriveDisplayStatus(
  truck: Truck,
  startMinutes: number | null,
  nowMinutes: number,
): DisplayStatus {
  // Past dates → fully completed.
  if (truck.dateIso < TODAY_ISO) return "departed";
  // Future dates → nothing has happened yet.
  if (truck.dateIso > TODAY_ISO) return "scheduled";
  // Today → derive from minutes vs now.
  const start = startMinutes ?? truck.apptMinutes;
  const end = start + truck.durationMinutes;
  if (nowMinutes >= end) return "departed";
  if (nowMinutes >= start) {
    // While docked: inbound trucks are unloading, outbound are loading.
    return truck.direction === "outbound" ? "loading" : "in_progress";
  }
  // Carrier en route within ~30 min of appointment.
  if (nowMinutes >= start - 30) return "in_progress";
  return "scheduled";
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDateLabel(dateIso: string): string {
  const [, m, d] = dateIso.split("-").map(Number);
  return `${SHORT_MONTHS[(m ?? 1) - 1]} ${d}`;
}

interface Props {
  open: boolean;
  truck: Truck | null;
  dockLabel: string | null;
  startMinutes: number | null;
  onClose: () => void;
}

function statusPill(status: DisplayStatus, direction: Truck["direction"]) {
  switch (status) {
    case "in_progress":
      return { label: "En route", bg: "#fef3c7", text: "#92400e" };
    case "loading":
      return {
        label: direction === "outbound" ? "Loading" : "Unloading",
        bg: "#dbeafe",
        text: "#1e40af",
      };
    case "departed":
      return { label: "Departed", bg: "#d1fae5", text: "#065f46" };
    case "scheduled":
    default:
      return { label: "Scheduled", bg: "#e5e7eb", text: "#374151" };
  }
}

// Stable hash so the same truck always gets the same merchants / lateness / pallets.
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MERCHANT_POOL = [
  "Aritzia", "Backcountry", "ClearJet", "Huckberry", "Madewell", "Outdoor Voices",
  "Allbirds", "Brooklinen", "Parade", "Glossier", "Rothy's", "Stitch Fix",
  "Reformation", "Everlane", "Vuori", "Tuckernuck",
];

const DEST_POOL = ["ATL-13", "ATL-14", "ATL-21", "BNA-3", "CLT-8", "MEM-2", "JAX-5"];

function buildMerchants(truck: Truck) {
  const h = hash(truck.shipmentId);
  const total = truck.parcelCount;
  const count = 4 + (h % 4); // 4–7 merchants
  // Generate weights, normalize to sum to total
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const w = ((hash(truck.shipmentId + i) % 90) + 10); // 10–99
    weights.push(w);
    sum += w;
  }
  const merchants = weights.map((w, i) => ({
    name: MERCHANT_POOL[(h + i) % MERCHANT_POOL.length],
    expected: Math.max(1, Math.round((w / sum) * total)),
  }));
  // Fix rounding so they sum to total
  const drift = total - merchants.reduce((s, m) => s + m.expected, 0);
  if (merchants.length) merchants[0].expected = Math.max(1, merchants[0].expected + drift);
  return merchants;
}

function buildPallets(
  truck: Truck,
  displayStatus: DisplayStatus,
  actualParcels: number,
  expectedParcels: number,
) {
  const h = hash(truck.shipmentId);
  const count = Math.max(1, Math.round(expectedParcels / 120));
  const perPallet = Math.ceil(expectedParcels / count);
  // distribute parcels across pallets evenly-ish; received pallets account for actualParcels
  const receivedShare = expectedParcels > 0 ? actualParcels / expectedParcels : 0;
  const receivedCount = Math.round(count * receivedShare);
  const rows: {
    id: string;
    received: boolean | null;
    passThrough: boolean;
    destination: string;
    expected: number;
    actual: number;
  }[] = [];
  let remainingExpected = expectedParcels;
  for (let i = 0; i < count; i++) {
    const expected = i === count - 1 ? remainingExpected : Math.min(perPallet, remainingExpected);
    remainingExpected -= expected;
    const received =
      displayStatus === "scheduled" || displayStatus === "in_progress" ? false : i < receivedCount;
    rows.push({
      id: `P-${truck.shipmentId.slice(0, 4).toUpperCase()}${(i + 1).toString().padStart(2, "0")}`,
      received,
      passThrough: ((h + i) % 5) === 0,
      destination: DEST_POOL[(h + i) % DEST_POOL.length],
      expected,
      actual: received ? expected : 0,
    });
  }
  return rows;
}

export function TruckDetailSheet({ open, truck, dockLabel, startMinutes, onClose }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [merchantsOpen, setMerchantsOpen] = useState(true);
  const [palletsOpen, setPalletsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // All hooks must run unconditionally; gate the heavy data behind a safe truck fallback.
  const truckSafe = truck;
  const startMinutesSafe = startMinutes;

  const data = useMemo(() => {
    if (!truckSafe || startMinutesSafe == null) return null;
    const displayStatus = deriveDisplayStatus(truckSafe, startMinutesSafe, CURRENT_TIME_MINUTES);
    const h = hash(truckSafe.shipmentId);
    // Lateness: scheduled trucks have none yet; others get a stable -3 to +18 minute delta.
    const rawDelta = (h % 22) - 3; // -3..18
    const lateMinutes = displayStatus === "scheduled" ? null : rawDelta;
    const scheduledArrival = startMinutesSafe;
    const actualArrival =
      displayStatus === "scheduled" || displayStatus === "in_progress"
        ? null
        : scheduledArrival + (lateMinutes ?? 0);

    const expectedParcels = truckSafe.parcelCount;
    const expectedPallets = Math.max(1, Math.round(expectedParcels / 120));

    let actualParcels = 0;
    let actualPallets = 0;
    if (displayStatus === "departed") {
      actualParcels = expectedParcels;
      actualPallets = expectedPallets;
    } else if (displayStatus === "loading") {
      // While docked: progress proportional to time elapsed since arrival.
      const elapsed = Math.max(0, CURRENT_TIME_MINUTES - scheduledArrival);
      const progress = Math.min(0.95, Math.max(0.05, elapsed / Math.max(1, truckSafe.durationMinutes)));
      actualParcels = Math.floor(expectedParcels * progress);
      actualPallets = Math.floor(expectedPallets * progress);
    }

    const milesAway = 2 + (h % 18); // 2..19 mi
    const minutesAway = Math.round(milesAway * 2.4);

    return {
      displayStatus,
      lateMinutes,
      scheduledArrival,
      actualArrival,
      expectedParcels,
      actualParcels,
      expectedPallets,
      actualPallets,
      milesAway,
      minutesAway,
      merchants: buildMerchants(truckSafe),
      pallets: buildPallets(truckSafe, displayStatus, actualParcels, expectedParcels),
    };
  }, [truckSafe, startMinutesSafe]);

  if (!open || !truck || !data) return null;

  const pill = statusPill(data.displayStatus, truck.direction);
  const shortTruckId = truck.shipmentId.slice(0, 6).toUpperCase();
  const dockNumber = dockLabel ? dockLabel.replace(/[^0-9]/g, "") || "--" : "--";

  const isOutbound = truck.direction === "outbound";
  const timeLabel = isOutbound ? "Departure time" : "Arrival time";
  const dateLabel = formatDateLabel(truck.dateIso);
  const arrivalActualStr = data.actualArrival != null ? `${dateLabel}, ${formatTime(data.actualArrival)}` : "--";
  const arrivalSchedStr = `${dateLabel}, ${formatTime(data.scheduledArrival)}`;

  // Late text — match the real app's TimeLateText pattern: "On time" / "X min late" / "X min early"
  const lateText = (() => {
    if (data.lateMinutes == null) return null;
    if (data.lateMinutes === 0) return { text: "On time", color: "#065f46" };
    if (data.lateMinutes > 0) return { text: `${data.lateMinutes} min late`, color: "#b91c1c" };
    return { text: `${Math.abs(data.lateMinutes)} min early`, color: "#065f46" };
  })();

  const onCopy = () => {
    navigator.clipboard?.writeText(truck.shipmentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const mapHeadline = (() => {
    if (data.displayStatus === "departed") return "Departed";
    if (data.displayStatus === "loading") return "At dock";
    if (data.displayStatus === "in_progress") return `${data.milesAway} mi, ${data.minutesAway} min away`;
    return isOutbound ? "Awaiting departure" : "Awaiting arrival";
  })();

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label="Truck details"
        className="fixed top-0 right-0 bottom-0 z-[70] bg-white shadow-2xl border-l border-[#e5e7eb] flex flex-col"
        style={{ width: 598 }}
      >
        {/* Header — 3 stats, matches web-next */}
        <div className="px-6 pt-5 pb-5 border-b border-[#e5e7eb] flex items-start gap-6">
          <HeaderStat label="Truck origin" value={truck.partner.replace(/ returns$/, "")} />
          <HeaderStat label="Truck ID" value={shortTruckId} />
          <HeaderStat label="Dock door" value={dockNumber} />
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 -mr-1 -mt-1 size-7 grid place-items-center rounded hover:bg-black/5"
            aria-label="Close"
          >
            <X className="size-5 text-[#111111]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Details card */}
          <section className="px-6 py-5 border-b border-[#e5e7eb]">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center gap-3"
            >
              <h2 className="text-title-lg text-[#111111]">Details</h2>
              <span
                className="text-[12px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: pill.bg, color: pill.text }}
              >
                {pill.label}
              </span>
              <ChevronUp
                className={`ml-auto size-5 text-[#6b7280] transition-transform ${detailsOpen ? "" : "rotate-180"}`}
              />
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-5">
                {/* Map (kept light per direction — same simple SVG across sheets) */}
                <div className="relative w-full rounded overflow-hidden border border-[#e5e7eb]" style={{ height: 200, background: "#f3f0ea" }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
                    <rect width="400" height="200" fill="#f3f0ea" />
                    <path d="M0,140 C100,120 200,160 400,90" stroke="#ffffff" strokeWidth="10" fill="none" />
                    <path d="M40,0 C80,80 160,120 200,200" stroke="#ffffff" strokeWidth="8" fill="none" />
                    <path d="M0,40 L400,60" stroke="#f6c453" strokeWidth="6" fill="none" opacity="0.8" />
                    <ellipse cx="80" cy="60" rx="50" ry="30" fill="#cfe3c4" opacity="0.7" />
                    <ellipse cx="330" cy="160" rx="60" ry="28" fill="#cfe3c4" opacity="0.7" />
                    <path d="M120,40 C180,80 240,80 280,140" stroke="#111111" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                    <circle cx="120" cy="40" r="14" fill="#111111" />
                    <circle cx="280" cy="140" r="10" fill="#111111" />
                    <circle cx="280" cy="140" r="4" fill="#ffffff" />
                  </svg>
                  <div className="absolute top-3 left-3 bg-white/95 rounded px-2.5 py-1.5 text-[11px] leading-tight shadow-sm">
                    <div className="font-semibold text-[#111111]">{mapHeadline}</div>
                    <div className="text-[#6b7280]">Updated 2 min ago</div>
                  </div>
                  <div className="absolute bottom-2 left-2 text-label-xs text-[#6b7280] bg-white/80 px-1.5 py-0.5 rounded">© mapbox</div>
                </div>

                {/* Full Truck ID */}
                <SecondaryRow label="Truck ID">
                  <div className="flex items-center gap-2 text-[14px] text-[#111111]">
                    <span className="font-medium">{truck.shipmentId}</span>
                    <button
                      type="button"
                      onClick={onCopy}
                      className="size-6 grid place-items-center rounded hover:bg-black/5"
                      aria-label="Copy truck ID"
                    >
                      <Copy className="size-4 text-[#6b7280]" />
                    </button>
                    {copied && <span className="text-[11px] text-[#6b7280]">Copied</span>}
                  </div>
                </SecondaryRow>

                {/* Arrival/Departure time — actual stacked over scheduled */}
                <SecondaryRow label={timeLabel}>
                  <StackedField
                    actualLabel="Actual"
                    actualValue={arrivalActualStr}
                    scheduledLabel="Scheduled"
                    scheduledValue={arrivalSchedStr}
                    actualSuffix={lateText && data.actualArrival != null ? (
                      <span className="text-[13px] font-medium" style={{ color: lateText.color }}>
                        ・ {lateText.text}
                      </span>
                    ) : null}
                  />
                </SecondaryRow>

                {/* Pallets */}
                <SecondaryRow label="Pallets">
                  <StackedField
                    actualLabel="Actual"
                    actualValue={data.actualPallets.toLocaleString()}
                    scheduledLabel="Expected"
                    scheduledValue={data.expectedPallets.toLocaleString()}
                  />
                </SecondaryRow>

                {/* Parcels */}
                <SecondaryRow label="Parcels">
                  <StackedField
                    actualLabel="Actual"
                    actualValue={data.actualParcels.toLocaleString()}
                    scheduledLabel="Expected"
                    scheduledValue={data.expectedParcels.toLocaleString()}
                  />
                </SecondaryRow>
              </div>
            )}
          </section>

          {/* Merchants card */}
          <section className="px-6 py-5 border-b border-[#e5e7eb]">
            <button
              type="button"
              onClick={() => setMerchantsOpen((v) => !v)}
              className="w-full flex items-center"
            >
              <h2 className="text-title-lg text-[#111111]">Merchants</h2>
              <ChevronUp
                className={`ml-auto size-5 text-[#6b7280] transition-transform ${merchantsOpen ? "" : "rotate-180"}`}
              />
            </button>
            {merchantsOpen && (
              <div className="mt-3 border border-[#e5e7eb] rounded overflow-hidden">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[#f9fafb] text-[12px] font-medium text-[#374151] px-4 py-2.5">
                  <HeaderCell label="Merchant" />
                  <HeaderCell label="Parcels expected" />
                  <HeaderCell label="Parcels actual" />
                </div>
                {data.merchants.map((m, i) => {
                  const ratio = data.expectedParcels > 0 ? data.actualParcels / data.expectedParcels : 0;
                  const actual = data.displayStatus === "departed" ? m.expected : Math.floor(m.expected * ratio);
                  return (
                    <div
                      key={m.name + i}
                      className={`grid grid-cols-[1.4fr_1fr_1fr] px-4 py-3 text-[14px] text-[#111111] ${
                        i < data.merchants.length - 1 ? "border-b border-[#e5e7eb]" : ""
                      }`}
                    >
                      <div>{m.name}</div>
                      <div className="text-[#9ca3af]">{m.expected.toLocaleString()}</div>
                      <div>{actual.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pallets card — matches web-next PalletsCard */}
          <section className="px-6 py-5">
            <button
              type="button"
              onClick={() => setPalletsOpen((v) => !v)}
              className="w-full flex items-center"
            >
              <h2 className="text-title-lg text-[#111111]">Pallets</h2>
              <ChevronUp
                className={`ml-auto size-5 text-[#6b7280] transition-transform ${palletsOpen ? "" : "rotate-180"}`}
              />
            </button>
            {palletsOpen && (
              <div className="mt-3 border border-[#e5e7eb] rounded overflow-x-auto">
                <table className="w-full text-[14px] text-[#111111] border-collapse">
                  <thead>
                    <tr className="bg-[#f9fafb] text-[12px] font-medium text-[#374151]">
                      <th className="text-left px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Pallet ID" /></th>
                      <th className="text-left px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Status" /></th>
                      <th className="text-left px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Pass-through" /></th>
                      <th className="text-left px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Destination" /></th>
                      <th className="text-right px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Expected" /></th>
                      <th className="text-right px-3 py-2.5 whitespace-nowrap"><HeaderCell label="Actual" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pallets.map((p, i) => (
                      <tr key={p.id} className={i < data.pallets.length - 1 ? "border-b border-[#e5e7eb]" : ""}>
                        <td className="px-3 py-3 text-[#6b7280] whitespace-nowrap">{p.id}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {p.received ? (
                            <span className="inline-block text-[12px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#d1fae5", color: "#065f46" }}>
                              Received
                            </span>
                          ) : (
                            <span className="inline-block text-[12px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#e5e7eb", color: "#374151" }}>
                              Not received
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[#374151] whitespace-nowrap">{p.passThrough ? "Yes" : "No"}</td>
                        <td className="px-3 py-3 text-[#374151] whitespace-nowrap">{p.destination}</td>
                        <td className="px-3 py-3 text-[#9ca3af] text-right whitespace-nowrap">{p.expected.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">{p.actual.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="h-16" />
        </div>

        <button
          type="button"
          className="absolute bottom-5 right-5 size-12 rounded-full bg-white shadow-lg border border-[#e5e7eb] grid place-items-center hover:bg-[#f9fafb]"
          aria-label="Help"
        >
          <HelpCircle className="size-6 text-[#dc2626]" strokeWidth={2.25} />
        </button>
      </aside>
    </>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-[#6b7280] whitespace-nowrap">{label}</div>
      <div className="mt-1 text-[24px] leading-tight font-bold text-[#111111] truncate">{value}</div>
    </div>
  );
}

function SecondaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] text-[#6b7280] mb-1">{label}</div>
      {children}
    </div>
  );
}

function StackedField({
  actualLabel,
  actualValue,
  scheduledLabel,
  scheduledValue,
  actualSuffix,
}: {
  actualLabel: string;
  actualValue: string;
  scheduledLabel: string;
  scheduledValue: string;
  actualSuffix?: React.ReactNode;
}) {
  const actualMuted = actualValue === "--" || actualValue === "0";
  return (
    <div className="grid grid-cols-[90px_1fr] gap-y-1 text-[14px]">
      <span className="text-[#6b7280]">{actualLabel}</span>
      <span className={`flex items-center gap-2 ${actualMuted ? "text-[#9ca3af]" : "text-[#111111]"}`}>
        <span>{actualValue}</span>
        {actualSuffix}
      </span>
      <span className="text-[#6b7280]">{scheduledLabel}</span>
      <span className="text-[#9ca3af]">{scheduledValue}</span>
    </div>
  );
}

function HeaderCell({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <ArrowUpDown className="size-3 text-[#9ca3af]" />
    </div>
  );
}
