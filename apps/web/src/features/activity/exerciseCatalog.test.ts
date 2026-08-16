import { afterEach, describe, expect, it, vi } from "vitest";
import { loadExerciseDataset } from "./exerciseCatalog";

describe("exercise dataset adapter", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("maps bodyweight exercises and keeps Spanish instructions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "0001", name: "push-up", category: "chest", equipment: "body weight", target: "pectorals", instructions: { es: "Baja con control." }, image: "images/0001.jpg" },
        { id: "0002", name: "bench press", equipment: "barbell" },
      ],
    }));

    const result = await loadExerciseDataset();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "dataset-0001", name: "Push-Up", instruction: "Baja con control.", equipment: "Peso corporal" });
    expect(result[0].imageUrl).toContain("exercises-dataset/main/images/0001.jpg");
  });
});
