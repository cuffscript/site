import { test } from "node:test";
import assert from "node:assert/strict";
import { formatErrorTag, errorTagNumber, findErrorTag } from "../lib/errorTag.mjs";

test("formats the number the way the engine prints it", () => {
    assert.equal(formatErrorTag(4006), "E4-006");
    assert.equal(formatErrorTag(3101), "E3-101");
    assert.equal(formatErrorTag(9000), "E9-000");
});

test("a tag converts back to its number; anything else is NaN", () => {
    assert.equal(errorTagNumber("E4-006"), 4006);
    assert.ok(Number.isNaN(errorTagNumber("E4006")));
    assert.ok(Number.isNaN(errorTagNumber("DivisionByZero")));
});

test("finds the tag inside an engine error report", () => {
    assert.equal(findErrorTag("ERROR: [E4-006] Runtime Error at line 3, column 9: division by zero"), "E4-006");
    assert.equal(findErrorTag("no error here"), undefined);
});
