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
import { mapDatasetExercise, mapFreeExercise, mapGymGifExercise, records, type DatasetExercise, type FreeExercise, type GymGifExercise } from "./exerciseSourceAdapters";

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

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Catálogo no disponible (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function uniqueExercises(items: ExerciseDefinition[]): ExerciseDefinition[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
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
