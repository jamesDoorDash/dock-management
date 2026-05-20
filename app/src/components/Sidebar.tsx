import { useState } from "react";
import { Truck, CalendarClock, Undo2, Container, Settings, ChevronDown, ChevronsLeft } from "lucide-react";
import { cn } from "../lib/cn";

export type PrototypeVersion =
  | "v1"
  | "v2"
  | "v3"
  | "v4"
  | "v5"
  | "v6"
  | "v7"
  | "v8"
  | "v9"
  | "v10"
  | "v11"
  | "v12"
  | "v13"
  | "v14"
  | "v15"
  | "v16"
  | "v17"
  | "v18"
  | "v19"
  | "v20"
  | "v21"
  | "v22"
  | "v23"
  | "v24"
  | "v25"
  | "v26"
  | "v27"
  | "v28"
  | "v29"
  | "v30"
  | "v31"
  | "v32"
  | "v33"
  | "v34"
  | "v35"
  | "v36";

/** Versions promoted to the "Top contenders" shortlist. */
export const TOP_CONTENDERS: PrototypeVersion[] = [
  "v3",
  "v6",
  "v20",
  "v34",
  "v35",
  "v36",
];

export const VERSION_OPTIONS: { id: PrototypeVersion; label: string }[] = [
  { id: "v1", label: "V1: First draft" },
  { id: "v2", label: "V2: Auto assign" },
  { id: "v3", label: "V3: Iteration" },
  { id: "v4", label: "V4: 2px bar (thin)" },
  { id: "v5", label: "V5: 4px bar (baseline)" },
  { id: "v6", label: "V6: 6px bar (thick)" },
  { id: "v7", label: "V7: No bg fill" },
  { id: "v8", label: "V8: White bg + neutral border" },
  { id: "v9", label: "V9: Soft bg + colored border" },
  { id: "v10", label: "V10: Sharp corners" },
  { id: "v11", label: "V11: V10 + small border" },
  { id: "v12", label: "V12: Large radius (12px)" },
  { id: "v13", label: "V13: Pill radius" },
  { id: "v14", label: "V14: Outline only, no fill" },
  { id: "v15", label: "V15: Inset bar, sharp corners" },
  { id: "v16", label: "V16: Inset bar, 8px corners" },
  { id: "v17", label: "V17: Inset bar + small border" },
  { id: "v18", label: "V18: Inset bar, thicker" },
  { id: "v19", label: "V19: Solid pastel fill, no bar" },
  { id: "v20", label: "V20: Viz Refresh" },
  { id: "v21", label: "V21: V18 + white bg + thin colored border" },
  { id: "v22", label: "V22: V21 + minimal grey border" },
  { id: "v23", label: "V23: V14 + white fill" },
  { id: "v24", label: "V24: Saturated fill + white text" },
  { id: "v25", label: "V25: Medium pastel + colored bold text" },
  { id: "v26", label: "V26: White + dot + colored text" },
  { id: "v27", label: "V27: White + 8px thick left bar" },
  { id: "v28", label: "V28: Soft bg + colored halo shadow" },
  { id: "v29", label: "V29: Diagonal gradient" },
  { id: "v30", label: "V30: White + colored top bar" },
  { id: "v31", label: "V31: Dark bg + inset bar + white text" },
  { id: "v32", label: "V32: Sticker (offset colored shadow)" },
  { id: "v33", label: "V33: Pill fill + white text" },
  { id: "v34", label: "V34: Typefix" },
  { id: "v35", label: "V35: Declutter" },
  { id: "v36", label: "V36: Name rearrange" },
];

interface SidebarProps {
  version: PrototypeVersion;
  onVersionChange: (v: PrototypeVersion) => void;
  adminOpen: boolean;
  onToggleAdmin: () => void;
}

const NAV_ITEMS = [
  { icon: Truck, label: "Inbound", key: "inbound" as const },
  { icon: CalendarClock, label: "Dock management", key: "dock" as const },
  { icon: Undo2, label: "Returns", key: "returns" as const },
  { icon: Container, label: "Outbound", key: "outbound" as const },
  { icon: Settings, label: "Admin", key: "admin" as const },
];

export function Sidebar({ version, onVersionChange, adminOpen, onToggleAdmin }: SidebarProps) {
  return (
    <aside className="w-[256px] shrink-0 border-r border-line bg-surface flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-[10px] px-6 pt-5 pb-7 h-[68px]">
        <svg width="29" height="16" viewBox="0 0 29 16" fill="none" aria-hidden>
          <path
            d="M27.3457 3.79469C26.0871 1.44425 23.6271 0 20.9669 0H0.686503C0.314647 0 0 0.311504 0 0.707965C0 0.877876 0.0858129 1.04779 0.20023 1.18938L4.60529 5.57876C5.00575 5.97522 5.52063 6.20177 6.06411 6.17345H20.3377C21.3674 6.17345 22.1969 6.96637 22.1969 7.98584C22.1969 9.00531 21.396 9.82655 20.3663 9.82655H10.555C10.1831 9.82655 9.86848 10.1381 9.86848 10.5345C9.86848 10.7044 9.9543 10.8743 10.0687 11.0159L14.4738 15.4053C14.8742 15.8018 15.3891 16 15.9612 16H20.4235C26.2015 16 30.578 9.88319 27.3457 3.79469Z"
            fill="#EB1700"
          />
        </svg>
        <p className="text-[14px] font-bold tracking-tight text-ink">DashLink Parcels</p>
      </div>

      {/* Facility selector */}
      <button
        type="button"
        className="flex items-center gap-3 h-[86px] px-6 border-y border-line text-left hover:bg-surface-hovered"
      >
        <span className="size-[10px] rounded-full bg-positive" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-bold text-ink tracking-tight">ATL-13</span>
          <span className="block text-body-sm text-ink-subdued">4:47 PM EDT</span>
        </span>
        <ChevronDown className="size-4 text-icon-subdued" />
      </button>

      {/* Nav */}
      <nav className="flex-1 px-4 pt-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.key === "admin" ? adminOpen : item.key === "dock" && !adminOpen;
          const onClick =
            item.key === "admin"
              ? onToggleAdmin
              : item.key === "dock" && adminOpen
              ? onToggleAdmin
              : undefined;
          return (
            <button
              key={item.label}
              type="button"
              onClick={onClick}
              className={cn(
                "w-full h-12 flex items-center gap-3 px-3 rounded-button text-left",
                isActive
                  ? "bg-surface-hovered text-ink"
                  : "text-ink-subdued hover:bg-surface-hovered hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", isActive ? "text-ink" : "text-icon-subdued")} />
              <span className={cn("flex-1 text-body-md", isActive && "font-bold text-ink")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <PrototypeVersionPicker version={version} onVersionChange={onVersionChange} />

      {/* Collapse */}
      <button
        type="button"
        className="flex items-center gap-3 h-12 mx-4 mb-3 px-3 rounded-button text-body-md text-ink-subdued hover:bg-surface-hovered"
      >
        <ChevronsLeft className="size-[18px]" />
        <span>Collapse menu</span>
      </button>
    </aside>
  );
}

function PrototypeVersionPicker({
  version,
  onVersionChange,
}: {
  version: PrototypeVersion;
  onVersionChange: (v: PrototypeVersion) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  // Always show top contenders. If the currently-selected version isn't on the
  // shortlist, surface it too so the selection stays visible.
  const topIds = new Set<PrototypeVersion>(TOP_CONTENDERS);
  if (!topIds.has(version)) topIds.add(version);
  const visible = showAll
    ? VERSION_OPTIONS
    : VERSION_OPTIONS.filter((o) => topIds.has(o.id));

  return (
    <div className="mx-4 mb-2 rounded-card bg-ink text-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body-sm-strong text-white">Prototype version</p>
          <p className="text-body-sm text-white/50">
            {showAll ? "← / → to cycle" : "Top contenders"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-body-sm underline text-white/90 hover:text-white"
        >
          {showAll ? "Show less" : "Show all"}
        </button>
      </div>
      <div
        className={cn(
          "mt-2 flex flex-col gap-1 pr-1",
          showAll && "max-h-[260px] overflow-y-auto",
        )}
      >
        {visible.map((opt) => (
          <VersionOption
            key={opt.id}
            checked={version === opt.id}
            label={opt.label}
            onClick={() => onVersionChange(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VersionOption({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <label
      className={cn(
        "flex h-9 w-full cursor-pointer items-center gap-2 rounded-button px-3 transition-colors",
        checked ? "bg-white text-ink" : "text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      <input
        type="radio"
        name="prototype-version"
        checked={checked}
        onChange={onClick}
        className="h-4 w-4 accent-ink"
      />
      <span className={checked ? "text-body-sm-strong" : "text-body-sm"}>{label}</span>
    </label>
  );
}
