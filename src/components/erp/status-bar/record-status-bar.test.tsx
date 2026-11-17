import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { RecordStatusBar } from "./record-status-bar";

const stages = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
];

describe("RecordStatusBar", () => {
  it("marks past, current and future stages", () => {
    render(<RecordStatusBar stages={stages} current="submitted" />);
    const nav = screen.getByRole("navigation", { name: "Document status" });
    const items = within(nav).getAllByRole("listitem");
    expect(items.map((item) => item.dataset.state)).toEqual(["past", "current", "future"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).toHaveTextContent("(completed)");
    expect(within(nav).getByText(/Stage 2 of 3/)).toBeInTheDocument();
  });

  it("shows branch states as a labelled exception badge", () => {
    render(
      <RecordStatusBar
        stages={stages}
        current={null}
        exception={{ label: "Cancelled", tone: "muted" }}
      />,
    );
    expect(screen.getByText("Outside the standard flow")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("listitem", { current: "step" })).toBeNull();
  });
});

describe("StatusBadge", () => {
  it("always renders a text label, not just a color", () => {
    render(<StatusBadge label="Waiting for Stock" tone="warning" srPrefix="Status" />);
    expect(screen.getByText("Waiting for Stock")).toBeVisible();
    expect(screen.getByText("Waiting for Stock").closest("[data-tone]")).toHaveTextContent(
      "Status: Waiting for Stock",
    );
  });
});
