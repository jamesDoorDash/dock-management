import {
  LayoutDashboard,
  BarChart3,
  Truck,
  CalendarClock,
  Package,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronsLeft,
} from "lucide-react";
import { cn } from "../lib/cn";

export type PrototypeVersion = "v1" | "v2";

interface SidebarProps {
  version: PrototypeVersion;
  onVersionChange: (v: PrototypeVersion) => void;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: BarChart3, label: "Performance" },
  { icon: Truck, label: "Trucks", expandable: true },
  { icon: CalendarClock, label: "Dock management", active: true },
  { icon: Package, label: "All parcels" },
  { icon: RotateCcw, label: "Returns" },
  { icon: Settings, label: "Admin" },
];

export function Sidebar({ version, onVersionChange }: SidebarProps) {
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
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "w-full h-12 flex items-center gap-3 px-3 rounded-button text-left",
                item.active
                  ? "bg-surface-hovered text-ink"
                  : "text-ink-subdued hover:bg-surface-hovered hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", item.active ? "text-ink" : "text-icon-subdued")} />
              <span
                className={cn(
                  "flex-1 text-body-md",
                  item.active && "font-bold text-ink",
                )}
              >
                {item.label}
              </span>
              {item.expandable && <ChevronDown className="size-4 text-icon-subdued" />}
            </button>
          );
        })}
      </nav>

      {/* Prototype version selector */}
      <div className="mx-4 mb-2 rounded-card bg-ink text-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-body-sm-strong text-white">Prototype version</p>
            <p className="text-body-sm text-white/50">Top contenders</p>
          </div>
          <button type="button" className="text-body-sm underline text-white/90">
            Show all
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <VersionOption
            checked={version === "v1"}
            label="V1: First draft"
            onClick={() => onVersionChange("v1")}
          />
          <VersionOption
            checked={version === "v2"}
            label="V2: Auto assign"
            onClick={() => onVersionChange("v2")}
          />
        </div>
      </div>

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
