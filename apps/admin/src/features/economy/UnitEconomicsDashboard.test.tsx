import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnitEconomicsDashboard } from "./UnitEconomicsDashboard";

const summary = { revenueMicro: 100, providerCostMicro: 30, infraCostMicro: 10, contributionMicro: 60, rewardLiabilityCredits: 75 };

describe("UnitEconomicsDashboard", () => {
  it("fails closed without economy authorization", () => {
    expect(renderToStaticMarkup(<UnitEconomicsDashboard authorized={false} />)).toContain("Insufficient privilege");
  });

  it("renders fixed-precision costs separately from GoCredits liability", () => {
    const html = renderToStaticMarkup(<UnitEconomicsDashboard authorized summary={summary} />);
    expect(html).toContain("USD micro-units");
    expect(html).toContain("GoCredits");
    expect(html).toContain("Contribution");
  });
});
