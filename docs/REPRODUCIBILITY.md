# Reproducibility

Numerical checks use Node.js 24 and Python 3.13 with the pinned packages in `requirements.txt`. Dependencies are pinned by `package-lock.json`. `npm run experiment` runs the complete numerical workflow without graphics.

## Seed sets and units

- Initial model pairs: 27000–27999 per condition/controller/scope.
- Speed selection: 61000–61249 per candidate and condition.
- Revised validation: 41000–41999 per condition, independent of speed-selection seeds.
- Haulage: 51000–51199 per strategy; sensitivity uses the first 50 seeds.
- Announced out-of-domain holds: 71000–71099 per hazard.

Dynamics use SI units. Throughput is delivered tonnes divided by eight hours. Cycle time includes queueing and service for completed round trips. Moving speed excludes stops; shift-average speed includes all truck time. Condition proportions and 30-minute collision recovery are synthetic study assumptions. See `simulator/haulage.mjs` and `results/haulage-summary.json` for exact configuration.

Raw outcomes are preserved in CSV/JSONL; representative full trajectories and shift events are preserved separately. All omitted trajectories can be regenerated from their seed and configuration. `check_results.py` independently verifies aggregation and time accounting; `check_assurance.py` rejects changed evidence dependencies or artifacts.

## Publication assets

`npm run reproduce` adds matplotlib/Pillow figures and the TikZ framework export. Install XeLaTeX/BibTeX with IEEEtran, fontspec, newtxmath, TikZ, booktabs, and standalone, plus Times New Roman. Fonts are not bundled. `ffmpeg`, `ffprobe`, Chrome, and pinned Playwright are required only for media. Numeric results are independent of rendered pixels; font rasterization and WebGL appearance may vary across platforms.

Use `npm start` in one terminal and `npm run screenshots` or `npm run media` in another. The media capture is a deterministic 24-second illustrative montage, not an eight-hour shift replay. Generated frames stay in `.media-cache/` and are not committed.

## Versioned paper export

Run `python3 scripts/export_paper.py ../SIEVE-paper` from a clean, committed code checkout. The exporter verifies the assurance hashes and records the source commit, whether the working tree was dirty, and the exported file hashes. Review the manuscript when results change; the exporter deliberately does not rewrite the prose or captions.

GitHub Actions repeats the numerical workflow. Its status badge reports the actual workflow status, not field validation or safety certification.
