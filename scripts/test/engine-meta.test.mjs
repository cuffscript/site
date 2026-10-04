// Tests the engine-source extractor against a small FAKE engine tree, so the
// scraping rules are pinned down without needing the real engine (see
// check-engine.test.mjs for tests against a real build).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractEngineMeta, describeDiff } from "../lib/engine-meta.mjs";

function fakeEngine(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-engine-"));
    for (const [rel, content] of Object.entries(files)) {
        const full = path.join(dir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
    }
    return dir;
}

const KEYWORDS = `
static const std::unordered_map<std::string, TokenType> &keywordMap() {
    static const std::unordered_map<std::string, TokenType> m = {
        {"set", TokenType::SET}, {"change", TokenType::CHANGE}, {"if", TokenType::IF},
        {"else", TokenType::ELSE}, {"loop", TokenType::LOOP}, {"do", TokenType::DO},
        {"end", TokenType::END}, {"func", TokenType::FUNCTION}, {"pure", TokenType::PURE},
        {"number", TokenType::NUMBER_TYPE}, {"str", TokenType::STR_TYPE},
        {"true", TokenType::TRUE}, {"false", TokenType::FALSE}, {"empty", TokenType::EMPTY},
    };
    return m;
}`;

const ERRORS = `
enum class ErrorCode {
    UnexpectedCharacter = 1001,
    ExpectedToken = 2001,
    DivisionByZero = 4006,
};`;

const MATH = `
inline void registerMathDLC(std::unordered_map<std::string, NativeFn> &reg)
{
    reg["math_abs"] = nullptr;
    // reg["math_old_removed"] = nullptr;   <- commented out, must not count
    /* reg["math_block_commented"] = nullptr; */
    const char *msg = "text with a { brace and a quote \\" inside";
    auto unary = [&](const std::string &name, double (*f)(double)) { reg[name] = nullptr; };
    unary("math_sqrt", nullptr);
    unary("math_sin", nullptr);
    char quote = '"';
    reg["math_after_char_literal"] = nullptr;
}`;

const CORE = `
inline void registerMathDLC(std::unordered_map<std::string, NativeFn> &reg);
inline void registerConvertDLC(std::unordered_map<std::string, NativeFn> &reg);

inline void registerBuiltins(std::unordered_map<std::string, NativeFn> &reg)
{
    reg["print"] = nullptr;
    reg["type_of"] = nullptr;
    registerConvertDLC(reg);
}

inline void registerDLC(std::unordered_map<std::string, NativeFn> &reg, const std::string &libName)
{
    if (libName == "math") registerMathDLC(reg);
    else if (libName == "convert") registerConvertDLC(reg);
    else if (libName == "extra") registerExtraDLC(reg);
}`;

const CONVERT = `
inline void registerConvertDLC(std::unordered_map<std::string, NativeFn> &reg)
{
    reg["to_str"] = nullptr;
}`;

const EXTRA = `
inline void registerExtraDLC(std::unordered_map<std::string, NativeFn> &reg)
{
    reg["extra_thing"] = nullptr;
}`;

const baseFiles = () => ({
    "engine/lexer/KeywordClassifier.h": KEYWORDS,
    "engine/common/ErrorCodes.h": ERRORS,
    "engine/interpreter/NativeFunctions.h": CORE,
    "engine/dlc/MathDLC.h": MATH,
    "engine/dlc/ConvertDLC.h": CONVERT,
    "engine/dlc/ExtraDLC.h": EXTRA,
    "npm/package.json": JSON.stringify({ version: "9.9.9" }),
});

test("extracts version, keywords, types, literals, libraries, functions and error codes", () => {
    const meta = extractEngineMeta(fakeEngine(baseFiles()));
    assert.equal(meta.engineVersion, "9.9.9");
    assert.deepEqual(meta.keywords, ["set", "change", "if", "else", "loop", "do", "end", "func", "pure", "empty"]);
    assert.deepEqual(meta.types, ["number", "str"]);
    assert.deepEqual(meta.literals, ["true", "false", "empty"]);
    assert.deepEqual(Object.keys(meta.dlc), ["math", "convert", "extra"]); // order of the use-DLC dispatcher
    assert.deepEqual(meta.errorCodes, [
        { code: "E1001", name: "UnexpectedCharacter" },
        { code: "E2001", name: "ExpectedToken" },
        { code: "E4006", name: "DivisionByZero" },
    ]);
});

test("finds functions registered through helper lambdas, ignoring comments, strings and char literals", () => {
    const meta = extractEngineMeta(fakeEngine(baseFiles()));
    assert.deepEqual(meta.dlc.math.functions.sort(), ["math_abs", "math_after_char_literal", "math_sin", "math_sqrt"]);
});

test("uses the register<Name>DLC *definition*, not a forward declaration, wherever it lives", () => {
    // The forward declaration in NativeFunctions.h is listed first; extraction must skip it.
    const meta = extractEngineMeta(fakeEngine(baseFiles()));
    assert.deepEqual(meta.dlc.convert.functions, ["to_str"]);
    assert.deepEqual(meta.dlc.extra.functions, ["extra_thing"]);
});

test("a brand-new library is picked up with no code change here", () => {
    const files = baseFiles();
    files["engine/interpreter/NativeFunctions.h"] = CORE.replace('else if (libName == "extra")', 'else if (libName == "shiny") registerShinyDLC(reg);\n    else if (libName == "extra")');
    files["engine/dlc/deep/nested/ShinyDLC.h"] = `inline void registerShinyDLC(std::unordered_map<std::string, NativeFn> &reg) { reg["shiny_one"] = nullptr; }`;
    const meta = extractEngineMeta(fakeEngine(files));
    assert.deepEqual(Object.keys(meta.dlc), ["math", "convert", "shiny", "extra"]);
    assert.deepEqual(meta.dlc.shiny.functions, ["shiny_one"]);
});

test("always-available functions include the DLC that the core registers itself (convert)", () => {
    const meta = extractEngineMeta(fakeEngine(baseFiles()));
    assert.deepEqual(meta.coreBuiltins.sort(), ["print", "to_str", "type_of"]);
});

test("fails loudly (with a pointer to what changed) when the engine layout is not recognised", () => {
    assert.throws(() => extractEngineMeta(fakeEngine({ "README.md": "x" })), /not a CuffScript engine checkout/);
    const files = baseFiles();
    delete files["engine/lexer/KeywordClassifier.h"];
    assert.throws(() => extractEngineMeta(fakeEngine(files)), /keywordMap\(\).*layout may have changed/s);
    const files2 = baseFiles();
    files2["engine/lexer/KeywordClassifier.h"] = "static auto &keywordMap() { return m; }";
    assert.throws(() => extractEngineMeta(fakeEngine(files2)), /keyword map looks empty/);
});

test("describeDiff summarises what changed between two metadata snapshots", () => {
    const a = extractEngineMeta(fakeEngine(baseFiles()));
    const b = structuredClone(a);
    b.engineVersion = "10.0.0";
    b.keywords.push("closure");
    b.dlc.math.functions = b.dlc.math.functions.filter((f) => f !== "math_sin").concat("math_cos");
    b.errorCodes.push({ code: "E4029", name: "PureFunctionImpureCall" });
    assert.deepEqual(describeDiff(a, b), [
        "engine version: 9.9.9 -> 10.0.0",
        "keywords: + closure",
        "DLC:math: + math_cos",
        "DLC:math: - math_sin",
        "error codes: + E4029=PureFunctionImpureCall",
    ]);
    assert.deepEqual(describeDiff(a, structuredClone(a)), []);
});
