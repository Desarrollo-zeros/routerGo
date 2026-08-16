const LABELS: Record<string, string> = {
  "nav.activity": "Actividad",
  "nav.chat": "Chat",
  "nav.wallet": "Billetera",
  "nav.economy": "Economía",
  "nav.catalog": "Catálogo",
  "nav.battles": "Batallas",
};

export class LabelRegistry {
  resolve(key: string): string | undefined {
    return LABELS[key];
  }
}
