// Word lists for syntax highlighting.
//
// Keywords, types, literals and DLC names are NOT maintained by hand: they are
// generated from the engine's own source by `npm run sync:engine` (see
// scripts/sync-engine.mjs) into src/generated/engine-meta.json. When the engine
// adds, renames or removes a keyword or library, re-run that command — nothing
// here needs editing.
//
// Only things that are not part of the engine's keyword table live below
// (operators and the ALL-CAPS constant-name rule).
import meta from "../generated/engine-meta.json";

export const CUFF_KEYWORDS = new Set<string>(meta.keywords);

export const CUFF_TYPES = new Set<string>(meta.types);

export const CUFF_LITERALS = new Set<string>(meta.literals);

export const CUFF_OPERATORS = new Set([
    "+", "-", "*", "/", ">=", "<=", ">", "<", "!", "~",
]);

export const CUFF_DLC_NAMES = new Set<string>(Object.keys(meta.dlc));

export const CUFF_CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/;
