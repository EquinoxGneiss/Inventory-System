import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ColumnChart } from "./column-chart";
import { formatTick, niceScale } from "./scale";

const SERIES = [
  { key: "actual", label: "Actual use", markClass: "bg-erp-chart-context" },
  { key: "expected", label: "Expected use", markClass: "bg-erp-chart-focus" },
  { key: "safety", label: "Safety stock", markClass: "bg-erp-chart-focus-light" },
];

function renderChart() {
  return render(
    <ColumnChart
      title="Monthly use"
      valueHeader="Quantities in ream"
      series={SERIES}
      data={[
        {
          key: "2026-10",
          label: "Oct",
          longLabel: "October 2026",
          segments: [{ series: "actual", value: 64, display: "64 ream" }],
        },
        {
          key: "forecast",
          label: "Dec",
          sublabel: "forecast",
          longLabel: "December 2026 (forecast)",
          segments: [
            { series: "expected", value: 70, display: "70 ream" },
            { series: "safety", value: 20, display: "20 ream" },
          ],
          totalDisplay: "90 ream",
          directLabel: "Need 90 ream",
        },
      ]}
      referenceLines={[
        {
          key: "available",
          label: "Available now",
          value: 50,
          display: "50 ream",
          lineClass: "bg-erp-chart-reference",
        },
      ]}
    />,
  );
}

describe("ColumnChart", () => {
  it("exposes one focusable, labelled mark per column", () => {
    renderChart();
    const marks = screen.getAllByRole("img");
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveAttribute("tabindex", "0");
    expect(marks[0]).toHaveAccessibleName("October 2026, Actual use: 64 ream");
    expect(marks[1]).toHaveAccessibleName(
      "December 2026 (forecast), Expected use: 70 ream, Safety stock: 20 ream, Total: 90 ream",
    );
  });

  it("shows a tooltip with every segment on keyboard focus", () => {
    renderChart();
    fireEvent.focus(screen.getAllByRole("img")[1]!);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("December 2026 (forecast)");
    expect(tooltip).toHaveTextContent("70 ream");
    expect(tooltip).toHaveTextContent("90 ream total");
  });

  it("labels the forecast column directly and puts the reference value in the legend", () => {
    renderChart();
    expect(screen.getByText("Need 90 ream")).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(legend).toHaveTextContent("Available now · 50 ream");
    expect(legend).not.toHaveTextContent("above chart range");
  });

  it("keeps a reference far above the columns off the plot so bars stay readable", () => {
    render(
      <ColumnChart
        title="Monthly use"
        valueHeader="Quantities in ream"
        series={SERIES}
        data={[
          {
            key: "2026-10",
            label: "Oct",
            longLabel: "October 2026",
            segments: [{ series: "actual", value: 10, display: "10 ream" }],
          },
        ]}
        referenceLines={[
          {
            key: "available",
            label: "Available now",
            value: 329,
            display: "329 ream",
            lineClass: "bg-erp-chart-reference",
          },
        ]}
      />,
    );
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent(
      "329 ream(above chart range)",
    );
  });

  it("includes a legend and a table-view twin", () => {
    renderChart();
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(4);
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("row", { hidden: true })).toHaveLength(3);
  });
});

describe("nice axis scale", () => {
  it("uses 1/2/5 steps from zero", () => {
    expect(niceScale(87)).toEqual({ top: 100, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceScale(9)).toEqual({ top: 10, ticks: [0, 2, 4, 6, 8, 10] });
    expect(niceScale(1234)).toEqual({ top: 1500, ticks: [0, 500, 1000, 1500] });
    expect(niceScale(0)).toEqual({ top: 1, ticks: [0, 1] });
  });

  it("formats ticks in full under 10,000 and compact above", () => {
    expect(formatTick(2500, 5000)).toBe("2,500");
    expect(formatTick(20000, 40000)).toMatch(/^20K$/i);
  });
});
