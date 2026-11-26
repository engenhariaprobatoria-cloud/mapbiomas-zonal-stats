# Task specification and evaluation rubric
## Geospatial zonal statistics in Google Earth Engine

Version 1.0 · Max Lino Machado · Biologist, CRBio 076313/04-D
License: CC BY 4.0

## 1. Purpose

This document specifies an evaluation task for AI systems that write geospatial
analysis code. It contains the task prompt given to the model, the reference
solution, a set of pass/fail gates, weighted scoring criteria, and a taxonomy of
failure modes observed in real output on this task.

The rubric is written to be applied by a human rater who does not run the code.
Every criterion is decidable by reading the script and the output table.

## 2. Task prompt given to the model

> Write a Google Earth Engine script that computes the area, in hectares, of
> each land-use class of the MapBiomas Collection 9 integration asset inside a
> given polygon, for the years 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020
> and 2023. Export a table with one row per year and one column per class.
> The result must be reproducible by a third party with no private assets.

## 3. Reference solution

https://github.com/engenhariaprobatoria-cloud/mapbiomas-zonal-stats

Reference run: municipality of Santo Antônio do Amparo, Minas Gerais, Brazil.
Total area 49,186.59 ha. Seventeen classes. Unassigned area zero.

The reference run is verifiable: a reviewer can re-run the script with the same
public polygon and obtain the same table.

## 4. Hard gates

A failure in any gate scores the submission zero, regardless of the rest.

| Gate | Failure condition |
| ---- | ----------------- |
| G1 | The script does not execute. Any uncaught exception on first run. |
| G2 | Wrong asset type: `ee.ImageCollection()` applied to a multi-band Image asset. |
| G3 | Area computed by counting pixels instead of summing `pixelArea`, so partial pixels at polygon edges are lost. |
| G4 | The output table cannot be reproduced: asset id, scale or CRS absent or left to engine defaults. |
| G5 | Numbers presented as measured results while the code states, in comments or documentation, that the values are simulated, illustrative or conceptual. |
| G6 | A claim of accuracy that the method cannot support, without disclosure (e.g. reporting class areas below the collection's minimum mappable unit as measured land cover). |

G5 is the gate most likely to be missed by an automated check and most likely to
matter. A submission can run cleanly, produce plausible numbers, and still be a
fabrication.

## 5. Scored criteria

Each criterion is scored 0–3. Weighted score = sum of (weight x score / 3).
Weights sum to 100.

### C1 — Spatial reference and scale (weight 15)

- 3: CRS declared explicitly on raster export; scale equals the collection's
  native resolution; polygon passed as geometry, not left as a FeatureCollection
  where a geometry is required; no mixed reference systems.
- 2: scale declared, CRS left to default. Result valid, but not reproducible
  outside the author's session.
- 1: both scale and CRS left to defaults.
- 0: reference systems mixed, or reprojection performed without declaration.

### C2 — Area computation method (weight 20)

- 3: `ee.Image.pixelArea()` summed by group; explicit square metre to hectare
  conversion; an independent cross-check that class sums reconcile with the
  total area.
- 2: `pixelArea` used, no reconciliation check.
- 1: pixel count multiplied by nominal pixel area, without correction for
  partial pixels.
- 0: pixel counting presented as area.

### C3 — Asset contract (weight 15)

- 3: identifies the asset as a single multi-band Image with one band per year
  (`classification_YYYY`); selects a band instead of filtering a collection;
  prints available bands so a version change is visible rather than opaque.
- 2: reaches the correct bands through a fragile path (attempts collection
  first, falls back on error).
- 1: hardcodes band names without verification.
- 0: applies collection semantics to an Image asset, causing a runtime error.

### C4 — Degenerate cases and guard validity (weight 15)

- 3: the guard actually fires, and this is demonstrable. Absence of data is
  tested on a property that can be false, not on object truthiness.
- 2: guard present but unreachable in practice or untested.
- 1: guard written in a form that cannot fire — for example, testing an Earth
  Engine object for null when the API returns an empty object instead.
- 0: no guard; assumes every band and every year exists.

### C5 — Server and client semantics (weight 10)

- 3: no client-side operator applied to a server-side object; defaults resolved
  server-side (`ee.Dictionary.get(key, default)`); filters applied only to types
  that accept them.
- 2: one misuse that does not change the final result.
- 1: one misuse that silently returns wrong values — for example, a fallback
  that never applies because the object is truthy on the client.
- 0: multiple misuses, output wrong.

### C6 — Uncertainty and limitation disclosure (weight 15)

- 3: states pixel resolution and its consequence in hectares; states the minimum
  mappable unit; states that classification accuracy is inherited and not
  re-estimated; states what the result cannot support; reports the area not
  covered by the selected class list.
- 2: two of those four.
- 1: one, or a generic disclaimer.
- 0: numbers presented as exact measurements.

### C7 — Reproducibility and provenance (weight 5)

- 3: asset id, collection version, scale, CRS, script version and run date
  written into every output row.
- 2: provenance in comments only.
- 1: asset id only.
- 0: none.

### C8 — Visual fidelity of the map layer (weight 5)

- 3: one distinct colour per class, produced by remapping non-contiguous class
  ids onto a contiguous range; legend matches the classes actually present.
- 2: distinct colours, legend mismatched.
- 1: duplicated colours across classes.
- 0: no legend, or a single ramp applied over nominal classes.

## 6. Failure taxonomy

Observed in real output on this task. Each code records symptom, root cause and
how a rater detects it without executing the code.

| Code | Symptom | Root cause | Detection |
| ---- | ------- | ---------- | --------- |
| F1 | `Expected asset ... to be an ImageCollection, found 'Image'` | Collection semantics applied to an Image asset | Read the loader line against the documented asset type |
| F2 | Absence guard present, never triggers | `first()` on an empty collection returns a band-less object, never null | Look for a truthiness test on an API object |
| F3 | Default value never applied | `\|\| 0` evaluated on the client against a truthy server object | Any `\|\|` adjacent to an `ee.` accessor |
| F4 | Grouped reducer output empty or malformed | `ee.List.filter(ee.Filter.eq(...))` applied to dictionaries, not Features | Filter applied to a list of dictionaries |
| F5 | Two classes indistinguishable on the map | Same hex repeated across class entries | Count unique colours against class count |
| F6 | Reported areas not multiples of one pixel | Area derived at a finer scale than declared, or fractional-pixel method unstated | Divide each area by pixel area; non-integers indicate a method mismatch |
| F7 | Flow rate off by three orders of magnitude | Decimal separator confusion between comma and point in a mixed-locale document | Cross-check any rate against catchment area |
| F8 | Share of the area of interest unaccounted for | Incomplete class list presented as complete | Sum class columns; compare with total |
| F9 | Flag marks a class that does not exist | Zero satisfied "less than minimum mappable unit" | Check flags against the area column |
| F10 | Small constant offset in every sum | A parameter column summed as if it were data | Sum of parts minus total; look for a constant |
| F11 | Empty result produced without error | Filter using exact string equality against a name that differs in spelling or accent | Feature count printed before the computation |

F6 through F11 are the failures a code-first review misses. They produce output
that runs, exports and looks correct. They are found by reconciling numbers, not
by reading syntax.

## 7. Scoring procedure

1. Apply the gates. Any failure ends the evaluation with score 0 and the gate
   code recorded.
2. Score C1 to C8 against the anchors.
3. Compute the weighted score.
4. Record every failure code observed, whether or not it affected the score.

Interpretation:

| Weighted score | Reading |
| -------------- | ------- |
| 90–100 | Reference quality. Suitable as a reference solution. |
| 75–89 | Acceptable. Runs, reproducible, limitations declared. |
| 50–74 | Partial. Produces numbers, but not defensible. |
| below 50 | Not usable as training data. |

A submission scoring below 75 must not enter a training set without correction,
even if it runs without error.

## 8. Rater calibration

- Two raters score the same ten submissions independently before scoring live
  tasks.
- Target agreement: Cohen's kappa of at least 0.70 on the gate decision, and
  0.60 on each criterion.
- Disagreements are adjudicated against the reference solution, not against
  majority opinion.
- Any failure code not present in the taxonomy is added to it with symptom,
  cause and detection, before the next batch.

## 9. Scope and limitations

- Single domain: land-use and land-cover change. Criteria C1, C2, C5, C7 and C8
  generalise to other Earth Engine tasks; C3, C4 and C6 are specific to
  multi-band collection assets.
- The reference run uses one municipality. Behaviour on large polygons requiring
  `tileScale` adjustment is not covered by the criteria.
- The rubric evaluates the correctness and defensibility of an analysis. It does
  not evaluate whether the analysis answers a useful question.
- Minimum mappable unit is fixed at 0.5 ha in the reference implementation.
  Per-class values must be confirmed in the collection documentation before the
  flags are used in a regulatory context.
