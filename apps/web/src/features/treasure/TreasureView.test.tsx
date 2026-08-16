import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TreasureView } from "./TreasureView";

const hunts = [{ id: "hunt-1", title: "Parque central", locationKind: "PARK", stepCount: 3, status: "APPROVED" } as const];

describe("TreasureView", () => {
  it("shows coarse map/list information and privacy notice without coordinates", () => {
    const html = renderToStaticMarkup(<TreasureView hunts={hunts} permission="granted" />);
    expect(html).toContain("Mapa de zonas aproximadas");
    expect(html).toContain("Parque central");
    expect(html).toContain("No guardamos tu ubicación exacta");
    expect(html).not.toContain("9q8yy");
  });

  it("offers an alternative when location permission is denied", () => {
    const html = renderToStaticMarkup(<TreasureView hunts={[]} permission="denied" alternativeAvailable onChooseAlternative={() => undefined} />);
    expect(html).toContain("Continuar sin ubicación");
    expect(html).toContain("No hay hunts disponibles");
  });
});
