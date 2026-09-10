#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/calibrate.mjs
node --test simulator/core.test.mjs simulator/haulage.test.mjs simulator/traffic.test.mjs
node scripts/experiment.mjs
node scripts/evidence.mjs
node scripts/haulage-experiment.mjs
node scripts/assurance.mjs
python3 synth_study.py
python3 scripts/check_assurance.py
python3 scripts/check_results.py
