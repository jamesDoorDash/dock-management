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

export interface Dock {
  id: string;
  /** e.g. "Door 1" */
  label: string;
  /** Long uuid shown in the dock-settings tooltip; the first 4 chars are the short code. */
  uuid: string;
  /** Whether the dock is active and shown on the schedule. */
  active: boolean;
}
