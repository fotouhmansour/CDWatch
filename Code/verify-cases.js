"use strict";

const assert = require("node:assert/strict");
const cases = require("../reference/case-data.json");
const scoring = require("../reference/cdwatch-scoring-core.js");

for (const caseStudy of cases) {
    const result = scoring.calculate(caseStudy.items);
    const score = scoring.round(result.score, 2);
    const coverage = scoring.round(result.coverage, 2);

    assert.equal(score, caseStudy.expected.score, `${caseStudy.study}: score`);
    assert.equal(coverage, caseStudy.expected.coverage, `${caseStudy.study}: coverage`);

    process.stdout.write(`${caseStudy.study}: score ${score.toFixed(2)}%, coverage ${coverage.toFixed(2)}%\n`);
}

// NR and NA must give the same performance score in a composite parameter.
const withNR = scoring.calculate({qy: 3, pdi: 3, temRsd: "NR"});
const withNA = scoring.calculate({qy: 3, pdi: 3, temRsd: "NA"});
assert.equal(scoring.round(withNR.score, 8), scoring.round(withNA.score, 8));

// They intentionally differ only in coverage because NR is eligible but missing.
assert.notEqual(scoring.round(withNR.coverage, 8), scoring.round(withNA.coverage, 8));

process.stdout.write("NR/NA performance-score equivalence: passed\n");
