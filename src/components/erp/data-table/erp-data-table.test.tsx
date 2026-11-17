import { createColumnHelper } from "@tanstack/react-table";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERPDataTable } from "./erp-data-table";
import { ListStateProvider } from "./list-state";
import type { ERPColumnDef, ERPTableFeatures } from "./table-features";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push, refresh: vi.fn() }),
  usePathname: () => "/inventory/things",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

interface Thing {
  id: string;
  name: string;
  qty: string;
}

const helper = createColumnHelper<ERPTableFeatures, Thing>();
const columns: ERPColumnDef<Thing>[] = helper.columns([
  helper.accessor("name", { id: "name", header: "Name", meta: { label: "Name" } }),
  helper.accessor("qty", {
    id: "qty",
    header: "Quantity",
    meta: { label: "Quantity", align: "right" },
  }),
]);

const rows: Thing[] = [
  { id: "a", name: "Alpha", qty: "5" },
  { id: "b", name: "Bravo", qty: "12" },
];

function renderTable(overrides: Partial<Parameters<typeof ERPDataTable<Thing>>[0]> = {}) {
  return render(
    <ListStateProvider>
      <ERPDataTable<Thing>
        listKey="things-test"
        caption="Things"
        columns={columns}
        data={rows}
        total={120}
        page={2}
        size={50}
        sort={{ field: "name", direction: "asc" }}
        getRowId={(row) => row.id}
        getRowHref={(row) => `/inventory/things/${row.id}`}
        getRowLabel={(row) => row.name}
        primaryColumnId="name"
        emptyState={<p>Nothing here</p>}
        renderMobileCard={(row) => <span>{row.name}</span>}
        {...overrides}
      />
    </ListStateProvider>,
  );
}

describe("ERPDataTable", () => {
  beforeEach(() => {
    navigation.replace.mockClear();
    navigation.search = "q=al&page=2";
  });

  it("renders a server page with pagination summary and sort state", () => {
    renderTable();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(screen.getByText("51–100 of 120")).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Alpha" })).toHaveAttribute(
      "href",
      "/inventory/things/a",
    );
  });

  it("writes sorting to the URL and resets to the first page", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("button", { name: /Quantity/ }));
    expect(navigation.replace).toHaveBeenCalledWith("/inventory/things?q=al&sort=qty", {
      scroll: false,
    });
  });

  it("toggles direction when sorting the active column again", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("button", { name: /^Name/ }));
    expect(navigation.replace).toHaveBeenCalledWith("/inventory/things?q=al&sort=-name", {
      scroll: false,
    });
  });

  it("keeps the query when paging", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(navigation.replace).toHaveBeenCalledWith("/inventory/things?q=al&page=3", {
      scroll: false,
    });
  });

  it("counts selected rows and clears the selection", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Alpha" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Bravo" }));
    expect(screen.getByRole("status")).toHaveTextContent("Selected: 2");
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText(/Selected:/)).toBeNull();
  });

  it("selects every row on the page from the header checkbox", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(screen.getByRole("status")).toHaveTextContent("Selected: 2");
  });

  it("shows the empty state when there are no records", () => {
    renderTable({ data: [], total: 0 });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
