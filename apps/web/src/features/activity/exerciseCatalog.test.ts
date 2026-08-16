import { afterEach, describe, expect, it, vi } from "vitest";
import { loadExerciseDataset } from "./exerciseCatalog";

describe("exercise dataset adapter", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("maps bodyweight exercises and keeps Spanish instructions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "0001", name: "push-up", category: "chest", equipment: "body weight", body_part: "chest", target: "pectorals", instructions: { es: "Baja con control." }, image: "images/0001.jpg" },
        { id: "0002", name: "bench press", equipment: "barbell" },
      ],
    }));

    const result = await loadExerciseDataset();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "dataset-0001", name: "Push-Up", instruction: "Baja con control.", equipment: "Peso corporal", target: "Pectorals" });
    expect(result[0].imageUrl).toContain("exercises-dataset/main/images/0001.jpg");
  });

  it("maps ExerciseDB bodyweight records and ignores equipment exercises", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ exerciseId: "edb-1", name: "push up", bodyParts: ["chest"], equipments: ["body weight"], targetMuscles: ["pectorals"], gifUrl: "https://static.exercisedb.dev/media/edb-1.gif" }] }),
    }));

    const result = await loadExerciseDataset();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "exercisedb-edb-1", equipment: "Peso corporal", source: "ExerciseDB API · free tier" });
  });

  it("maps the GIF database envelope and keeps its Spanish media URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exercises: [{ id: "legs/squat", name: "Sentadilla", equipment: "bodyweight", bodyPart: "legs", gifUrl: "https://cdn.example/squat.gif" }] }),
    }));

    const result = await loadExerciseDataset();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "gym-gifs-legs/squat", source: "ExerciseGymGifsDB · jsDelivr", animationUrl: "https://cdn.example/squat.gif" });
  });
});
