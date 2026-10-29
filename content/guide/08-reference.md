---
group: Reference
summary: Common mistakes, known limitations, related links
---

## Common mistakes {#common-mistakes}

| Mistake | Why it's a problem | How to fix it |
|---|---|---|
| `list[0]` | Indexes start at `1`. `0` is not a valid position. | The first element is `list[1]`. |
| `if x is 5 do :` | A space before a colon is a syntax error. | Attach the colon to the word before it, as in `do:`. |
| `set constant number retries to 3` | The constant name isn't all upper case. | Write it in capitals, like `RETRIES`. |
| Changing a constant with `change` | A constant can't be changed after it is declared. | If the value needs to change, declare it without `constant`. |
| Reading or `change`-ing a global variable directly inside a function | A function sees only its own local variables. | Connect it first with `change name to global`. ([Scope and global](#scope)) |
| `is "[num]+"` fails on text that merely contains a number | `is` / `IS` checks for a **whole-string** match, not a part of the string. | To check only part of a string, use `find`. |
| `set number x to input()` | `input()` always returns a `str`. | Convert it with `DLC:convert`, as in `to_number(input())`. |
| Opening a block and forgetting `end` | Every block (`if`, `loop`, `func`, ...) needs one `end` per opener. | Use the indentation to check that each block is closed exactly once. |

## Known limitations {#limitations}

- **Standard input**: unless live input is available, `input()` consumes the text pre-filled in the stdin panel one line at a time. Once it is used up, `input()` returns an empty string.
- **Network**: in the native `cuffc`, `DLC:network` sends real plain-HTTP requests. In this browser IDE the browser sandbox blocks raw socket access, so requests mostly end in failure (see the DLC list above).
- **File system**: `DLC:filesystem` is available only in the native `cuffc`. In this browser IDE, a `use DLC:filesystem` in any file of the project makes the run refuse to start (see the DLC list above).
- **Recursion depth**: a function call depth over 1,000 stops the run safely with a `StackOverflow` ({{error.StackOverflow}}) runtime error.
- **Execution time limit**: to protect the tab from infinite loops, this IDE caps execution time (8 seconds by default; you can always stop a run yourself).
- Nested function definitions and closures are not supported by the language itself.
- **Async is not concurrency**: `async` functions don't run in parallel on OS threads. It is cooperative scheduling: they run in order after the top-level synchronous code finishes.

## Related links {#resources}

Everything covered here is also available as {{examples.count}} runnable examples in the IDE's **Load an example** menu. We recommend working through them in order, from the basics.

- [cuffscript: engine and CLI source code]({{site.githubUrl}})
- [cuffscript-wasm: npm package](https://www.npmjs.com/package/cuffscript-wasm)
- [CHANGELOG: changes by version]({{site.changelogUrl}})
