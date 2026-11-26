import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseQuery, buildHaystack, entryMatches, spaced } from "../../src/errorSearch.ts";

test("a name is searchable by its words", () => {
    assert.equal(spaced("DivisionByZero"), "Division By Zero");
    const hay = buildHaystack("E4-006", "DivisionByZero", "division by zero");
    assert.ok(entryMatches(hay, "Runtime", "", normaliseQuery("division by zero")));
    assert.ok(entryMatches(hay, "Runtime", "", normaliseQuery("divisionbyzero")));
});

test("a code is found with or without its dash, in any case", () => {
    const hay = buildHaystack("E4-006", "DivisionByZero", "");
    for (const q of ["E4-006", "e4-006", "E4006", "e4006"]) assert.ok(entryMatches(hay, "Runtime", "", normaliseQuery(q)), q);
    assert.ok(!entryMatches(hay, "Runtime", "", normaliseQuery("E4-007")));
});

test("a pasted report line is searched by its code alone", () => {
    assert.deepEqual(normaliseQuery("ERROR: [E4-006] Runtime Error at line 3, column 5"), ["e4006"]);
});

test("every word must be found, and the category filter narrows the result", () => {
    const hay = buildHaystack("E4-017", "StackOverflow", "How many function calls may be active at once");
    assert.ok(entryMatches(hay, "Runtime", "", normaliseQuery("function calls")));
    assert.ok(!entryMatches(hay, "Runtime", "", normaliseQuery("function banana")));
    assert.ok(!entryMatches(hay, "Runtime", "Syntax", normaliseQuery("function")));
    assert.ok(entryMatches(hay, "Runtime", "Runtime", []));
});
