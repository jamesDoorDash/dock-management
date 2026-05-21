export type Direction = "inbound" | "outbound";

export type TruckStatus = "scheduled" | "in_progress" | "departed" | "loading";

export type LoadType = "floor" | "pallet";

export type AssignmentSource = "auto" | "manual" | "blocked";

export interface Truck {
  id: string;
  direction: Direction;
  /** Origin (for inbound) or destination (for outbound) label */
  partner: string;
  shipmentId: string;
  /** Scheduled date in ISO yyyy-mm-dd */
  dateIso: string;
  /** Appointment time in minutes since midnight */
  apptMinutes: number;
  /** Duration in minutes (how long it occupies the dock) */
  durationMinutes: number;
  trailerSize?: "26 ft" | "53 ft";
  parcelCount: number;
  loadType: LoadType;
  status: TruckStatus;
}

export interface Assignment {
  truckId: string;
  dockId: string;
  /** Minutes since midnight where the block starts on the schedule */
  startMinutes: number;
  source: AssignmentSource;
}

export interface BlockedSlot {
  id: string;
  dockId: string;
  dateIso: string;
  startMinutes: number;
  durationMinutes: number;
  reason?: string;
}

export type EquipmentType =
  | "truck_26"
  | "truck_26_lift"
  | "truck_53"
  | "truck_53_drop"
  | "sprinter";

export const EQUIPMENT_TYPES: { id: EquipmentType; label: string }[] = [
  { id: "truck_26", label: "26' truck" },
  { id: "truck_26_lift", label: "26' truck with liftgate" },
  { id: "truck_53", label: "53' truck" },
  { id: "truck_53_drop", label: "53' truck with drop trailer" },
  { id: "sprinter", label: "Sprinter van" },
];

export type DockEquipment = Record<EquipmentType, boolean>;

export const DEFAULT_DOCK_EQUIPMENT: DockEquipment = {
  truck_26: true,
  truck_26_lift: true,
  truck_53: true,
  truck_53_drop: true,
  sprinter: true,
};

export interface Dock {
  id: string;
  /** e.g. "Door 1" */
  label: string;
  /** Long uuid shown in the dock-settings tooltip; the first 4 chars are the short code. */
  uuid: string;
  /** Whether the dock is active and shown on the schedule. */
  active: boolean;
  /** Per-equipment-type eligibility. Defaults to all enabled when omitted. */
  equipment?: DockEquipment;
}
