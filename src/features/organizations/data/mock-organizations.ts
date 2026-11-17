import type { Building, DemoPersona, Organization, StockLocation, Warehouse } from "../types";

/**
 * Fictional organizations for the Phase 1 demo build. Every name here is
 * invented; replace with Supabase-backed data in Phase 2/3.
 */
export const ORGANIZATIONS: Organization[] = [
  { id: "org-nbh", code: "NBH", name: "Northbridge Holdings" },
  { id: "org-lmg", code: "LMG", name: "Lakeside Medical Group" },
];

export const BUILDINGS: Building[] = [
  { id: "bld-nbh-hq", organizationId: "org-nbh", code: "HQ", name: "Head Office Tower" },
  { id: "bld-nbh-ops", organizationId: "org-nbh", code: "OPS", name: "Operations Center" },
  { id: "bld-nbh-trn", organizationId: "org-nbh", code: "TRN", name: "Training Annex" },
  { id: "bld-nbh-fld", organizationId: "org-nbh", code: "FLD", name: "Field Services Hub" },
  { id: "bld-lmg-mhw", organizationId: "org-lmg", code: "MHW", name: "Main Hospital Wing" },
  { id: "bld-lmg-opd", organizationId: "org-lmg", code: "OPD", name: "Outpatient Clinic" },
  { id: "bld-lmg-dxc", organizationId: "org-lmg", code: "DXC", name: "Diagnostics Center" },
];

export const WAREHOUSES: Warehouse[] = [
  { id: "wh-nbh", organizationId: "org-nbh", code: "CWH", name: "Central Warehouse" },
  { id: "wh-lmg", organizationId: "org-lmg", code: "CSR", name: "Central Supply Room" },
];

function warehouseLocations(orgId: string, warehouseId: string, code: string): StockLocation[] {
  const stockId = `loc-${orgId}-stock`;
  return [
    {
      id: stockId,
      organizationId: orgId,
      warehouseId,
      buildingId: null,
      parentId: null,
      fullName: `${code}/Stock`,
      type: "internal",
    },
    {
      id: `loc-${orgId}-shelf-a`,
      organizationId: orgId,
      warehouseId,
      buildingId: null,
      parentId: stockId,
      fullName: `${code}/Stock/Shelf A`,
      type: "internal",
    },
    {
      id: `loc-${orgId}-shelf-b`,
      organizationId: orgId,
      warehouseId,
      buildingId: null,
      parentId: stockId,
      fullName: `${code}/Stock/Shelf B`,
      type: "internal",
    },
    {
      id: `loc-${orgId}-bulk`,
      organizationId: orgId,
      warehouseId,
      buildingId: null,
      parentId: stockId,
      fullName: `${code}/Stock/Bulk Storage`,
      type: "internal",
    },
    {
      id: `loc-${orgId}-transit`,
      organizationId: orgId,
      warehouseId,
      buildingId: null,
      parentId: null,
      fullName: `${code}/Transit`,
      type: "transit",
    },
  ];
}

export const STOCK_LOCATIONS: StockLocation[] = [
  ...warehouseLocations("org-nbh", "wh-nbh", "CWH"),
  ...warehouseLocations("org-lmg", "wh-lmg", "CSR"),
  ...BUILDINGS.map((building): StockLocation => ({
    id: `loc-${building.id}-receiving`,
    organizationId: building.organizationId,
    warehouseId: null,
    buildingId: building.id,
    parentId: null,
    fullName: `${building.code}/Receiving`,
    type: "building",
  })),
];

/** Internal (pickable) locations per organization, in display order. */
export function internalLocations(organizationId: string): StockLocation[] {
  return STOCK_LOCATIONS.filter(
    (location) =>
      location.organizationId === organizationId &&
      location.type === "internal" &&
      location.parentId !== null,
  );
}

export function transitLocation(organizationId: string): StockLocation {
  const location = STOCK_LOCATIONS.find(
    (item) => item.organizationId === organizationId && item.type === "transit",
  );
  if (!location) throw new Error(`No transit location for ${organizationId}`);
  return location;
}

export function buildingReceivingLocation(buildingId: string): StockLocation {
  const location = STOCK_LOCATIONS.find(
    (item) => item.buildingId === buildingId && item.type === "building",
  );
  if (!location) throw new Error(`No receiving location for ${buildingId}`);
  return location;
}

/**
 * One demo persona per role so reviewers can see role-specific navigation and
 * actions. Building-scoped personas are tied to the first building of each org.
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "persona-org-admin",
    displayName: "Maria Santos",
    initials: "MS",
    title: "Organization Admin",
    memberships: [
      { organizationId: "org-nbh", role: "org_admin", buildingId: null },
      { organizationId: "org-lmg", role: "org_admin", buildingId: null },
    ],
  },
  {
    id: "persona-warehouse",
    displayName: "Paolo Reyes",
    initials: "PR",
    title: "Warehouse Staff",
    memberships: [
      { organizationId: "org-nbh", role: "warehouse_staff", buildingId: null },
      { organizationId: "org-lmg", role: "warehouse_staff", buildingId: null },
    ],
  },
  {
    id: "persona-building-manager",
    displayName: "Andrea Lim",
    initials: "AL",
    title: "Building Manager",
    memberships: [
      { organizationId: "org-nbh", role: "building_manager", buildingId: "bld-nbh-hq" },
      { organizationId: "org-lmg", role: "building_manager", buildingId: "bld-lmg-mhw" },
    ],
  },
  {
    id: "persona-requester",
    displayName: "Miguel Tan",
    initials: "MT",
    title: "Requester",
    memberships: [
      { organizationId: "org-nbh", role: "requester", buildingId: "bld-nbh-hq" },
      { organizationId: "org-lmg", role: "requester", buildingId: "bld-lmg-mhw" },
    ],
  },
  {
    id: "persona-viewer",
    displayName: "Lea Garcia",
    initials: "LG",
    title: "Viewer",
    memberships: [{ organizationId: "org-nbh", role: "viewer", buildingId: null }],
  },
  {
    id: "persona-auditor",
    displayName: "Ramon Bautista",
    initials: "RB",
    title: "Auditor",
    memberships: [
      { organizationId: "org-nbh", role: "auditor", buildingId: null },
      { organizationId: "org-lmg", role: "auditor", buildingId: null },
    ],
  },
  {
    id: "persona-platform-admin",
    displayName: "Sam Villanueva",
    initials: "SV",
    title: "Platform Administrator",
    memberships: [{ organizationId: "org-nbh", role: "platform_admin", buildingId: null }],
  },
];

export const DEFAULT_PERSONA_ID = "persona-org-admin";

/** Additional (non-persona) people who appear on demo documents. */
export const DEMO_PEOPLE: Record<string, string[]> = {
  "bld-nbh-hq": ["Grace Navarro", "Jerome Aquino"],
  "bld-nbh-ops": ["Kevin Ramos", "Patricia Uy", "Noel Villareal"],
  "bld-nbh-trn": ["Iris Mercado", "Dennis Co"],
  "bld-nbh-fld": ["Arnel Pascual", "Bea Soriano"],
  "bld-lmg-mhw": ["Joy Ferrer", "Carla Javier"],
  "bld-lmg-opd": ["Liza Robles", "Marco Salazar", "Tess Domingo"],
  "bld-lmg-dxc": ["Victor Ong", "Rhea Castillo"],
};

export const SECONDARY_APPROVERS: Record<string, string> = {
  "org-nbh": "Carlos Mendoza",
  "org-lmg": "Dr. Elena Valdez",
};

export function getOrganization(id: string): Organization | undefined {
  return ORGANIZATIONS.find((org) => org.id === id);
}

export function getBuilding(id: string): Building | undefined {
  return BUILDINGS.find((building) => building.id === id);
}

export function buildingsForOrganization(organizationId: string): Building[] {
  return BUILDINGS.filter((building) => building.organizationId === organizationId);
}

export function getPersona(id: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((persona) => persona.id === id);
}
