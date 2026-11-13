---
group: Embedding
summary: Running CuffScript from JavaScript, TypeScript, C++ and other languages
---

## Ways to embed CuffScript {#embedding}

The CuffScript engine is a library, not only a command-line tool. Your own program can hand it source text, let it run, and read back the output and any error, so you can use CuffScript for plugins, game logic, user-written rules, teaching tools or anything else that benefits from a small, readable language. There are three ways in, and the right one depends on the language your program is written in and on how much you need to control what a script may do.

| | JavaScript / TypeScript | C++ | Any language, through the command line |
|---|---|---|---|
| What you use | The `cuffscript-wasm` package (the engine compiled to WebAssembly) | The engine's headers, nothing to link | The `cuffc` program, run as a separate process |
| Where it runs | Browsers and web workers; Node with a small loader | Any C++17 program | Anywhere you can start a process |
| Run a program | `mod.cuffRun(source, scriptDir)` | `CuffEngine::execute(...)` or a `Session` | `cuffc file.cuff`, or the source on standard input |
| Output | A callback, once per printed line | `std::cout` | Standard output |
| Errors | `{ success, error }` | `Result::error` | Standard error, and a non-zero exit status |
| Limits on a script | None inside the module: run it in a worker that you can terminate | Step and time budgets, libraries switched off, a root folder | The same, as flags |
| Programs that arrive in pieces | No: each run starts fresh | Yes: `Session` | No |

Whichever you choose, read [Before you ship](#embedding-safety) first if the scripts will not be written by you.

## JavaScript and TypeScript {#embedding-js}

### Install and create the module

```bash
npm install cuffscript-wasm
```

The package is an ES module with type definitions. Its default export, `createCuffScriptModule`, loads the engine and gives you back a promise of the **module**: the object that runs programs. Loading takes a moment, so create it once and reuse it. The configuration you pass in has four optional parts: `print` (called once for every line a program prints), `printErr` (the same for standard error), `stdin` (called to read input) and `locateFile` (where to fetch the `.wasm` file from).

In a bundler such as Vite, which is what this site's IDE uses, the module finds its `.wasm` file by itself. If your build or CDN puts the file somewhere else, pass `locateFile`; the package also exports the file as `cuffscript-wasm/cuffscript.wasm`, so a bundler can give you its URL.

```js
import createCuffScriptModule from "cuffscript-wasm";

const mod = await createCuffScriptModule({
    print: (line) => console.log(line),
    printErr: (line) => console.error(line),
    locateFile: (path) => `/static/${path}`, // only if the .wasm file is not next to the script
});
```

### Node.js: a small loader

The package is built for browsers and web workers. Its loader fetches the `.wasm` file by URL, and Node's `fetch` cannot read a `file:` path, so in Node the unmodified call fails. Read the file yourself and hand the bytes over through the `instantiateWasm` hook that the module accepts. This wrapper does it (it needs a recent Node, because of `import.meta.resolve`); the examples below use it wherever a browser would call `createCuffScriptModule` directly.

```js
// node-loader.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import createCuffScriptModule from "cuffscript-wasm";

const wasmBytes = await readFile(fileURLToPath(import.meta.resolve("cuffscript-wasm/cuffscript.wasm")));

export function loadCuffScript(config = {}) {
    return createCuffScriptModule({
        ...config,
        instantiateWasm(imports, done) {
            WebAssembly.instantiate(wasmBytes, imports).then(({ instance }) => done(instance));
            return {};
        },
    });
}
```

### Running a program

`mod.cuffRun(source, scriptDir)` parses and runs one whole program and returns `{ success, error }`. `scriptDir` is a folder of the module's virtual file system, which is where `use ... from` looks for other files; pass `"/"` when the program has none. A failing program does not throw: `success` is `false` and `error` holds the finished report, with the line and a mark under the problem, ready to show. The report has no `ERROR:` prefix, so add your own if you want one.

```js
import { loadCuffScript } from "./node-loader.mjs";

const lines = [];
const mod = await loadCuffScript({ print: (line) => lines.push(line) });

const ok = mod.cuffRun('print(6 * 7)\nprint("done")', "/");
console.log(ok.success, lines);

const bad = mod.cuffRun("number a = 10\nnumber b = 0\nprint(a / b)", "/");
console.log(bad.success);
console.log(bad.error);
```

```text vars
true [ '42', 'done' ]
false
[{{error.DivisionByZero}}] Runtime Error at line 3, column 9
  |
3 | print(a / b)
  |         ^ division by zero
```

One module can run any number of programs, one after the other, but **each call starts from nothing**: a variable that one program declares is gone when the call ends, and the next program cannot see it. If you need programs that build on each other, that is what the C++ `Session` is for.

### Input

When a program calls `input()`, the engine asks your `stdin` callback for bytes, one at a time. Return a number from 0 to 255 for the next byte, and `null` once the input has run out; `input()` then returns an empty text. To feed a program a fixed text, encode it as UTF-8 and hand out its bytes:

```js
import { loadCuffScript } from "./node-loader.mjs";

const input = new TextEncoder().encode("Ann\n30\n");
let next = 0;

const mod = await loadCuffScript({
    print: (line) => console.log(line),
    stdin: () => (next < input.length ? input[next++] : null),
});

mod.cuffRun('str name = input()\nnumber age = to_number(input())\nprint(f"{name} will be {age + 1} next year")', "/");
```

```text
Ann will be 31 next year
```

Input that arrives while the program is running, such as a user typing at a prompt, is harder, because the callback has to give an answer immediately. A browser host solves it by running the module in a worker and having the callback wait, with `Atomics.wait` on a shared buffer, until the page sends a line. This site's IDE does exactly that, and it needs the page to be cross-origin isolated for `SharedArrayBuffer` to be available.

### Programs made of several files

Everything a program loads with `use ... from` has to exist in the module's virtual file system (`mod.FS`) before the call. Write the files there, then pass the folder of the entry file as `scriptDir`:

```js
import { loadCuffScript } from "./node-loader.mjs";

const mod = await loadCuffScript({ print: (line) => console.log(line) });

mod.FS.mkdirTree("/project/lib");
mod.FS.writeFile("/project/lib/greetings.cuff", 'func greet(str name) do:\n    return "Hello, " + name + "!"\nend\n');

const result = mod.cuffRun('use greetings from ./lib\nprint(greet("CuffScript"))', "/project");
console.log(result.success);
```

```text
Hello, CuffScript!
true
```

### The syntax tree

`mod.cuffDump(source)` parses a program without running it and prints the token list and the syntax tree through your `print` callback, the same information as `cuffc --ast`. It returns `{ success, error }` like `cuffRun`, which makes it useful for editors and other tools that need to understand a program rather than run it.

### TypeScript

The package ships its own types, so nothing else is needed. `CuffScriptModule` describes the module, `RunOutcome` the result of a run, and `CuffScriptModuleConfig` the configuration.

```ts
import createCuffScriptModule from "cuffscript-wasm";
import type { CuffScriptModule, RunOutcome } from "cuffscript-wasm";

const mod: CuffScriptModule = await createCuffScriptModule({ print: console.log });
const outcome: RunOutcome = mod.cuffRun('print("typed")', "/");
```

### Running code you did not write

A script that never ends would freeze the page or the process that runs it. The module has no budget of its own, so the guard has to come from outside: run it in a **web worker** that the page can terminate. The page starts the worker, sends it the source, and kills it if no answer comes back in time. A fresh worker costs a moment to start, so a host that runs many scripts keeps a worker and replaces it only after a timeout.

```js
// main.js
const worker = new Worker(new URL("./cuff-worker.js", import.meta.url), { type: "module" });
const output = [];

const finished = new Promise((resolve) => {
    worker.onmessage = ({ data }) => {
        if (data.type === "line") output.push(data.text);
        else resolve(data); // { type: "done", success, error }
    };
});
const timeout = new Promise((resolve) => setTimeout(() => resolve({ type: "timeout" }), 2000));

worker.postMessage({ source: 'print("hello from a worker")' });
const outcome = await Promise.race([finished, timeout]);
if (outcome.type === "timeout") worker.terminate(); // the script is stopped for good
console.log(outcome.type, output);
```

```js
// cuff-worker.js
import createCuffScriptModule from "cuffscript-wasm";

const modulePromise = createCuffScriptModule({
    print: (text) => postMessage({ type: "line", text }),
});

onmessage = async ({ data }) => {
    const mod = await modulePromise;
    const { success, error } = mod.cuffRun(data.source, "/");
    postMessage({ type: "done", success, error });
};
```

### What the JavaScript build cannot do

The module runs every program with the engine's default options. There is no step budget and no time budget, and every library is switched on. A browser cannot open ordinary network connections, so `DLC:network` does not work there, and `DLC:filesystem` only sees the module's own in-memory file system. The memory of the module is capped when it is built, which also bounds what a script can allocate. If you need more control than that, use C++ or the command line, where every one of these is an option. A JavaScript host can still look at the source before it runs it: this site's IDE refuses to run a program that loads `DLC:filesystem`.

## C++ {#embedding-cpp}

The engine is a set of C++17 headers under `engine/`. There is nothing to build or link: include the header you need and compile with `-I` pointing at the repository's root. Build with exceptions on (the default); the engine uses them internally and never lets one escape. The headers compile without warnings under `-Wall -Wextra`.

```cpp
// host.cpp
#include "engine/CuffEngine.h"
#include <iostream>
#include <sstream>

int main()
{
    cuff::CuffEngine::Options options;
    options.timeoutMs = 2000;          // stop a runaway script after two seconds
    options.maxSteps = 1000000;        // and after a million loop passes and calls
    options.networkEnabled = false;    // scripts may not reach the network
    options.filesystemEnabled = false; // or the file system

    // print() writes to std::cout, so swap the stream buffer to capture it.
    std::ostringstream captured;
    std::streambuf *previous = std::cout.rdbuf(captured.rdbuf());
    auto result = cuff::CuffEngine::execute("print(6 * 7)\n", ".", options);
    std::cout.rdbuf(previous);

    std::cout << "success: " << std::boolalpha << result.success << "\n";
    std::cout << "output: " << captured.str();

    // A failing script does not throw: the finished report is in result.error.
    auto failed = cuff::CuffEngine::execute("print(1 / 0)\n", ".", options);
    std::cout << "success: " << failed.success << "\n" << failed.error << "\n";
    return 0;
}
```

```bash
g++ -std=c++17 -I/path/to/cuffscript -o host host.cpp
./host
```

```text vars
success: true
output: 42
success: false
[{{error.DivisionByZero}}] Runtime Error at line 1, column 9
  |
1 | print(1 / 0)
  |         ^ division by zero
```

### Two ways to run a program

| Use | When |
|---|---|
| `CuffEngine::execute(source, scriptDir, options)` | You have a whole program and want it run once. A session is created for the call and discarded afterwards, so nothing the program declares outlives it. |
| `cuff::Session` (header `engine/Session.h`) | The program arrives in pieces, as in a shell, a notebook or a game console, and what an earlier piece declared must be visible to the next. |

Both report failures the same way, and neither throws for a failing script. `scriptDir` is the folder that `use ... from` and `DLC:filesystem` resolve against (unless `Options::rootDir` says otherwise); pass `"."` when the program has no file of its own. For a large program, pass the source as an rvalue (`std::move(text)`) to avoid a copy.

### Results and errors

`execute` returns a `CuffEngine::Result`: `success` says whether the program finished, and `error` holds the full report when it did not. A `Session` returns a `Session::Outcome` with the same two fields. The report is the one `cuffc` prints, with the headline, the source line, a mark under the problem and a hint when there is one, but without the `ERROR:` prefix. The engine never writes it anywhere itself: print it where you want. Format nothing on your own, and every front end stays in step when the report changes.

### Output and input

`print` writes to `std::cout` and `input` reads from `std::cin`. The engine has no stream of its own, so to capture the output or supply the input, replace the stream buffer around the call and put it back afterwards, as `host.cpp` does above. The same swap works for `std::cin` with a `std::istringstream`.

### The host's locale

The locale of your process does not reach a script. A host may call `setlocale` (many toolkits do at start-up), and numbers are still read and written with `.` as the decimal point, in source text, in `to_number`, in JSON and in output, and letter case is still the string library's, whatever the C library would do under that locale.

### Options

`CuffEngine::Options` (the same struct a `Session` takes) holds the configuration of the interpreter:

| Field | Meaning | Default |
|---|---|---|
| `rootDir` | The folder that `use ... from` and `DLC:filesystem` may reach | The script's folder |
| `maxSteps` | Loop passes plus function calls allowed before the run stops with `ExecutionStepLimit` ({{error.ExecutionStepLimit}}); `0` is unlimited | `0` |
| `timeoutMs` | Milliseconds allowed before the run stops with `ExecutionTimeout` ({{error.ExecutionTimeout}}); `0` is unlimited | `0` |
| `stackBudgetBytes` | The native stack the engine may use for work that nests inside it (a program's own calls use none); `0` works it out from the real stack | `0` |
| `networkEnabled` | Whether `DLC:network` calls are allowed | `true` |
| `allowPrivateNetworkTargets` | Whether `DLC:network` may reach loopback and private addresses | `false` |
| `filesystemEnabled` | Whether `DLC:filesystem` calls are allowed | `true` |
| `onCompiled` | A function that the engine calls with each piece of bytecode as it compiles it, for tools that want to show what a script turns into (`cuffc --bytecode` uses it) | none |

A library that is switched off raises `DLCFeatureUnavailable` ({{error.DLCFeatureUnavailable}}) from every call to it. The two budget errors cannot be caught by `or_else`, so a script cannot swallow them.

### Programs in pieces: Session

A `Session` runs one piece at a time against the same interpreter, so variables, functions and loaded modules from earlier pieces are visible to later ones. `reset()` forgets everything and keeps the options. A session keeps every program it has run until it is reset, because the interpreter holds pointers into them, so a session that runs unbounded amounts of code should be reset now and then.

```cpp
// session.cpp
#include "engine/Session.h"
#include <iostream>

int main()
{
    cuff::Session session; // default options
    session.run("number n = 5\n");
    auto a = session.run("print(n * 2)\n"); // sees n
    std::cout << "piece ok: " << std::boolalpha << a.success << "\n";

    session.reset(); // forget everything, keep the options
    auto b = session.run("print(n)\n");
    std::cout << "after reset ok: " << b.success << "\n";
    std::cout << b.error << "\n";
    return 0;
}
```

```text vars
10
piece ok: true
after reset ok: false
[{{error.UndefinedVariable}}] Runtime Error at line 1, column 7
  |
1 | print(n)
  |       ^ undefined variable 'n'
```

### Parsing only, and threads

`CuffEngine::run(source)` only parses. On success its result holds the syntax tree and the token streams, which is what tools such as `cuffc --ast` use. A `Session` is not shared between threads: give each thread its own. A script's own calls take frames of the engine's bytecode machine and no native stack, so a script can recurse to the call depth limit even on a thread with a small stack, and a runaway recursion ends with the catchable `StackOverflow` ({{error.StackOverflow}}). The engine measures the stack it really runs on only for the work that does nest inside it, such as an object's `to_str` that shows another object, and ends that with the same error instead of overflowing. Two small pieces of state are shared by every session in the process and are locked: the table of identifier names, and the random generator behind `DLC:random`, so `random_seed` in one session changes the sequence that the others see.

The [C++ API reference]({{site.blobUrl}}/docs/reference/cpp-api.md) lists every type and function, and [`examples/embedding`]({{site.blobUrl}}/examples/embedding/README.md) in the repository is a complete host program.

## From any other language: run cuffc {#embedding-cli}

A program in Python, Go, Rust or any other language does not need bindings. Start `cuffc` as a child process, give it the source on standard input (`-` or no file name means "read the script from standard input"), and read standard output, standard error and the exit status. A program that ends with an error exits with a non-zero status and writes the report, with an `ERROR:` prefix, to standard error. The limits are flags:

| Flag | Meaning |
|---|---|
| `--timeout <ms>` | Stop after this many milliseconds of run time (`0` is unlimited) |
| `--max-steps <n>` | Stop after this many loop passes plus function calls (`0` is unlimited) |
| `--no-network` | Switch `DLC:network` off |
| `--no-filesystem` | Switch `DLC:filesystem` off |
| `--root <dir>` | Let `use ... from` load modules anywhere under this folder (by default, only from the script's own folder) |
| `--allow-private-network` | Let `DLC:network` reach loopback and private addresses |

```python
import subprocess

source = 'print("hello from " + "Python")\n'
run = subprocess.run(
    ["cuffc", "--timeout", "2000", "--no-network", "--no-filesystem", "-"],
    input=source, text=True, capture_output=True,
)
print(run.returncode, run.stdout.strip())
```

```text
0 hello from Python
```

A script that runs too long is stopped and reports the budget error:

```text vars
ERROR: [{{error.ExecutionTimeout}}] Resource Limit Error at line 2, column 1
  |
2 | loop while true do:
  | ^^^^ execution time limit (300 ms) exceeded
```

Starting a process costs more than calling a library, and each run starts from nothing, so this fits hosts that run a script occasionally. A host that runs many scripts, or that needs a session, is better served by the C++ API.

## Before you ship {#embedding-safety}

If the scripts are yours, the defaults are fine. If they come from users, decide what a script may do before you let it run:

| Concern | JavaScript (wasm) | C++ and the command line |
|---|---|---|
| A script that never ends | Run the module in a worker and terminate it on a timer | Set `timeoutMs` and `maxSteps` (`--timeout`, `--max-steps`) |
| Reaching the network | A browser cannot open raw connections; the module cannot be configured | `networkEnabled = false`, and leave `allowPrivateNetworkTargets` off (`--no-network`) |
| Reading and writing files | Only the in-memory file system exists; check the source for `use DLC:filesystem` if you want to refuse it | `filesystemEnabled = false`, and a narrow `rootDir` (`--no-filesystem`, `--root`) |
| Memory and CPU as a whole | The browser's limits, and the memory cap built into the module | Process-level limits from your operating system |

The engine's own protections, such as the sandbox root, the blocked private network addresses and the budgets, reduce what a script can do, but they are not a promise that hostile code is harmless, so they belong together with limits that your platform applies to the process. The project's [security policy]({{site.blobUrl}}/SECURITY.md) says what the engine does and does not protect against.
