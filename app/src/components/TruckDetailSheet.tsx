import { useEffect, useState } from "react";
import { X, Copy, HelpCircle, ChevronUp, ArrowUpDown } from "lucide-react";
import type { Truck } from "../data/types";
import { formatTime } from "../lib/time";

interface Props {
  open: boolean;
  truck: Truck | null;
  dockLabel: string | null;
  startMinutes: number | null;
  onClose: () => void;
}

function statusPill(status: Truck["status"]) {
  switch (status) {
    case "in_progress":
      return { label: "In progress", bg: "#fef3c7", text: "#92400e" };
    case "loading":
      return { label: "Loading", bg: "#dbeafe", text: "#1e40af" };
    case "departed":
      return { label: "Departed", bg: "#e5e7eb", text: "#374151" };
    case "scheduled":
    default:
      return { label: "Scheduled", bg: "#e5e7eb", text: "#374151" };
  }
}

const FAKE_MERCHANTS = [
  { name: "Aritzia", expected: 1 },
  { name: "Backcountry", expected: 455 },
  { name: "ClearJet", expected: 279 },
  { name: "Huckberry", expected: 171 },
  { name: "Madewell", expected: 88 },
  { name: "Outdoor Voices", expected: 64 },
];

const FAKE_PARCEL_ROWS = [
  { customer: "MICHAEL OLSEN", barcode: "DDC91X" },
  { customer: "RACHEL TORRES", barcode: "DDC44A" },
  { customer: "DANIEL KIM", barcode: "DDC73P" },
  { customer: "BRENDA WHITNEY", barcode: "DDC18Q" },
  { customer: "ALEX MARSH", barcode: "DDC60R" },
  { customer: "LISA PERRY", barcode: "DDC22Z" },
];

export function TruckDetailSheet({ open, truck, dockLabel, startMinutes, onClose }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [merchantsOpen, setMerchantsOpen] = useState(true);
  const [parcelsOpen, setParcelsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !truck) return null;

  const pill = statusPill(truck.status);
  const arrived = truck.status === "in_progress" || truck.status === "loading" || truck.status === "departed";
  const departed = truck.status === "departed";
  const shortShipment = truck.shipmentId.slice(0, 6).toUpperCase();
  const dockNumber = dockLabel ? dockLabel.replace(/[^0-9]/g, "") || "--" : "--";

  const scheduledArrival = startMinutes != null ? `May 19, ${formatTime(startMinutes)}` : "--";
  const carrierApproached = arrived && startMinutes != null
    ? `May 19, ${formatTime(startMinutes - 8)}`
    : "--";
  const checkedIn = arrived && startMinutes != null ? `May 19, ${formatTime(startMinutes + 4)}` : "--";
  const doneUnloading = departed && startMinutes != null
    ? `May 19, ${formatTime(startMinutes + 70)}`
    : "--";
  const scheduledDeparture = startMinutes != null
    ? `May 19, ${formatTime(startMinutes + truck.durationMinutes)}`
    : "--";
  const actualDeparture = departed && startMinutes != null
    ? `May 19, ${formatTime(startMinutes + truck.durationMinutes + 6)}`
    : "--";
  const dwell = departed ? `${truck.durationMinutes + 14} min` : "--";

  // Fake actuals scaling with status
  const expectedParcels = truck.parcelCount || 0;
  const actualParcels = departed
    ? expectedParcels
    : truck.status === "loading"
      ? Math.floor(expectedParcels * 0.6)
      : truck.status === "in_progress"
        ? Math.floor(expectedParcels * 0.2)
        : 0;
  const expectedPallets = Math.max(1, Math.round(expectedParcels / 120));
  const actualPallets = departed
    ? expectedPallets
    : truck.status === "loading"
      ? Math.floor(expectedPallets * 0.6)
      : 0;

  const onCopy = () => {
    navigator.clipboard?.writeText(truck.shipmentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/20"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <aside
        role="dialog"
        aria-label="Truck details"
        className="fixed top-0 right-0 bottom-0 z-[70] bg-white shadow-2xl border-l border-[#e5e7eb] flex flex-col"
        style={{ width: 598 }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-5 border-b border-[#e5e7eb] flex items-start gap-4">
          <HeaderStat label="Truck origin" value={truck.partner.replace(/ returns$/, "")} />
          <HeaderStat label="Shipment ID" value={shortShipment} />
          <HeaderStat label="Dock door" value={dockNumber} />
          <HeaderStat label="Trailer" value={truck.trailerSize ?? "--"} />
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 -mr-1 -mt-1 size-7 grid place-items-center rounded hover:bg-black/5"
            aria-label="Close"
          >
            <X className="size-5 text-[#111111]" strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Details section */}
          <section className="px-6 py-5 border-b border-[#e5e7eb]">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center gap-3"
            >
              <h2 className="text-[22px] font-bold text-[#111111]">Details</h2>
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
                {/* Map */}
                <div className="relative w-full rounded overflow-hidden border border-[#e5e7eb]" style={{ height: 200, background: "#f3f0ea" }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
                    <rect width="400" height="200" fill="#f3f0ea" />
                    {/* fake roads */}
                    <path d="M0,140 C100,120 200,160 400,90" stroke="#ffffff" strokeWidth="10" fill="none" />
                    <path d="M40,0 C80,80 160,120 200,200" stroke="#ffffff" strokeWidth="8" fill="none" />
                    <path d="M0,40 L400,60" stroke="#f6c453" strokeWidth="6" fill="none" opacity="0.8" />
                    {/* parks */}
                    <ellipse cx="80" cy="60" rx="50" ry="30" fill="#cfe3c4" opacity="0.7" />
                    <ellipse cx="330" cy="160" rx="60" ry="28" fill="#cfe3c4" opacity="0.7" />
                    {/* dashed route */}
                    <path d="M120,40 C180,80 240,80 280,140" stroke="#111111" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                    {/* truck marker */}
                    <circle cx="120" cy="40" r="14" fill="#111111" />
                    {/* destination marker */}
                    <circle cx="280" cy="140" r="10" fill="#111111" />
                    <circle cx="280" cy="140" r="4" fill="#ffffff" />
                  </svg>
                  <div className="absolute top-3 left-3 bg-white/95 rounded px-2.5 py-1.5 text-[11px] leading-tight shadow-sm">
                    <div className="font-semibold text-[#111111]">
                      {arrived ? "Arrived" : "5 mi, 12 min away"}
                    </div>
                    <div className="text-[#6b7280]">Updated 2 hours ago</div>
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] text-[#6b7280] bg-white/80 px-1.5 py-0.5 rounded">© mapbox</div>
                </div>

                {/* Full Shipment ID */}
                <div>
                  <div className="text-[12px] text-[#6b7280]">Shipment ID</div>
                  <div className="mt-1 flex items-center gap-2 text-[14px] text-[#111111]">
                    <span className="font-medium">{truck.shipmentId}</span>
                    <button
                      type="button"
                      onClick={onCopy}
                      className="size-6 grid place-items-center rounded hover:bg-black/5"
                      aria-label="Copy shipment ID"
                    >
                      <Copy className="size-4 text-[#6b7280]" />
                    </button>
                    {copied && <span className="text-[11px] text-[#6b7280]">Copied</span>}
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <h3 className="text-[16px] font-bold text-[#111111] mb-2">Timing</h3>
                  <dl className="grid grid-cols-[40%_60%] gap-y-3 text-[14px]">
                    <TimingRow label="Scheduled arrival" value={scheduledArrival} />
                    <TimingRow label="Carrier approached" value={carrierApproached} />
                    <TimingRow label="Checked in" value={checkedIn} />
                    <TimingRow label="Done unloading" value={doneUnloading} />
                    <TimingRow label="Scheduled departure" value={scheduledDeparture} />
                    <TimingRow label="Actual departure" value={actualDeparture} />
                    <TimingRow label="Dwell time" value={dwell} />
                  </dl>
                </div>

                {/* Pallets & Return pallets */}
                <div className="grid grid-cols-2 gap-x-6">
                  <ActualExpectedBlock title="Pallets" actual={actualPallets} expected={expectedPallets} />
                  <ActualExpectedBlock title="Return pallets" actual={0} expected={0} />
                </div>

                {/* Parcels & Return parcels */}
                <div className="grid grid-cols-2 gap-x-6">
                  <ActualExpectedBlock title="Parcels" actual={actualParcels} expected={expectedParcels} />
                  <ActualExpectedBlock title="Return parcels" actual={0} expected={0} />
                </div>
              </div>
            )}
          </section>

          {/* Merchants section */}
          <section className="px-6 py-5 border-b border-[#e5e7eb]">
            <button
              type="button"
              onClick={() => setMerchantsOpen((v) => !v)}
              className="w-full flex items-center"
            >
              <h2 className="text-[22px] font-bold text-[#111111]">Merchants</h2>
              <ChevronUp
                className={`ml-auto size-5 text-[#6b7280] transition-transform ${merchantsOpen ? "" : "rotate-180"}`}
              />
            </button>
            {merchantsOpen && (
              <div className="mt-3 border border-[#e5e7eb] rounded overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr] bg-[#f9fafb] text-[12px] font-medium text-[#374151] px-4 py-2.5">
                  <HeaderCell label="Merchant" />
                  <HeaderCell label="Parcels expected" />
                  <HeaderCell label="Parcels actual" />
                </div>
                {FAKE_MERCHANTS.map((m, i) => {
                  const actual = departed
                    ? m.expected
                    : truck.status === "loading"
                      ? Math.floor(m.expected * 0.6)
                      : truck.status === "in_progress"
                        ? Math.floor(m.expected * 0.2)
                        : 0;
                  return (
                    <div
                      key={m.name}
                      className={`grid grid-cols-[1fr_1fr_1fr] px-4 py-3 text-[14px] text-[#111111] ${
                        i < FAKE_MERCHANTS.length - 1 ? "border-b border-[#e5e7eb]" : ""
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

          {/* Parcels section */}
          <section className="px-6 py-5">
            <button
              type="button"
              onClick={() => setParcelsOpen((v) => !v)}
              className="w-full flex items-center"
            >
              <h2 className="text-[22px] font-bold text-[#111111]">Parcels</h2>
              <ChevronUp
                className={`ml-auto size-5 text-[#6b7280] transition-transform ${parcelsOpen ? "" : "rotate-180"}`}
              />
            </button>
            {parcelsOpen && (
              <div className="mt-3 border border-[#e5e7eb] rounded overflow-hidden">
                <div className="grid grid-cols-[1.4fr_0.9fr_1fr] bg-[#f9fafb] text-[12px] font-medium text-[#374151] px-4 py-2.5">
                  <div>Customer name</div>
                  <div>Status</div>
                  <div>Barcode</div>
                </div>
                {FAKE_PARCEL_ROWS.map((row, i) => (
                  <div
                    key={row.customer}
                    className={`grid grid-cols-[1.4fr_0.9fr_1fr] items-center px-4 py-3 text-[14px] text-[#111111] hover:bg-[#f9fafb] ${
                      i < FAKE_PARCEL_ROWS.length - 1 ? "border-b border-[#e5e7eb]" : ""
                    }`}
                  >
                    <div className="truncate">{row.customer}</div>
                    <div>
                      <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-[#e5e7eb] text-[#374151]">
                        Created
                      </span>
                    </div>
                    <div className="text-[#6b7280] truncate">{row.barcode}…</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* spacer for help button */}
          <div className="h-16" />
        </div>

        {/* Floating help button */}
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

function TimingRow({ label, value }: { label: string; value: string }) {
  const muted = value === "--";
  return (
    <>
      <dt className="text-[#6b7280]">{label}</dt>
      <dd className={muted ? "text-[#9ca3af]" : "text-[#111111]"}>{value}</dd>
    </>
  );
}

function ActualExpectedBlock({
  title,
  actual,
  expected,
}: {
  title: string;
  actual: number;
  expected: number;
}) {
  return (
    <div>
      <div className="text-[16px] font-bold text-[#111111] mb-1.5">{title}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
        <span className="text-[#6b7280]">Actual</span>
        <span className="text-[#111111]">{actual.toLocaleString()}</span>
        <span className="text-[#6b7280]">Expected</span>
        <span className="text-[#9ca3af]">{expected.toLocaleString()}</span>
      </div>
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
