import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { RequestDraftForm } from "./request-draft-form";

const mocks = vi.hoisted(() => ({
  validateRequestDraft: vi.fn(),
  push: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../actions", () => ({ validateRequestDraft: mocks.validateRequestDraft }));
vi.mock("sonner", () => ({ toast: { info: mocks.toastInfo, error: mocks.toastError } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/inventory/requests/req-1",
  useSearchParams: () => new URLSearchParams(),
}));

const products = [
  {
    id: "prd-paper",
    sku: "OFC-0001",
    name: "Bond Paper A4",
    uom: "ream",
    precision: 0,
    available: "40",
  },
  {
    id: "prd-soap",
    sku: "JAN-0001",
    name: "Hand Soap Refill",
    uom: "L",
    precision: 2,
    available: "12.5",
  },
];

function renderForm() {
  return render(
    <TooltipProvider>
      <RequestDraftForm
        requestId="req-1"
        title="REQ-2026-000001"
        context="Northbridge Holdings"
        initialValues={{
          buildingId: "bld-a",
          requiredDate: "2026-12-01",
          priority: "normal",
          notes: "",
          lines: [{ productId: "prd-paper", quantity: "5" }],
        }}
        buildings={[{ id: "bld-a", name: "Head Office Tower" }]}
        products={products}
        canSeeStock
        today="2026-11-18"
        statusBar={null}
        commands={null}
        secondaryTabs={[]}
        listHref="/inventory/requests"
      />
    </TooltipProvider>,
  );
}

describe("RequestDraftForm", () => {
  beforeEach(() => {
    mocks.validateRequestDraft.mockReset();
    mocks.push.mockReset();
    mocks.toastInfo.mockReset();
  });

  it("states plainly that the demo build doesn't save", () => {
    renderForm();
    expect(screen.getByText(/nothing is stored yet/i)).toBeInTheDocument();
  });

  it("shows field-level errors from client validation without calling the server", async () => {
    renderForm();
    const quantity = screen.getByRole("textbox", { name: /Quantity for line 1/ });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("This unit only allows whole numbers.")).toBeInTheDocument();
    expect(quantity).toHaveAttribute("aria-invalid", "true");
    expect(mocks.validateRequestDraft).not.toHaveBeenCalled();
  });

  it("re-validates on the server, then reports that nothing was persisted", async () => {
    mocks.validateRequestDraft.mockResolvedValue({ ok: true, persisted: false, lineCount: 1 });
    renderForm();
    const quantity = screen.getByRole("textbox", { name: /Quantity for line 1/ });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "8");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.validateRequestDraft).toHaveBeenCalledTimes(1));
    expect(mocks.validateRequestDraft.mock.calls[0]?.[0]).toMatchObject({
      requestId: "req-1",
      draft: { lines: [{ productId: "prd-paper", quantity: "8" }] },
    });
    await waitFor(() =>
      expect(mocks.toastInfo).toHaveBeenCalledWith(
        "Draft validated by the server — not saved",
        expect.anything(),
      ),
    );
    expect(screen.queryByText("Unsaved changes")).toBeNull();
  });

  it("maps server field errors back onto the form", async () => {
    mocks.validateRequestDraft.mockResolvedValue({
      ok: false,
      fieldErrors: [
        {
          path: "lines.0.productId",
          message: "This product isn't available in this organization.",
        },
      ],
    });
    renderForm();
    await userEvent.type(screen.getByRole("textbox", { name: /Notes/ }), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("This product isn't available in this organization."),
    ).toBeInTheDocument();
  });

  it("asks before discarding changes and restores the original values", async () => {
    renderForm();
    const notes = screen.getByRole("textbox", { name: /Notes/ });
    await userEvent.type(notes, "Urgent for Monday");
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Discard changes" }));
    expect(notes).toHaveValue("");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("adds and removes lines, keeping at least one", async () => {
    renderForm();
    const remove = screen.getByRole("button", { name: "Remove line 1" });
    expect(remove).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Add a product/ }));
    expect(screen.getByRole("textbox", { name: /Quantity for line 2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
    expect(screen.queryByRole("textbox", { name: /Quantity for line 2/ })).toBeNull();
  });
});
