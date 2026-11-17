"use server";

import { z } from "zod";

import { getSessionContext } from "@/lib/demo/session";
import { searchProducts } from "@/features/products/data/product-repository";
import { searchRequests } from "@/features/requests/data/request-repository";
import { REQUEST_STATUS_META } from "@/features/requests/domain/request-status";

export interface SearchResults {
  products: Array<{ id: string; sku: string; name: string }>;
  requests: Array<{ id: string; reference: string; buildingName: string; statusLabel: string }>;
}

const EMPTY: SearchResults = { products: [], requests: [] };
const termSchema = z.string().trim().min(1).max(64);

/**
 * Global search (spec §2.3). Re-resolves the session on every call and searches
 * only the active organization within the caller's permissions and buildings.
 */
export async function searchRecords(term: unknown): Promise<SearchResults> {
  const parsed = termSchema.safeParse(term);
  if (!parsed.success) return EMPTY;
  const session = await getSessionContext();
  return {
    products: searchProducts(session, parsed.data),
    requests: searchRequests(session, parsed.data).map((request) => ({
      id: request.id,
      reference: request.reference,
      buildingName: request.buildingName,
      statusLabel: REQUEST_STATUS_META[request.status].label,
    })),
  };
}
