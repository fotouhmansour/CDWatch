# CDWatch reproducibility package

This package separates the freely accessible CDWatch application from the
readable scientific calculation supplied for peer-review verification.

## Repository structure

- `production/script.js` — obfuscated production application script. This is
  the supplied obfuscated 18-question build and is the file to deploy as
  `script.js` with the existing CDWatch interface.
- `reference/cdwatch-scoring-core.js` — readable, interface-independent
  reference implementation of Equations 1–2 and the weighted data-coverage
  calculation.
- `reference/case-data.json` — the seven case-study subscores and expected
  outputs reported in Tables S2–S3.
- `tests/verify-cases.js` — reproducibility tests for every case and an explicit
  check that NR and NA give the same performance score.
- `NOTICE.txt` — source-availability and rights notice.

## Scientific behavior

The reference core implements the following rules:

1. Every reported subitem is scored from 1 to 3.
2. Every composite parameter is the arithmetic mean of its reported,
   applicable subitems.
3. A wholly unreported parameter is excluded from the performance-score
   numerator and denominator.
4. Not reported/not tested (NR) and not applicable (NA) receive no numerical
   score and therefore have the same effect on the performance score.
5. NR remains eligible and lowers weighted data coverage; NA is removed from
   the eligible subitem count.
6. The eight baseline weights are 4, 3, 2, 3, 4, 4, 2, and 2.

The normalized performance score is:

`S (%) = sum[w_i * (mean_i / 3)] / sum[w_i for active parameters] * 100`

Weighted data coverage is:

`C (%) = sum[w_i * (reported_i / applicable_i)] / sum[w_i for eligible parameters] * 100`

## Verification

With Node.js installed, run:

```bash
node tests/verify-cases.js
```

The test must reproduce these manuscript results:

| Study | Score | Coverage |
|---|---:|---:|
| Park et al. | 77.78% | 52.64% |
| Mohandoss et al. | 61.48% | 52.64% |
| Qandeel et al. | 82.22% | 52.64% |
| Chauhan et al. | 89.81% | 61.39% |
| Tan et al. | 75.66% | 72.64% |
| Amezaga Gonzalez et al. | 66.67% | 57.64% |
| Ren et al. | 70.63% | 53.47% |

## Availability and licensing

The readable reference core is supplied to make the published calculations
auditable. The complete production application is not claimed to be
open-source. See `NOTICE.txt` for the applicable restrictions.

