// The one place that knows how the engine prints an error code: "E4-006"
// (category digit, dash, three digits). If the format changes again, fix it here.

/** 4006 -> "E4-006" (the rule of errorCodeTag() in the engine's ErrorCodes.h). */
export function formatErrorTag(n) {
    return `E${Math.floor(n / 1000)}-${String(n % 1000).padStart(3, "0")}`;
}

/** "E4-006" -> 4006 (NaN if it is not a tag). */
export function errorTagNumber(tag) {
    const m = /^E(\d+)-(\d{3})$/.exec(tag);
    return m ? Number(m[1]) * 1000 + Number(m[2]) : NaN;
}

/** The tag inside an engine error report ("ERROR: [E4-006] Runtime Error ..."), if any. */
export function findErrorTag(stderr) {
    return /\[(E\d+-\d{3})\]/.exec(stderr)?.[1];
}
