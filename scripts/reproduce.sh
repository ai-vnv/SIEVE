#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export MPLCONFIGDIR="${TMPDIR:-/tmp}/sieve-mpl"
node scripts/calibrate.mjs
node --test simulator/core.test.mjs simulator/haulage.test.mjs simulator/traffic.test.mjs
node scripts/experiment.mjs
node scripts/evidence.mjs
node scripts/haulage-experiment.mjs
node scripts/assurance.mjs
python3 scripts/check_assurance.py
python3 synth_study.py
python3 scripts/figures.py
python3 scripts/haulage_figures.py
if [[ "${1:-}" == "--screenshots" ]]; then
  python3 scripts/capture.py
fi
python3 scripts/check_results.py
python3 scripts/image_formats.py
xelatex -interaction=nonstopmode -halt-on-error -output-directory=figures figures/framework-standalone.tex > results/framework-build.log
echo "Simulation evidence and publication assets regenerated. Export to SIEVE-paper with scripts/export_paper.py."
