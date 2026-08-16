DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'treasure_step_proof_shape'
  ) THEN
    ALTER TABLE treasure_steps
      ADD CONSTRAINT treasure_step_proof_shape CHECK (
        (proof_type = 'QR' AND radius_meters IS NULL)
        OR (proof_type = 'COARSE_GEOFENCE' AND geohash IS NOT NULL AND radius_meters BETWEEN 100 AND 1000)
      );
  END IF;
END $$;
