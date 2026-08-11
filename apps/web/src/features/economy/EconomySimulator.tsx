import React, { useMemo, useState } from "react";

type Scenario = { dau: number; reqPerDau: number; ecpm: number; fill: number; infra: number };

function contrib(s: Scenario, m: number, zenPerReq: number): number {
  const impressions = s.dau * 1.2;
  const adRev = (impressions / 1000) * s.ecpm * s.fill;
  const provider = m * 10 + s.dau * s.reqPerDau * zenPerReq;
  return adRev - provider - s.infra;
}

export function EconomySimulator(): React.ReactElement {
  const [m, setM] = useState(3);
  const [zenPerReq] = useState(0.002);
  const [scenarios, setScenarios] = useState<Record<string, Scenario>>({
    bajo: { dau: 200, reqPerDau: 1.5, ecpm: 0.8, fill: 0.35, infra: 12 },
    base: { dau: 800, reqPerDau: 2.2, ecpm: 1.4, fill: 0.55, infra: 28 },
    alto: { dau: 2500, reqPerDau: 3, ecpm: 2.1, fill: 0.7, infra: 65 },
  });

  const rows = useMemo(() => {
    return (Object.entries(scenarios) as [string, Scenario][]).map(([k, v]) => ({
      k, v,
      promo: m * 5 + v.dau * v.reqPerDau * zenPerReq,
      renew: m * 10 + v.dau * v.reqPerDau * zenPerReq,
      contrib: contrib(v, m, zenPerReq),
    }));
  }, [scenarios, m, zenPerReq]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0 }}>Simulador economía · Admin</h2>
      <p style={{ color: "#a1a1b5", fontSize: 13, margin: 0 }}>Go: promo M×5 vs renovación M×10. Ventanas 12/5h, 30/sem, 60/mes por scope. Revenue estimado≠finalizado.</p>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>M Go subscriptions <input type="number" value={m} min={0} max={20} onChange={(e) => setM(Number(e.target.value))} style={{ width: 80, minHeight: 44, borderRadius: 8, padding: 8 }} /></label>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ color: "#a1a1b5" }}><th>Escenario</th><th>DAU</th><th>Req/DAU</th><th>Promo</th><th>Renov.</th><th>Contribución/día</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} style={{ borderTop: "1px solid #232336" }}>
                <td style={{ padding: 8 }}>{r.k}</td><td style={{ padding: 8 }}>{r.v.dau}</td><td style={{ padding: 8 }}>{r.v.reqPerDau}</td>
                <td style={{ padding: 8 }}>${r.promo.toFixed(2)}</td><td style={{ padding: 8 }}>${r.renew.toFixed(2)}</td>
                <td style={{ padding: 8, color: r.contrib >= 0 ? "#2ecc71" : "#ff4d6a", fontWeight: 700 }}>${r.contrib.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {(Object.entries(scenarios) as [string, Scenario][]).map(([k, v]) => (
          <fieldset key={k} style={{ border: "1px solid #232336", borderRadius: 12, padding: 12 }}>
            <legend style={{ fontSize: 13, fontWeight: 700 }}>{k}</legend>
            {Object.entries(v).map(([fk, fv]) => (
              <label key={fk} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, fontSize: 13 }}>
                {fk}
                <input type="number" step="0.1" value={fv} onChange={(e) => setScenarios((s) => ({ ...s, [k]: { ...s[k as keyof typeof s], [fk]: Number(e.target.value) } }))} style={{ width: 90, minHeight: 32, borderRadius: 8, padding: 4 }} />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
