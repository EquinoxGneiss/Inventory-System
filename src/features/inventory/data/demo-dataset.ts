import { DEMO_AS_OF } from "@/lib/demo/constants";
import { createSeededRandom, hashSeed, type SeededRandom } from "@/lib/demo/seeded-random";
import { decimalFromMinorUnits } from "@/lib/validation/quantity";
import {
  BUILDINGS,
  DEMO_PEOPLE,
  ORGANIZATIONS,
  SECONDARY_APPROVERS,
  buildingReceivingLocation,
  buildingsForOrganization,
  getPersona,
  internalLocations,
  transitLocation,
} from "@/features/organizations/data/mock-organizations";
import { ORGANIZATION_CATALOGS, UNITS } from "@/features/products/data/catalog-fragments";
import type { LocationBalance, Product, ProductCategory } from "@/features/products/types";
import type { RequestPriority, RequestStatus } from "@/features/requests/domain/request-status";
import type {
  ActivityEvent,
  FulfillmentDocument,
  InventoryRequest,
  RequestDecision,
  RequestLine,
} from "@/features/requests/types";

/**
 * Deterministic demo dataset for Phase 1. Products and requests are generated
 * together so that reserved and in-transit balances agree with request lines
 * (docs/domain/inventory-invariants.md R1–R3).
 */

const AS_OF_MS = new Date(DEMO_AS_OF).getTime();
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Exact status mix per organization (sums to 150). */
const STATUS_COUNTS: ReadonlyArray<readonly [RequestStatus, number]> = [
  ["draft", 10],
  ["submitted", 10],
  ["under_review", 12],
  ["changes_requested", 4],
  ["rejected", 8],
  ["approved", 6],
  ["waiting_stock", 8],
  ["ready_for_release", 12],
  ["in_transit", 12],
  ["partially_received", 6],
  ["completed", 55],
  ["cancelled", 7],
];

const PRIORITY_WEIGHTS: ReadonlyArray<readonly [RequestPriority, number]> = [
  ["normal", 60],
  ["high", 20],
  ["low", 12],
  ["urgent", 8],
];

const REQUEST_NOTES: Record<string, string[]> = {
  "org-nbh": [
    "Monthly replenishment for the floor supply cabinet.",
    "For the quarterly deep-cleaning schedule.",
    "Needed for the new-hire onboarding batch.",
    "Replacement for items damaged during the office move.",
    "Stock for the upcoming safety drill.",
    "",
    "",
  ],
  "org-lmg": [
    "Replenishment for nurse station 3.",
    "Weekly par-level top-up for the ward.",
    "Needed for the outreach clinic schedule.",
    "Replacement after infection-control audit.",
    "",
    "",
  ],
};

const REJECTION_NOTES = [
  "Duplicate of an earlier request for the same items.",
  "Quantities exceed the monthly allocation; resubmit with justification.",
  "Item is being phased out; please request the replacement SKU.",
];

const CHANGE_NOTES = [
  "Please split urgent items into a separate request.",
  "Add the cost center or project code in the notes.",
  "Confirm quantities with the building manager before resubmitting.",
];

const CANCEL_NOTES = [
  "No longer needed; covered by another request.",
  "Requester withdrew the request.",
  "Event postponed.",
];

const DISCREPANCY_NOTES = [
  "Short by one unit on arrival; receiver noted the box was opened.",
  "One unit damaged in transit and set aside for return.",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightedPick<T>(random: SeededRandom, weights: ReadonlyArray<readonly [T, number]>): T {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random.next() * total;
  for (const [value, weight] of weights) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return weights[weights.length - 1]![0];
}

function iso(ms: number): string {
  return new Date(Math.min(ms, AS_OF_MS)).toISOString();
}

function manilaDate(ms: number): string {
  // Manila is UTC+8 with no DST.
  return new Date(ms + 8 * HOUR_MS).toISOString().slice(0, 10);
}

function ean13(random: SeededRandom): string {
  const digits = [4, 8, 0];
  while (digits.length < 12) digits.push(random.int(0, 9));
  const sum = digits.reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0);
  digits.push((10 - (sum % 10)) % 10);
  return digits.join("");
}

/** Quantities are generated in minor units: 10^-precision of the base unit. */
function stepFor(precision: number): number {
  return precision === 0 ? 1 : 10 ** precision / 2;
}

function roundDownToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function sequence(prefix: string, counter: { value: number }): string {
  counter.value += 1;
  return `${prefix}-2026-${String(counter.value).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

interface DraftProduct extends Omit<Product, "balances"> {
  primaryLocationId: string;
  secondaryLocationId: string | null;
  baseOnHandMinor: number;
}

function buildCatalog(organizationId: string): {
  categories: ProductCategory[];
  products: DraftProduct[];
} {
  const random = createSeededRandom(hashSeed(`catalog:${organizationId}`));
  const fragments = ORGANIZATION_CATALOGS[organizationId] ?? [];
  const locations = internalLocations(organizationId);
  const categories: ProductCategory[] = [];
  const products: DraftProduct[] = [];

  for (const fragment of fragments) {
    const categoryId = `cat-${organizationId}-${fragment.key}`;
    categories.push({ id: categoryId, organizationId, name: fragment.categoryName });
    let skuCounter = 0;
    for (const [base, variants, uomCode, type = "stockable"] of fragment.entries) {
      for (const variant of variants) {
        skuCounter += 1;
        const uom = UNITS[uomCode];
        if (!uom) throw new Error(`Unknown unit ${uomCode}`);
        const sku = `${fragment.skuPrefix}-${String(skuCounter).padStart(4, "0")}`;
        const step = stepFor(uom.precision);
        const minimumMinor = (uom.precision === 0 ? random.int(5, 50) : random.int(10, 60)) * step;
        const isActive = !random.chance(0.05);
        const lowStock = random.chance(0.14);
        const baseOnHandMinor = !isActive
          ? 0
          : lowStock
            ? random.int(0, Math.max(0, minimumMinor / step - 1)) * step
            : random.int(minimumMinor / step + 5, minimumMinor / step + 400) * step;
        const primary = random.pick(locations);
        const secondary = random.chance(0.3)
          ? (random.pick(locations.filter((location) => location.id !== primary.id)) ?? null)
          : null;
        products.push({
          id: `prd-${organizationId.replace("org-", "")}-${sku.toLowerCase()}`,
          organizationId,
          sku,
          barcode: ean13(random),
          name: variant ? `${base} ${variant}` : base,
          description: `${base}${variant ? ` (${variant})` : ""}. Stocked in ${uom.name.toLowerCase()} units at the central warehouse.`,
          categoryId,
          type,
          uom,
          minimum: decimalFromMinorUnits(minimumMinor, uom.precision),
          isActive,
          updatedAt: iso(AS_OF_MS - random.int(1, 120) * DAY_MS - random.int(0, 8) * HOUR_MS),
          primaryLocationId: primary.id,
          secondaryLocationId: secondary?.id ?? null,
          baseOnHandMinor,
        });
      }
    }
  }
  return { categories, products };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

interface LineMinor {
  requested: number;
  approved: number | null;
  reserved: number;
  released: number;
  received: number;
}

function buildLineQuantities(
  random: SeededRandom,
  status: RequestStatus,
  precision: number,
  lineIndex: number,
  lineCount: number,
): { minor: LineMinor; shortage: boolean } {
  const step = stepFor(precision);
  const requested = (precision === 0 ? random.int(1, 30) : random.int(2, 40)) * step;
  const minor: LineMinor = { requested, approved: null, reserved: 0, released: 0, received: 0 };
  const preApproval: RequestStatus[] = [
    "draft",
    "submitted",
    "under_review",
    "changes_requested",
    "rejected",
    "cancelled",
  ];
  if (preApproval.includes(status)) return { minor, shortage: false };

  const reduce = random.chance(0.2) && requested > step;
  const approved = reduce ? Math.max(step, roundDownToStep(requested * 0.7, step)) : requested;
  minor.approved = approved;
  let shortage = false;

  switch (status) {
    case "approved":
      break;
    case "waiting_stock":
      // The first line could only be partly reserved; the rest are covered.
      minor.reserved = lineIndex === 0 ? roundDownToStep(approved / 2, step) : approved;
      break;
    case "ready_for_release":
      minor.reserved = approved;
      break;
    case "in_transit":
      minor.released = approved;
      break;
    case "partially_received":
      minor.released = approved;
      minor.received =
        lineIndex === 0
          ? roundDownToStep(approved / 2, step)
          : lineIndex % 2 === 1 || lineCount === 1
            ? 0
            : approved;
      break;
    case "completed":
      minor.released = approved;
      shortage = lineIndex === 0 && approved > step && random.chance(0.15);
      minor.received = shortage ? approved - step : approved;
      break;
    default:
      break;
  }
  return { minor, shortage };
}

interface RequestBuildContext {
  organizationId: string;
  products: DraftProduct[];
  random: SeededRandom;
  releaseCounter: { value: number };
  receiptCounter: { value: number };
}

function pickRequester(
  random: SeededRandom,
  buildingId: string,
): { id: string | null; name: string } {
  const persona = (id: string) => {
    const found = getPersona(id);
    return found ? { id: found.id, name: found.displayName } : null;
  };
  const isPersonaBuilding = buildingId === "bld-nbh-hq" || buildingId === "bld-lmg-mhw";
  if (isPersonaBuilding) {
    const roll = random.next();
    if (roll < 0.55) return persona("persona-requester") ?? { id: null, name: "Requester" };
    if (roll < 0.75) return persona("persona-building-manager") ?? { id: null, name: "Manager" };
  }
  return { id: null, name: random.pick(DEMO_PEOPLE[buildingId] ?? ["Building Staff"]) };
}

function receiverFor(random: SeededRandom, buildingId: string): string {
  if (buildingId === "bld-nbh-hq" || buildingId === "bld-lmg-mhw") {
    return getPersona("persona-building-manager")?.displayName ?? "Building Manager";
  }
  return random.pick(DEMO_PEOPLE[buildingId] ?? ["Building Receiver"]);
}

function buildRequest(
  context: RequestBuildContext,
  status: RequestStatus,
  index: number,
): Omit<InventoryRequest, "reference"> {
  const { organizationId, random } = context;
  const buildings = buildingsForOrganization(organizationId);
  const personaBuilding = buildings[0]!;
  const building = random.chance(0.35) ? personaBuilding : random.pick(buildings);
  const requester = pickRequester(random, building.id);
  const orgAdmin = getPersona("persona-org-admin")?.displayName ?? "Organization Admin";
  const approverName = random.chance(0.7)
    ? orgAdmin
    : (SECONDARY_APPROVERS[organizationId] ?? orgAdmin);
  const warehouseName = getPersona("persona-warehouse")?.displayName ?? "Warehouse Staff";

  const ageDays =
    status === "completed"
      ? random.int(12, 120)
      : status === "draft"
        ? random.int(0, 6)
        : status === "cancelled" || status === "rejected"
          ? random.int(3, 60)
          : random.int(2, 24);
  const requestMs = AS_OF_MS - ageDays * DAY_MS - random.int(0, 9) * HOUR_MS;
  const requiredDate = manilaDate(requestMs + random.int(3, 21) * DAY_MS);
  const priority = weightedPick(random, PRIORITY_WEIGHTS);

  const activeProducts = context.products.filter((product) => product.isActive);
  const lineCount = random.int(1, 6);
  const chosen = random.sample(activeProducts, lineCount);
  let hasShortage = false;
  const lines: RequestLine[] = chosen.map((product, lineIndex) => {
    const { minor, shortage } = buildLineQuantities(
      random,
      status,
      product.uom.precision,
      lineIndex,
      chosen.length,
    );
    hasShortage ||= shortage;
    const toDecimal = (value: number) => decimalFromMinorUnits(value, product.uom.precision);
    return {
      id: `${organizationId}-req${index}-l${lineIndex + 1}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      uom: product.uom.code,
      precision: product.uom.precision,
      requested: toDecimal(minor.requested),
      approved: minor.approved === null ? null : toDecimal(minor.approved),
      reserved: toDecimal(minor.reserved),
      released: toDecimal(minor.released),
      received: toDecimal(minor.received),
    };
  });

  // Timeline -----------------------------------------------------------------
  let clock = requestMs;
  const tick = (minHours: number, maxHours: number) => {
    clock += random.int(minHours, maxHours) * HOUR_MS + random.int(0, 59) * 60_000;
    return iso(clock);
  };
  const activity: ActivityEvent[] = [];
  const decisions: RequestDecision[] = [];
  const documents: FulfillmentDocument[] = [];
  const event = (at: string, actorName: string, summary: string, note?: string) =>
    activity.push({
      id: `${organizationId}-req${index}-e${activity.length + 1}`,
      at,
      actorName,
      summary,
      note,
    });

  event(iso(requestMs), requester.name, "Created the request as a draft");
  const reached = (target: RequestStatus) =>
    STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(target);
  const isReduced = lines.some(
    (line) => line.approved !== null && line.approved !== line.requested,
  );
  const transit = transitLocation(organizationId).fullName;
  const destination = buildingReceivingLocation(building.id).fullName;
  const stockName = `${internalLocations(organizationId)[0]?.fullName.split("/")[0] ?? "WH"}/Stock`;

  if (status === "cancelled") {
    if (random.chance(0.5)) event(tick(1, 30), requester.name, "Submitted for approval");
    const at = tick(2, 48);
    const note = random.pick(CANCEL_NOTES);
    decisions.push({
      id: `${organizationId}-req${index}-d1`,
      action: "cancelled",
      actorName: requester.name,
      at,
      note,
    });
    event(at, requester.name, "Cancelled the request", note);
  } else if (status !== "draft") {
    event(tick(1, 30), requester.name, "Submitted for approval");
    if (
      status === "under_review" ||
      status === "changes_requested" ||
      status === "rejected" ||
      reached("approved")
    ) {
      event(tick(1, 20), approverName, "Started review");
    }
    if (status === "changes_requested") {
      const at = tick(1, 24);
      const note = random.pick(CHANGE_NOTES);
      decisions.push({
        id: `${organizationId}-req${index}-d1`,
        action: "changes_requested",
        actorName: approverName,
        at,
        note,
      });
      event(at, approverName, "Requested changes", note);
    } else if (status === "rejected") {
      const at = tick(1, 24);
      const note = random.pick(REJECTION_NOTES);
      decisions.push({
        id: `${organizationId}-req${index}-d1`,
        action: "rejected",
        actorName: approverName,
        at,
        note,
      });
      event(at, approverName, "Rejected the request", note);
    } else if (reached("approved")) {
      const at = tick(1, 24);
      const note = isReduced
        ? "Approved with reduced quantities based on current allocation."
        : "Approved as requested.";
      decisions.push({
        id: `${organizationId}-req${index}-d1`,
        action: "approved",
        actorName: approverName,
        at,
        note,
      });
      event(at, approverName, "Approved the request", note);
    }
    if (status === "waiting_stock") {
      event(
        tick(1, 12),
        warehouseName,
        "Reserved available stock",
        "Partial reservation; remaining quantity is waiting for stock.",
      );
    } else if (reached("ready_for_release")) {
      event(tick(1, 12), warehouseName, "Reserved stock for all lines");
    }
    if (reached("in_transit")) {
      const at = tick(4, 48);
      const reference = sequence("REL", context.releaseCounter);
      documents.push({
        id: `${organizationId}-req${index}-rel`,
        kind: "release",
        reference,
        date: at,
        actorName: approverName,
        state: "posted",
        from: stockName,
        to: transit,
        quantities: Object.fromEntries(lines.map((line) => [line.id, line.released])),
      });
      event(
        at,
        approverName,
        `Posted release ${reference}`,
        "Stock moved from the central warehouse to transit.",
      );
    }
    if (status === "partially_received" || status === "completed") {
      const at = tick(6, 72);
      const reference = sequence("RCV", context.receiptCounter);
      const receiver = receiverFor(random, building.id);
      const partial = status === "partially_received";
      const discrepancy = hasShortage ? random.pick(DISCREPANCY_NOTES) : undefined;
      documents.push({
        id: `${organizationId}-req${index}-rcv`,
        kind: "receipt",
        reference,
        date: at,
        actorName: receiver,
        state: partial ? "partial" : "done",
        from: transit,
        to: destination,
        quantities: Object.fromEntries(lines.map((line) => [line.id, line.received])),
        note: discrepancy,
      });
      event(
        at,
        receiver,
        partial ? `Confirmed partial receipt ${reference}` : `Confirmed receipt ${reference}`,
        discrepancy ?? (partial ? "Remaining quantities are still in transit." : undefined),
      );
      if (!partial) event(at, receiver, "Request completed");
    }
  }

  return {
    id: `req-${organizationId.replace("org-", "")}-${String(index + 1).padStart(4, "0")}`,
    organizationId,
    buildingId: building.id,
    requesterId: requester.id,
    requesterName: requester.name,
    approverName,
    status,
    priority,
    requestDate: iso(requestMs),
    requiredDate,
    notes: random.pick(REQUEST_NOTES[organizationId] ?? [""]),
    version: activity.length,
    lines,
    decisions,
    activity,
    documents,
    discrepancy: hasShortage
      ? (documents.find((document) => document.kind === "receipt")?.note ?? null)
      : null,
  };
}

const STATUS_ORDER: RequestStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "waiting_stock",
  "ready_for_release",
  "in_transit",
  "partially_received",
  "completed",
];

function buildRequests(organizationId: string, products: DraftProduct[]): InventoryRequest[] {
  const random = createSeededRandom(hashSeed(`requests:${organizationId}`));
  const statuses = random.shuffle(
    STATUS_COUNTS.flatMap(([status, count]) => Array.from({ length: count }, () => status)),
  );
  const context: RequestBuildContext = {
    organizationId,
    products,
    random,
    releaseCounter: { value: 0 },
    receiptCounter: { value: 0 },
  };
  const drafts = statuses.map((status, index) => buildRequest(context, status, index));
  // Document numbers follow creation order (oldest first), like a DB sequence.
  const byDate = [...drafts].sort((a, b) => a.requestDate.localeCompare(b.requestDate));
  const references = new Map(
    byDate.map((request, position) => [
      request.id,
      `REQ-2026-${String(position + 1).padStart(6, "0")}`,
    ]),
  );
  return drafts.map((request) => ({ ...request, reference: references.get(request.id)! }));
}

// ---------------------------------------------------------------------------
// Balances: derive reserved and in-transit from request lines
// ---------------------------------------------------------------------------

function finalizeProducts(
  organizationId: string,
  drafts: DraftProduct[],
  requests: InventoryRequest[],
): Product[] {
  const reservedMinor = new Map<string, number>();
  const transitMinor = new Map<string, number>();
  const exhausted = new Set<string>();
  const scale = (value: string, precision: number) => Math.round(Number(value) * 10 ** precision); // generator-only; inputs are exact steps

  for (const request of requests) {
    request.lines.forEach((line, lineIndex) => {
      if (request.status === "waiting_stock" || request.status === "ready_for_release") {
        reservedMinor.set(
          line.productId,
          (reservedMinor.get(line.productId) ?? 0) + scale(line.reserved, line.precision),
        );
        if (request.status === "waiting_stock" && lineIndex === 0) exhausted.add(line.productId);
      }
      if (request.status === "in_transit" || request.status === "partially_received") {
        const pending = scale(line.released, line.precision) - scale(line.received, line.precision);
        transitMinor.set(line.productId, (transitMinor.get(line.productId) ?? 0) + pending);
      }
    });
  }

  const transitId = transitLocation(organizationId).id;
  return drafts.map((draft) => {
    const { primaryLocationId, secondaryLocationId, baseOnHandMinor, ...product } = draft;
    const precision = product.uom.precision;
    const step = stepFor(precision);
    const reserved = reservedMinor.get(product.id) ?? 0;
    // Waiting-for-stock products have nothing left beyond their reservations.
    let onHand = exhausted.has(product.id) ? reserved : Math.max(baseOnHandMinor, reserved);
    if (!exhausted.has(product.id) && reserved > 0 && onHand - reserved < step) onHand += 10 * step;

    const balances: LocationBalance[] = [];
    if (secondaryLocationId && onHand > reserved + 4 * step) {
      const secondaryShare = roundDownToStep((onHand - reserved) * 0.3, step);
      balances.push({
        locationId: primaryLocationId,
        onHand: decimalFromMinorUnits(onHand - secondaryShare, precision),
        reserved: decimalFromMinorUnits(reserved, precision),
      });
      balances.push({
        locationId: secondaryLocationId,
        onHand: decimalFromMinorUnits(secondaryShare, precision),
        reserved: "0",
      });
    } else {
      balances.push({
        locationId: primaryLocationId,
        onHand: decimalFromMinorUnits(onHand, precision),
        reserved: decimalFromMinorUnits(reserved, precision),
      });
    }
    const inTransit = transitMinor.get(product.id) ?? 0;
    if (inTransit > 0) {
      balances.push({
        locationId: transitId,
        onHand: decimalFromMinorUnits(inTransit, precision),
        reserved: "0",
      });
    }
    return { ...product, balances };
  });
}

// ---------------------------------------------------------------------------
// Public dataset
// ---------------------------------------------------------------------------

export interface DemoDataset {
  categories: ProductCategory[];
  products: Product[];
  requests: InventoryRequest[];
}

function buildDataset(): DemoDataset {
  const dataset: DemoDataset = { categories: [], products: [], requests: [] };
  for (const organization of ORGANIZATIONS) {
    const { categories, products } = buildCatalog(organization.id);
    const requests = buildRequests(organization.id, products);
    dataset.categories.push(...categories);
    dataset.products.push(...finalizeProducts(organization.id, products, requests));
    dataset.requests.push(...requests);
  }
  return dataset;
}

export const DEMO_DATASET: DemoDataset = buildDataset();

/** Exposed for invariant tests. */
export const DEMO_BUILDING_IDS = BUILDINGS.map((building) => building.id);
