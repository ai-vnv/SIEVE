# SIEVE

**Staged Integration of Evidence across Verification Environments**

[![CI](https://github.com/ai-vnv/SIEVE/actions/workflows/ci.yml/badge.svg)](https://github.com/ai-vnv/SIEVE/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-397d80.svg)](LICENSE)
![Node.js 24](https://img.shields.io/badge/Node.js-24-627d98.svg)
![Python 3.13](https://img.shields.io/badge/Python-3.13-627d98.svg)

A reproducible research simulator for autonomous open-pit haulage. SIEVE connects context-specific safety tests, controller revision, productivity experiments, 3D inspection, and versioned engineering evidence. Processes modeled: shovel loading → loaded haul → crusher discharge → empty return. Additional trucks, machinery, and segregated workers provide mine context.

![Text-free haulage workflow](media/haulage-clean.gif)

**[Clean MP4](media/haulage-clean.mp4)** · **[Clean GIF](media/haulage-clean.gif)**

## Run locally

Requires Node.js 24+ and Python 3.

```sh
git clone https://github.com/ai-vnv/SIEVE.git
cd SIEVE
npm ci
npm start
```

Open **http://127.0.0.1:8766/simulator/**.

Choose conditions, controller, model scope, and seed, then press **Restart**. Inspect **Overview**, **Follow**, **Driver**, **Left**, **Right**, **Plan**, **Field crew**, **Loading**, **Unloading**, **Passing**, and **Operations**. **Shift study** displays the stored 200-shift comparisons; **Save evidence** exports an encounter and trajectory. The driver view includes a dashboard.

The road is 32 m wide, with vehicle centres 8 m from its centreline. Opposing visual traffic uses separate lanes. Dust, extreme dust, wet braking, route closure, and human exclusion scenes expose different operating assumptions. `?paper&paused` enables large publication labels; `?clean&paused` hides the interface for scripted media capture.

## Reproduce the evidence

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm test
npm run experiment
```

This runs the analytical and conservation tests, regenerates numerical studies, and independently checks raw-record aggregation and evidence hashes. It needs no browser, GPU, TeX installation, or external dataset.

| Study | Reproducible scope |
|---|---|
| Initial stopping benchmark | 32,000 encounters: 4 conditions × 4 controllers × 2 model scopes × 1,000 seeds |
| Calibration example | 32 synthetic observations; six candidate speed caps, 250 training seeds per condition |
| Revised stopping validation | 4,000 independent-seed encounters |
| Announced hazard holds | 100 cases each for extreme dust, route closure, and crew exclusion |
| Haulage comparison | 200 eight-hour shifts per strategy, four strategies, six trucks |
| Handover sensitivity | 50 paired seeds at 0, 30, and 60 seconds |

## Reference results

Means over 200 synthetic eight-hour shifts per strategy; each delivered load is 240 t.

| Strategy | Throughput (t/h) | Cycle (min) | Moving speed (km/h) | Collisions / shift |
|---|---:|---:|---:|---:|
| Fast / condition-blind | 3,653 | 21.01 | 43.08 | 8.08 |
| Blanket restriction | 2,802 | 30.69 | 14.39 | 0 |
| Context aware | 3,685 | 23.16 | 29.37 | 0 |
| Human coordinated | 4,174 | 20.53 | 29.38 | 0 |

![Productivity–safety comparison and fleet time accounting](figures/productivity.png)

The initial guard still violates the 5 m requirement in 35 of 1,000 combined-condition encounters, including one collision. The revised envelope has zero observed violations in 4,000 validation encounters. The shift model explicitly assumes loading and dumping service times, dispatch-order reservations, hazard exposure, recovery downtime, and human-clearance timing. Coordinating clearance with loading increases modeled throughput; setting the acknowledgment duration to zero removes that advantage.

## Figures, media, and the paper

`npm run reproduce` also regenerates the Times New Roman vector plots and framework figure. It requires XeLaTeX/BibTeX.

With the local server running and Google Chrome and FFmpeg installed:

```sh
npm run screenshots
npm run media
```

The media script captures deterministic frames into ignored `.media-cache/`, encodes four compact clips, and records dimensions, duration, source hashes, and browser errors. `SIEVE_BASE_URL` can select another server when capturing media.

## Repository map

- `simulator/`: shared longitudinal dynamics, finite-shift scheduler, tests, Three.js scene.
- `config/`, `data/`: selected policy caps and provenance-preserving calibration inputs.
- `scripts/`: experiments, independent checks, figure production, capture, encoding, and paper export.
- `results/`: raw outcomes, summaries, seed sets, representative replays, and assurance records.
- `figures/`: compact screenshots and vector publication figures; high-resolution captures can be regenerated.
- `media/`: small clean/annotated MP4 and GIF demonstrations with manifests.
- `docs/`: engineering evidence protocol and reproducibility details.


## License and citation

Original code, documentation, generated data, and procedural media: **[MIT](LICENSE)**. Dependencies retain their licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). The manuscript has separate publication rights. Use [CITATION.cff](CITATION.cff) to cite the software. 
