// Lets the worker block (via Atomics.wait) exactly at the point input() is
// called, until the main thread supplies a line the person typed into the
// console. Requires cross-origin isolation (see vite.config.ts / public/_headers)
// so SharedArrayBuffer + Atomics.wait are available — see interactiveStdinSupported().
// None of this touches the wasm engine itself: Module.stdin is still just a
// plain synchronous callback, this only changes how the worker fills it.
//
// interactiveStdinSupported() must be re-checked from *inside* the worker,
// not just trusted from the main thread's check: a worker only inherits
// cross-origin isolation from a genuinely isolated page, and if a deploy's
// headers aren't actually reaching it yet (stale CDN cache, a host that
// doesn't honor public/_headers, etc.) the two can disagree. worker.ts relies
// on that re-check, plus a wait timeout below, to fail safe instead of
// hanging or throwing out of a running program.

const CONTROL_SLOTS = 2;
const DATA_CAPACITY = 4096;

const STATE_IDLE = 0;
const STATE_REQUESTING = 1;
const STATE_READY = 2;

// How long the worker will block for a single line before giving up and
// treating it as end-of-input. Generous, since it's just waiting on a person.
const WAIT_TIMEOUT_MS = 10 * 60 * 1000;

export interface StdinChannel {
    control: Int32Array;
    data: Uint8Array;
}

export function interactiveStdinSupported(): boolean {
    return (
        typeof SharedArrayBuffer !== "undefined" &&
        typeof Atomics !== "undefined" &&
        globalThis.crossOriginIsolated === true
    );
}

export function createStdinBuffer(): SharedArrayBuffer {
    return new SharedArrayBuffer(CONTROL_SLOTS * Int32Array.BYTES_PER_ELEMENT + DATA_CAPACITY);
}

export function openStdinChannel(buffer: SharedArrayBuffer): StdinChannel {
    return {
        control: new Int32Array(buffer, 0, CONTROL_SLOTS),
        data: new Uint8Array(buffer, CONTROL_SLOTS * Int32Array.BYTES_PER_ELEMENT, DATA_CAPACITY),
    };
}

// Worker side: blocks the worker thread (not the main thread) until the
// person submits a line, or WAIT_TIMEOUT_MS passes, or the buffer turns out
// not to be usable — in every case it returns a string rather than throwing,
// so a single failure degrades to "no input" instead of breaking the run.
export function requestLineBlocking(channel: StdinChannel): string {
    Atomics.store(channel.control, 1, 0);
    Atomics.store(channel.control, 0, STATE_REQUESTING);
    const outcome = Atomics.wait(channel.control, 0, STATE_REQUESTING, WAIT_TIMEOUT_MS);
    if (outcome === "timed-out") {
        Atomics.store(channel.control, 0, STATE_IDLE);
        return "";
    }
    const length = Atomics.load(channel.control, 1);
    const bytes = channel.data.slice(0, length);
    Atomics.store(channel.control, 0, STATE_IDLE);
    return new TextDecoder().decode(bytes);
}

// Main-thread side: called once the person submits what they typed.
export function provideLine(channel: StdinChannel, text: string): void {
    const encoded = new TextEncoder().encode(text).slice(0, DATA_CAPACITY);
    channel.data.set(encoded);
    Atomics.store(channel.control, 1, encoded.length);
    Atomics.store(channel.control, 0, STATE_READY);
    Atomics.notify(channel.control, 0);
}
