import { describe, expect, it } from "vitest";
import { chatErrorMessage } from "./chatError";

describe("chat error presentation", () => {
  it("keeps budget failures actionable", () => expect(chatErrorMessage("API POST /api/runs -> 402 {\"error\":\"BUDGET_DENIED\"}")).toContain("presupuesto"));
  it("does not expose provider internals", () => expect(chatErrorMessage("API POST /api/runs -> 502 {\"error\":\"provider_execution_failed\"}")).toContain("proveedor de IA"));
  it("explains an expired session", () => expect(chatErrorMessage("authentication_required")).toContain("sesión expiró"));
});
