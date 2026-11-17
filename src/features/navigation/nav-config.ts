import {
  hasAnyPermission,
  type Permission,
  type PermissionHolder,
} from "@/lib/authorization/permissions";

/**
 * Inventory module navigation (UI/UX spec §2.2). Items marked `planned` are
 * shown disabled with a "Planned" label so the full information architecture
 * is reviewable without dead links; their `phase` says when they arrive.
 * Items the user lacks permission for are hidden entirely.
 */

export interface NavItemConfig {
  label: string;
  href?: string;
  /** Any one of these permissions makes the item visible. */
  permissions?: readonly Permission[];
  status: "available" | "planned";
  phase?: number;
}

export interface NavModuleConfig {
  key: string;
  label: string;
  /** Path prefix used to highlight the active module. */
  match: string;
  href?: string;
  permissions?: readonly Permission[];
  items: readonly NavItemConfig[];
}

export const INVENTORY_NAV: readonly NavModuleConfig[] = [
  {
    key: "overview",
    label: "Overview",
    match: "/inventory/overview",
    href: "/inventory/overview",
    items: [],
  },
  {
    key: "operations",
    label: "Operations",
    match: "/inventory/operations",
    permissions: ["stock:read", "releases:prepare", "receipts:confirm"],
    items: [
      {
        label: "Receipts",
        status: "planned",
        phase: 4,
        permissions: ["stock:read", "receipts:confirm"],
      },
      {
        label: "Stock Releases",
        status: "planned",
        phase: 5,
        permissions: ["releases:prepare", "releases:post"],
      },
      {
        label: "Internal Transfers",
        status: "planned",
        phase: 4,
        permissions: ["releases:prepare"],
      },
      {
        label: "Returns",
        status: "planned",
        phase: 5,
        permissions: ["releases:prepare", "receipts:confirm"],
      },
      {
        label: "Physical Counts",
        status: "planned",
        phase: 4,
        permissions: ["releases:prepare", "adjustments:post"],
      },
      { label: "Adjustments", status: "planned", phase: 4, permissions: ["adjustments:post"] },
      { label: "Movement History", status: "planned", phase: 4, permissions: ["stock:read"] },
    ],
  },
  {
    key: "requests",
    label: "Requests",
    match: "/inventory/requests",
    permissions: ["requests:read"],
    items: [
      {
        label: "My Requests",
        href: "/inventory/requests?filter=mine",
        status: "available",
        permissions: ["requests:create"],
      },
      { label: "All Requests", href: "/inventory/requests", status: "available" },
      {
        label: "Pending Approval",
        href: "/inventory/requests?filter=pending_approval",
        status: "available",
      },
      {
        label: "Awaiting Reservation",
        href: "/inventory/requests?filter=awaiting_reservation",
        status: "available",
      },
      {
        label: "Ready for Release",
        href: "/inventory/requests?filter=ready_for_release",
        status: "available",
      },
      {
        label: "Awaiting Receipt",
        href: "/inventory/requests?filter=awaiting_receipt",
        status: "available",
      },
      { label: "Completed", href: "/inventory/requests?filter=completed", status: "available" },
      {
        label: "Approval Center",
        status: "planned",
        phase: 5,
        permissions: ["requests:approve"],
      },
    ],
  },
  {
    key: "products",
    label: "Products",
    match: "/inventory/products",
    permissions: ["products:read"],
    items: [
      { label: "Products", href: "/inventory/products", status: "available" },
      { label: "Categories", status: "planned", phase: 3 },
      { label: "Variants", status: "planned", phase: 3 },
      { label: "Units of Measure", status: "planned", phase: 3 },
      { label: "Reordering Rules", status: "planned", phase: 6, permissions: ["stock:read"] },
    ],
  },
  {
    key: "reporting",
    label: "Reporting",
    match: "/inventory/reports",
    permissions: ["stock:read", "audit:read"],
    items: [
      { label: "On Hand", status: "planned", phase: 6, permissions: ["stock:read"] },
      { label: "Availability", status: "planned", phase: 6, permissions: ["stock:read"] },
      { label: "Movement", status: "planned", phase: 6, permissions: ["stock:read"] },
      { label: "Consumption", status: "planned", phase: 6, permissions: ["stock:read"] },
      { label: "Low Stock", status: "planned", phase: 6, permissions: ["stock:read"] },
      { label: "Audit Trail", status: "planned", phase: 6, permissions: ["audit:read"] },
    ],
  },
  {
    key: "configuration",
    label: "Configuration",
    match: "/inventory/configuration",
    permissions: ["config:manage"],
    items: [
      { label: "Organizations", status: "planned", phase: 2 },
      { label: "Buildings", status: "planned", phase: 2 },
      { label: "Warehouses", status: "planned", phase: 3 },
      { label: "Locations", status: "planned", phase: 3 },
      { label: "Users & Roles", status: "planned", phase: 2 },
      { label: "Approval Rules", status: "planned", phase: 5 },
      { label: "Operation Types", status: "planned", phase: 4 },
      { label: "Numbering", status: "planned", phase: 4 },
      { label: "Settings", status: "planned", phase: 2 },
    ],
  },
];

/** Serializable navigation for the current user. */
export interface VisibleNavItem {
  label: string;
  href: string | null;
  status: "available" | "planned";
  phase: number | null;
}

export interface VisibleNavModule {
  key: string;
  label: string;
  match: string;
  href: string | null;
  items: VisibleNavItem[];
}

function isVisible(holder: PermissionHolder, permissions?: readonly Permission[]): boolean {
  return !permissions || permissions.length === 0 || hasAnyPermission(holder, permissions);
}

export function visibleNavigation(holder: PermissionHolder): VisibleNavModule[] {
  return INVENTORY_NAV.filter((module) => isVisible(holder, module.permissions))
    .map((module) => ({
      key: module.key,
      label: module.label,
      match: module.match,
      href: module.href ?? null,
      items: module.items
        .filter((item) => isVisible(holder, item.permissions))
        .map((item) => ({
          label: item.label,
          href: item.status === "available" ? (item.href ?? null) : null,
          status: item.status,
          phase: item.phase ?? null,
        })),
    }))
    .filter((module) => module.href !== null || module.items.length > 0);
}
