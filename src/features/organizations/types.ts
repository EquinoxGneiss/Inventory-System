import type { Role } from "@/lib/authorization/roles";

export interface Organization {
  id: string;
  code: string;
  name: string;
}

export interface Building {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}

export interface Warehouse {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}

export const LOCATION_TYPES = [
  "internal",
  "transit",
  "building",
  "supplier",
  "adjustment",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export interface StockLocation {
  id: string;
  organizationId: string;
  warehouseId: string | null;
  buildingId: string | null;
  parentId: string | null;
  /** Full hierarchical name, e.g. "CWH/Stock/Shelf A". */
  fullName: string;
  type: LocationType;
}

export interface MembershipGrant {
  organizationId: string;
  role: Role;
  buildingId: string | null;
}

export interface DemoPersona {
  id: string;
  displayName: string;
  initials: string;
  title: string;
  memberships: MembershipGrant[];
}
