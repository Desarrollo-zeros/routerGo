import React from "react";

const paths: Record<string, string> = {
  activity: "M4 12h3l2-7 4 14 2-7h5",
  wallet: "M4 7h16v11H4z M16 12h4 M16 12a2 2 0 1 0 0 4h4",
  grid: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  message: "M5 6h14v10H9l-4 4z M8 10h8 M8 13h5",
  chart: "M5 19V9 M12 19V5 M19 19v-7",
  bolt: "M13 2 5 13h6l-1 9 8-11h-6z",
  map: "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z M9 4v14 M15 6v14",
  book: "M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4 0z M9 4v16",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0z M12 13v5 M8 20h8 M5 6H3v2a4 4 0 0 0 4 4 M19 6h2v2a4 4 0 0 1-4 4",
  help: "M12 18h.01 M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.2-1.5 2",
  code: "m8 9-4 3 4 3 M16 9l4 3-4 3 M14 5l-4 14",
};

export function NavIcon({ iconKey }: { iconKey: string | null }): React.ReactElement {
  return <svg className="rg-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[iconKey ?? ""] ?? paths.grid} /></svg>;
}
