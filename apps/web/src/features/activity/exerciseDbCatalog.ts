import type { ExerciseDefinition } from "./exerciseCatalog";

export type ExerciseDbExercise = {
  exerciseId?: string;
  name?: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  gifUrl?: string;
};

function label(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function mapExerciseDbExercise(item: ExerciseDbExercise): ExerciseDefinition | undefined {
  const equipment = item.equipments ?? [];
  if (!item.exerciseId || !item.name || !equipment.some((value) => /body ?weight|bodyweight|none/i.test(value))) return undefined;
  return {
    id: `exercisedb-${item.exerciseId}`,
    name: item.name,
    category: "Fuerza",
    equipment: "Peso corporal",
    target: label(item.bodyParts?.[0] ?? item.targetMuscles?.[0] ?? "Cuerpo completo"),
    muscles: [...(item.targetMuscles ?? []), ...(item.secondaryMuscles ?? [])].map(label).join(" · "),
    level: "Catálogo",
    instruction: item.instructions?.join(" ") ?? "Realiza el movimiento de forma controlada.",
    source: "ExerciseDB API · free tier",
    animationUrl: item.gifUrl,
  };
}
