# Haulage demonstrations

Both videos depict **synthetic, illustrative workflow stages**: shovel loading, loaded haulage, discharge at the crusher/receiving pocket, and return. Presentation time is compressed, with camera cuts between stages; this is not a continuous or collision-complete fleet simulation trace.

- `haulage-clean.mp4`: 24 s, 960 × 540, 20 fps, H.264, no sound or text.
- `haulage-annotated.mp4`: the same render with Times New Roman annotations generated from `results/haulage-summary.json`.
- `haulage-clean.gif`, `haulage-annotated.gif`: 12 s, 480 × 270, 6 fps, looping previews of the entire montage at twice its presentation speed.
- `render-manifest.json`: presentation stages, visual seed, dimensions, and browser diagnostics.
- `encoding-manifest.json`: numerical source hash, media hashes, dimensions, durations, and sizes.

The annotations show means from 200 synthetic eight-hour shifts per strategy. They are study-level results, not instantaneous telemetry for the illustrated truck. Zero observed collisions are not a claim of zero operational risk. The clean clip intentionally leaves all explanation here rather than baking labels into the pixels.

Run the local simulator server, then `npm run media`. Requires Google Chrome, FFmpeg/ffprobe, pinned Playwright, and Times New Roman. Original procedural media are MIT licensed by mansurarief.

Presentation traffic uses lane-aware spacing, and capture checks conservative oriented truck and worker footprints on every frame with a 0.5 m margin per actor. An overlap stops capture. Opposing traffic advances in its direction of travel; the return truck is empty. This check prevents visual interpenetration in the demonstration and is separate from the paper’s stopping-safety evidence.

Wheels rotate from traveled distance using the rendered tire radius. Payload height increases during loading, is full before loaded haul begins, decreases during discharge, and is zero on the empty return lane. Capture verifies all six wheel angles and the loaded/empty states on every frame.
