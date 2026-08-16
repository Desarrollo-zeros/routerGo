import type { ExerciseDefinition } from "./exerciseCatalog";

export type DatasetExercise = {
  id?: string; name?: string; category?: string; equipment?: string; target?: string;
  muscle_group?: string; secondary_muscles?: string[];
  instructions?: { es?: string; en?: string }; image?: string; gif_url?: string;
};

export type GymGifExercise = {
  id?: string; name?: string; bodyPart?: string; equipment?: string; category?: string;
  secondaryMuscles?: string[]; instructions?: string[]; gifUrl?: string;
};

export type FreeExercise = {
  id?: string; name?: string; equipment?: string; category?: string; level?: string;
  primaryMuscles?: string[]; secondaryMuscles?: string[]; instructions?: string[]; images?: string[];
};

export function mapDatasetExercise(item: DatasetExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "body weight") return undefined;
  return {
    id: `dataset-${item.id}`, name: label(item.name), category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal", target: label(item.target ?? "Cuerpo completo"),
    muscles: [item.muscle_group, ...(item.secondary_muscles ?? [])].filter(isText).map(label).join(" · "),
    level: "Catálogo", instruction: item.instructions?.es ?? item.instructions?.en ?? safeInstruction(),
    source: "exercises-dataset · Gym visual",
    imageUrl: mediaUrl(item.image, "images"), animationUrl: mediaUrl(item.gif_url, "videos"),
  };
}

export function mapGymGifExercise(item: GymGifExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "bodyweight") return undefined;
  return {
    id: `gym-gifs-${item.id}`, name: item.name, category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal", target: label(item.bodyPart ?? "Cuerpo completo"),
    muscles: (item.secondaryMuscles ?? []).map(label).join(" · "), level: "Catálogo",
    instruction: item.instructions?.join(" ") ?? "Realiza el movimiento de forma controlada.",
    source: "ExerciseGymGifsDB · jsDelivr", animationUrl: item.gifUrl,
  };
}

export function mapFreeExercise(item: FreeExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "body only") return undefined;
  return {
    id: `free-db-${item.id}`, name: item.name, category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal", target: label(item.primaryMuscles?.[0] ?? "Cuerpo completo"),
    muscles: (item.secondaryMuscles ?? []).map(label).join(" · "), level: label(item.level ?? "beginner"),
    instruction: item.instructions?.join(" ") ?? "Realiza el movimiento de forma controlada.",
    source: "free-exercise-db · Public Domain", imageUrl: freeDbImage(item.images?.[0]),
  };
}

export function records(payload: unknown, property?: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!property || typeof payload !== "object" || payload === null) return [];
  const value = (payload as Record<string, unknown>)[property];
  return Array.isArray(value) ? value : [];
}

function label(value: string): string { return value.replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function isText(value: string | undefined): value is string { return Boolean(value); }
function safeInstruction(): string { return "Sigue una ejecución controlada y detén la actividad si sientes molestias."; }
function mediaUrl(path: string | undefined, directory: string): string | undefined {
  return path ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${directory}/${path.split("/").pop()}` : undefined;
}
function freeDbImage(path: string | undefined): string | undefined {
  return path ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${path}` : undefined;
}
