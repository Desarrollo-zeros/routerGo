export type ExerciseDefinition = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  target: string;
  muscles: string;
  level: string;
  instruction: string;
  source: string;
  imageUrl?: string;
  animationUrl?: string;
};

import { mapExerciseDbExercise, type ExerciseDbExercise } from "./exerciseDbCatalog";

type DatasetExercise = {
  id?: string;
  name?: string;
  category?: string;
  equipment?: string;
  target?: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  instructions?: { es?: string; en?: string };
  image?: string;
  gif_url?: string;
};

type GymGifExercise = {
  id?: string;
  name?: string;
  bodyPart?: string;
  equipment?: string;
  category?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  gifUrl?: string;
};

type FreeExercise = {
  id?: string;
  name?: string;
  equipment?: string;
  category?: string;
  level?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};


export const EXERCISE_DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
export const GYM_GIFS_URL = "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/es/equipment/bodyweight.json";
export const FREE_EXERCISE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const EXERCISEDB_API_URL = "https://oss.exercisedb.dev/api/v1/exercises";

export const EXERCISES: ExerciseDefinition[] = [
  {
    id: "Pushups",
    name: "Flexiones",
    category: "Fuerza",
    equipment: "Peso corporal",
    target: "Pecho",
    muscles: "Hombros · Tríceps",
    level: "Inicial",
    instruction: "Mantén el torso firme, baja con control y vuelve a empujar desde el suelo.",
    source: "free-exercise-db · Unlicense",
    imageUrl: "/exercise-pushup.png",
  },
  {
    id: "Bodyweight_Squat",
    name: "Sentadilla",
    category: "Fuerza",
    equipment: "Peso corporal",
    target: "Cuádriceps",
    muscles: "Glúteos · Isquiotibiales",
    level: "Inicial",
    instruction: "Separa los pies al ancho de hombros y baja manteniendo las rodillas alineadas.",
    source: "free-exercise-db · Unlicense",
    imageUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
  },
  {
    id: "Bodyweight_Walking_Lunge",
    name: "Zancada caminando",
    category: "Fuerza",
    equipment: "Peso corporal",
    target: "Cuádriceps",
    muscles: "Glúteos · Pantorrillas",
    level: "Inicial",
    instruction: "Da un paso largo, baja con el pecho abierto y alterna las piernas.",
    source: "free-exercise-db · Unlicense",
    imageUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Walking_Lunge/0.jpg",
  },
  {
    id: "Plank",
    name: "Plancha",
    category: "Core",
    equipment: "Peso corporal",
    target: "Abdominales",
    muscles: "Hombros · Core",
    level: "Inicial",
    instruction: "Apoya antebrazos y puntas de los pies; conserva una línea estable de cabeza a talones.",
    source: "free-exercise-db · Unlicense",
    imageUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
  },
];

export const DEFAULT_EXERCISE = EXERCISES[0];

function label(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapDatasetExercise(item: DatasetExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "body weight") return undefined;
  return {
    id: `dataset-${item.id}`,
    name: label(item.name),
    category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal",
    target: label(item.target ?? "Cuerpo completo"),
    muscles: [item.muscle_group, ...(item.secondary_muscles ?? [])].filter((value): value is string => Boolean(value)).map(label).join(" · "),
    level: "Catálogo",
    instruction: item.instructions?.es ?? item.instructions?.en ?? "Sigue una ejecución controlada y detén la actividad si sientes molestias.",
    source: "exercises-dataset · Gym visual",
    imageUrl: item.image ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${item.image}` : undefined,
    animationUrl: item.gif_url ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${item.gif_url}` : undefined,
  };
}

function mapGymGifExercise(item: GymGifExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "bodyweight") return undefined;
  return {
    id: `gym-gifs-${item.id}`,
    name: item.name,
    category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal",
    target: label(item.bodyPart ?? "Cuerpo completo"),
    muscles: (item.secondaryMuscles ?? []).map(label).join(" · "),
    level: "Catálogo",
    instruction: item.instructions?.join(" ") ?? "Realiza el movimiento de forma controlada.",
    source: "ExerciseGymGifsDB · jsDelivr",
    animationUrl: item.gifUrl,
  };
}

function mapFreeExercise(item: FreeExercise): ExerciseDefinition | undefined {
  if (!item.id || !item.name || item.equipment !== "body only") return undefined;
  const image = item.images?.[0];
  return {
    id: `free-db-${item.id}`,
    name: item.name,
    category: label(item.category ?? "Movimiento"),
    equipment: "Peso corporal",
    target: label(item.primaryMuscles?.[0] ?? "Cuerpo completo"),
    muscles: (item.secondaryMuscles ?? []).map(label).join(" · "),
    level: label(item.level ?? "beginner"),
    instruction: item.instructions?.join(" ") ?? "Realiza el movimiento de forma controlada.",
    source: "free-exercise-db · Public Domain",
    imageUrl: image ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${image}` : undefined,
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Catálogo no disponible (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function uniqueExercises(items: ExerciseDefinition[]): ExerciseDefinition[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function records(payload: unknown, property?: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (property && typeof payload === "object" && payload !== null) {
    const value = (payload as Record<string, unknown>)[property];
    return Array.isArray(value) ? value : [];
  }
  return [];
}

export async function loadExerciseDataset(signal?: AbortSignal): Promise<ExerciseDefinition[]> {
  const payloads = await Promise.allSettled([
    fetchJson(EXERCISE_DATASET_URL, signal),
    fetchJson(GYM_GIFS_URL, signal),
    fetchJson(FREE_EXERCISE_DB_URL, signal),
    fetchJson(EXERCISEDB_API_URL, signal),
  ]);
  const first = payloads[0].status === "fulfilled" ? records(payloads[0].value) : [];
  const second = payloads[1].status === "fulfilled" ? records(payloads[1].value, "exercises") : [];
  const third = payloads[2].status === "fulfilled" ? records(payloads[2].value) : [];
  const fourth = payloads[3].status === "fulfilled" ? records(payloads[3].value, "data") : [];
  const mapped = uniqueExercises([
    ...first.map((item) => mapDatasetExercise(item as DatasetExercise)).filter((item): item is ExerciseDefinition => Boolean(item)),
    ...second.map((item) => mapGymGifExercise(item as GymGifExercise)).filter((item): item is ExerciseDefinition => Boolean(item)),
    ...third.map((item) => mapFreeExercise(item as FreeExercise)).filter((item): item is ExerciseDefinition => Boolean(item)),
    ...fourth.map((item) => mapExerciseDbExercise(item as ExerciseDbExercise)).filter((item): item is ExerciseDefinition => Boolean(item)),
  ]);
  return mapped.length > 0 ? mapped : EXERCISES;
}
