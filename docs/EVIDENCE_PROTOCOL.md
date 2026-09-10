# Integrated evidence protocol

**SIEVE = Staged Integration of Evidence across Verification Environments.**

The engineering object is a versioned evidence package, not a plot or an isolated pass rate. `results/assurance-case.json` implements the following links:

| Engineering decision | Required record | Implemented evidence |
|---|---|---|
| Define the operating domain | Conditions, limits, hazards, units and excluded mechanisms | `scope`, scenario generators, parameter tables |
| Specify the requirement | Stable ID, metric, threshold and owner | R-STOP-5, R-ODD-HOLD, R-PRODUCTIVITY |
| Establish input pedigree | Source log ID, synthetic/measured origin, calibration and data hash | calibration CSV, `dependencies` |
| Freeze the tested configuration | Controller, planner/orchestrator settings, source hash | core, haulage and policy module hashes |
| Verify implementation | Analytical checks, seed repeatability, step-size comparison | test output and summary files |
| Validate within stated model | Training/validation split, raw outcomes, intervals, violations | episode CSV, hold checks and shift outcomes |
| Promote a counterexample | Paired scenario, failed requirement, trace, proposed next test | evidence ledger; approval remains null |
| Change a component | New version, impacted dependencies, invalidated evidence | hash comparison; repeat affected tests |
| Establish physical adequacy | Approved controlled tests and supervised field records | NOT_TESTED in this artifact |
| Authorize release | Signed human review and resolved required evidence | BLOCKED; no automated physical release |

This structure aligns with requirements, verification, validation and configuration-management activities in ISO/IEC/IEEE 15288, the mining system scope of ISO 17757, and simulation credibility practices in NASA-STD-7009B. It is not a claim of conformance to specific clauses.

Human–autonomy interfaces are documented as contracts: a loader-clearance acknowledgment can overlap loading only while the loading area remains segregated; a route closure, extreme-dust announcement or crew-exclusion signal commands a hold; a human must approve resumption. The shift experiment models timing of acknowledgments, not measured human behavior. The interactive demonstrator cannot operate real equipment.

Calibration samples may later be replaced with measured records through the CSV importer. Updating their source does not automatically make previous simulator evidence physically valid. Instrument calibration, load/grade compensation, sampling coverage, uncertainty and review must accompany real data. Figure captions must be updated to describe the new source accurately; the images themselves contain no baked-in claim that samples are measured or synthetic.
