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
