# Calibration observations

`calibration-samples.csv` contains **32 synthetic observations**, eight per operating family. It is a demonstration of the import/fit/stress-test workflow, not collected field evidence. The synthetic samples deliberately cover a narrower range than the stress model. Captions identify this provenance; images do not bake a provenance label into their pixels.

A future measured dataset can use the same CSV schema:

```
sample_id,family,brake,visibility,latency,origin,source_id
```

Units: `brake` is level-road braking deceleration in m/s², `visibility` in metres, and `latency` in seconds. `family` is nominal, dust, wet or combined. `origin` must be synthetic or measured; `source_id` must identify the originating log or test. The importer rejects missing families, nonpositive measurements, or missing provenance. Keep instrument calibration, uncertainty, load, grade, conditions and approval records alongside any measured dataset; this lightweight import does not certify measurement validity.

```
node scripts/calibrate.mjs --input path/to/observations.csv
```

This fits descriptive observed bounds, performs simulator stress tests, and writes `config/policy.mjs`. Running it without `--input` restores the built-in synthetic experiment. A data change requires rerunning experiments and reviewing affected claims; physical origin alone does not establish representativeness of rare conditions.
