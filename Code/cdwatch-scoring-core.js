/*
 * CDWatch scientific scoring core, version 1.0.0
 *
 * This file is intentionally readable. It implements only the scientific
 * calculation described in the manuscript: parameter aggregation, the
 * normalized CDWatch score, and weighted data coverage. It contains no
 * interface, artwork, deployment, or visualization code.
 */
(function (root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CDWatchScoring = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const VERSION = "1.0.0";

    const STATUS = Object.freeze({
        REPORTED: "reported",
        NOT_REPORTED: "not_reported",
        NOT_APPLICABLE: "not_applicable"
    });

    const PARAMETERS = Object.freeze([
        Object.freeze({ key: "quantumYield", label: "Quantum yield", weight: 4, items: ["qy"] }),
        Object.freeze({ key: "particleSizeDistribution", label: "Particle-size distribution", weight: 3, items: ["pdi", "temRsd"] }),
        Object.freeze({ key: "synthesisYield", label: "Synthesis yield", weight: 2, items: ["yield"] }),
        Object.freeze({ key: "stability", label: "Stability", weight: 3, items: ["zeta", "ph", "ionic", "thermal", "shelfLife"] }),
        Object.freeze({ key: "biocompatibility", label: "Biocompatibility/toxicity", weight: 4, items: ["biocompatibility"] }),
        Object.freeze({ key: "functionalEfficiency", label: "Functional efficiency", weight: 4, items: ["function"] }),
        Object.freeze({ key: "synthesisGreenness", label: "Synthesis greenness", weight: 2, items: ["precursor", "solvent", "energy", "hazards"] }),
        Object.freeze({ key: "feasibility", label: "Feasibility", weight: 2, items: ["chemicals", "equipment", "cost"] })
    ]);

    const QUESTION_TO_ITEM = Object.freeze({
        1: "qy",
        2: "pdi",
        3: "temRsd",
        4: "yield",
        5: "zeta",
        6: "ph",
        7: "ionic",
        8: "thermal",
        9: "shelfLife",
        10: "biocompatibility",
        11: "function",
        12: "precursor",
        13: "solvent",
        14: "energy",
        15: "hazards",
        16: "chemicals",
        17: "equipment",
        18: "cost"
    });

    function reported(score) {
        return normalizeItem({ status: STATUS.REPORTED, score });
    }

    function notReported() {
        return Object.freeze({ status: STATUS.NOT_REPORTED, score: null });
    }

    function notApplicable() {
        return Object.freeze({ status: STATUS.NOT_APPLICABLE, score: null });
    }

    function normalizeItem(item) {
        if (item === null || item === undefined || item === "NR") {
            return notReported();
        }

        if (item === "NA") {
            return notApplicable();
        }

        if (typeof item === "number") {
            if (item >= 1 && item <= 3) {
                return Object.freeze({ status: STATUS.REPORTED, score: item });
            }
            throw new RangeError("A reported CDWatch subscore must be between 1 and 3.");
        }

        if (typeof item !== "object") {
            throw new TypeError("Each CDWatch item must be a score, status object, NR, NA, null, or undefined.");
        }

        const status = String(item.status || "").toLowerCase();

        if (["na", "n/a", "not_applicable", "not applicable"].includes(status)) {
            return notApplicable();
        }

        if (["nr", "not_reported", "not reported", "not_tested", "not tested", "unanswered"].includes(status)) {
            return notReported();
        }

        const score = Number(item.score);
        if (status === STATUS.REPORTED || Number.isFinite(score)) {
            if (score < 1 || score > 3) {
                throw new RangeError("A reported CDWatch subscore must be between 1 and 3.");
            }
            return Object.freeze({ status: STATUS.REPORTED, score });
        }

        throw new TypeError("Unrecognized CDWatch item status.");
    }

    function mean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /**
     * Calculate the CDWatch performance score and weighted data coverage.
     *
     * Performance score:
     *   S(%) = sum[w_i * (mean_i / 3)] / sum[w_i for active parameters] * 100
     *
     * Composite parameter mean:
     *   mean_i = sum(reported subscores) / number of reported subscores
     *
     * Coverage:
     *   C(%) = sum[w_i * (reported_i / applicable_i)]
     *          / sum[w_i for eligible parameters] * 100
     *
     * Not reported/not tested and not applicable have the same effect on the
     * performance score: neither contributes a numerical subscore. They differ
     * only for coverage. NR remains eligible and lowers coverage; NA is removed
     * from the eligible item count.
     */
    function calculate(items) {
        const normalizedItems = {};
        const parameterResults = [];
        let weightedNumerator = 0;
        let activeWeight = 0;
        let coverageNumerator = 0;
        let eligibleWeight = 0;

        for (const definition of PARAMETERS) {
            const normalized = definition.items.map((itemKey) => {
                const value = normalizeItem(items ? items[itemKey] : undefined);
                normalizedItems[itemKey] = value;
                return value;
            });

            const applicableItems = normalized.filter((item) => item.status !== STATUS.NOT_APPLICABLE);
            const reportedItems = normalized.filter((item) => item.status === STATUS.REPORTED);
            const applicableCount = applicableItems.length;
            const reportedCount = reportedItems.length;
            const parameterMean = reportedCount > 0 ? mean(reportedItems.map((item) => item.score)) : null;
            const active = parameterMean !== null;
            const eligible = applicableCount > 0;
            const reportingFraction = eligible ? reportedCount / applicableCount : null;
            const contribution = active ? definition.weight * (parameterMean / 3) : null;

            if (active) {
                weightedNumerator += contribution;
                activeWeight += definition.weight;
            }

            if (eligible) {
                coverageNumerator += definition.weight * reportingFraction;
                eligibleWeight += definition.weight;
            }

            parameterResults.push(Object.freeze({
                key: definition.key,
                label: definition.label,
                weight: definition.weight,
                mean: parameterMean,
                contribution,
                active,
                eligible,
                reportedCount,
                applicableCount,
                totalItemCount: definition.items.length,
                reportingFraction
            }));
        }

        const score = activeWeight > 0 ? (weightedNumerator / activeWeight) * 100 : null;
        const coverage = eligibleWeight > 0 ? (coverageNumerator / eligibleWeight) * 100 : null;

        return Object.freeze({
            version: VERSION,
            score,
            coverage,
            weightedNumerator,
            activeWeight,
            coverageNumerator,
            eligibleWeight,
            parameters: Object.freeze(parameterResults),
            items: Object.freeze(normalizedItems)
        });
    }

    /**
     * Convert the 18-question web-form selections to scientific-core items.
     * Each answer may be { value, text }, a numeric score, "NR", or "NA".
     */
    function calculateFromQuestionnaire(answers) {
        const items = {};

        for (const [questionNumber, itemKey] of Object.entries(QUESTION_TO_ITEM)) {
            const answer = answers ? answers[questionNumber] : undefined;
            items[itemKey] = normalizeQuestionAnswer(answer);
        }

        return calculate(items);
    }

    function normalizeQuestionAnswer(answer) {
        if (typeof answer === "number" || answer === "NR" || answer === "NA" || answer === null || answer === undefined) {
            return normalizeItem(answer);
        }

        if (typeof answer !== "object") {
            return notReported();
        }

        const text = String(answer.text || "").trim();
        const rawValue = String(answer.value === undefined ? "" : answer.value).trim();

        if (/not\s*applic/i.test(text)) {
            return notApplicable();
        }

        if (/not\s*(tested|reported)/i.test(text)) {
            return notReported();
        }

        const numericValue = Number(rawValue);
        if (Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 3) {
            return reported(numericValue);
        }

        return notReported();
    }

    function round(value, digits) {
        if (value === null) {
            return null;
        }
        const places = digits === undefined ? 2 : digits;
        const factor = 10 ** places;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    return Object.freeze({
        VERSION,
        STATUS,
        PARAMETERS,
        QUESTION_TO_ITEM,
        reported,
        notReported,
        notApplicable,
        calculate,
        calculateFromQuestionnaire,
        round
    });
});
