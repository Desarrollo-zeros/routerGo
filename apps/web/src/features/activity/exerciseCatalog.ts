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
};

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
};

export const EXERCISE_DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";

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
  };
}

export async function loadExerciseDataset(signal?: AbortSignal): Promise<ExerciseDefinition[]> {
  const response = await fetch(EXERCISE_DATASET_URL, { signal });
  if (!response.ok) throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
  const payload = await response.json() as unknown;
  if (!Array.isArray(payload)) throw new Error("El catálogo de ejercicios tiene un formato inválido.");
  const mapped = payload.map((item) => mapDatasetExercise(item as DatasetExercise)).filter((item): item is ExerciseDefinition => Boolean(item));
  return mapped.length > 0 ? mapped : EXERCISES;
}
