// Mirrors engine/common/TokenTypes.h in the cuffscript repository.
export const CUFF_KEYWORDS = new Set([
    "set", "change", "constant", "if", "else", "loop", "repeat", "while",
    "match", "do", "end", "stop", "return", "await", "use", "from",
    "note", "endnote", "empty", "async", "returnable", "function", "add",
    "remove", "replace", "to", "or_else", "global", "not", "find", "split",
    "count", "by", "in", "is", "IS",
]);

export const CUFF_TYPES = new Set(["number", "str", "list", "map", "boolean"]);

export const CUFF_LITERALS = new Set(["true", "false", "empty"]);

export const CUFF_OPERATORS = new Set([
    "+", "-", "*", "/", ">=", "<=", ">", "<", "!", "~",
]);

export const CUFF_DLC_NAMES = new Set([
    "math", "string", "time", "random", "list", "convert", "network",
]);

export const CUFF_CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/;
