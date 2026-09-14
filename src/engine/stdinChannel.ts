// Lets the worker block (via Atomics.wait) exactly at the point input() is
// called, until the main thread supplies a line the person typed into the
// console. Requires cross-origin isolation (see vite.config.ts / public/_headers)
// so SharedArrayBuffer + Atomics.wait are available — see interactiveStdinSupported().
// None of this touches the wasm engine itself: Module.stdin is still just a
// plain synchronous callback, this only changes how the worker fills it.

const CONTROL_SLOTS = 2;
const DATA_CAPACITY = 4096;

const STATE_IDLE = 0;
const STATE_REQUESTING = 1;
const STATE_READY = 2;

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
// person submits a line. Safe to call repeatedly — one call per input() line.
export function requestLineBlocking(channel: StdinChannel): string {
    Atomics.store(channel.control, 1, 0);
    Atomics.store(channel.control, 0, STATE_REQUESTING);
    Atomics.wait(channel.control, 0, STATE_REQUESTING);
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
