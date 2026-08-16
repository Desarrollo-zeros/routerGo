import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BattleView } from "./BattleView";

describe("BattleView", () => {
  it("explains server-authoritative rules and fails closed without auth", () => {
    const html = renderToStaticMarkup(<BattleView />);
    expect(html).toContain("Sin apuestas");
    expect(html).toContain("puntuación validada por el servidor");
    expect(html).toContain("Inicia sesión para jugar");
    expect(html).toContain("disabled");
  });
});
