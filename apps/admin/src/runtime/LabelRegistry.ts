const LABELS: Record<string, string> = {
  "nav.activity": "Actividad",
  "nav.catalog": "Catálogo",
  "nav.wallet": "Billetera",
  "nav.chat": "Chat",
  "nav.battles": "Batallas",
  "nav.treasure": "Tesoro",
  "nav.learning": "Aprender",
  "nav.ranking": "Ranking",
  "nav.help": "Ayuda",
  "nav.developer": "Desarrollar",
  "nav.economy": "Economía",
};

export function resolveLabel(key: string): string {
  return LABELS[key] ?? key;
}
