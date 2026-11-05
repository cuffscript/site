---
group: Reference
summary: Common mistakes, known limitations, coming from 3.x, related links
---

## Common mistakes {#common-mistakes}

| Mistake | Why it's a problem | How to fix it |
|---|---|---|
| `list[0]` | Indexes start at `1`. `0` is not a valid position. | The first element is `list[1]`. |
| `if x is 5 do :` | A space before a colon is a syntax error. | Attach the colon to the word before it, as in `do:`. |
| `set constant number retries to 3` | The constant name isn't all upper case. | Write it in capitals, like `RETRIES`. |
| Changing a constant with `change` | A constant can't be changed after it is declared. | If the value needs to change, declare it without `constant`. |
| Reading or `change`-ing a global variable directly inside a function | A function sees only its own local variables. | Connect it first with `global name`. ([Scope and global](#scope)) |
| `code is "[num]4"` to test a pattern | `is` only compares values, so this compares with that exact text and is false. | Use `code matches p"[num]4"`. To check only part of a string, use `find(text, p"...")`. |
| `set number x to input()` | `input()` always returns a `str`. | Convert it with `to_number(input())`. |
| Opening a block and forgetting `end` | Every block (`if`, `loop`, `func`, `class`, ...) needs one `end` per opener. | Use the indentation to check that each block is closed exactly once. |
| A variable or function named `each`, `class`, `with`, ... | Reserved words can't be names. | Rename it, for example `each_`. ([Variables and constants](#variables)) |

## Known limitations {#limitations}

- **Standard input**: unless live input is available, `input()` consumes the text pre-filled in the stdin panel one line at a time. Once it is used up, `input()` returns an empty string.
- **Network**: in the native `cuffc`, `DLC:network` sends real plain-HTTP requests. In this browser IDE the browser sandbox blocks raw socket access, so requests mostly end in failure (see the DLC list above).
- **File system**: `DLC:filesystem` is available only in the native `cuffc`. In this browser IDE, a `use DLC:filesystem` in any file of the project makes the run refuse to start (see the DLC list above).
- **Recursion depth**: a function call depth over 1,000 stops the run safely with a `StackOverflow` ({{error.StackOverflow}}) runtime error.
- **Execution time limit**: to protect the tab from infinite loops, this IDE caps execution time (8 seconds by default; you can always stop a run yourself).
- Nested function definitions and closures are not supported by the language itself.
- **Async is not concurrency**: `async` functions don't run in parallel on OS threads. It is cooperative scheduling: they run in order after the top-level synchronous code finishes.

## Coming from 3.x {#migrating}

Version 4.0.0 cleaned up the syntax. Every form that was removed is a syntax error ({{error.UnexpectedToken}}) whose hint says what to write instead, so an old program stops with a message rather than quietly meaning something else. The one exception worth searching for is `add X to NAME[i]` and `remove X from NAME[i]`: they now act on the element `NAME[i]`, not on `NAME`.

| 3.x | 4.0.0 |
|---|---|
| `set returnable func f(a) do:` | `func f(a) do:` |
| `set async pure returnable func f()` | `async pure func f()` |
| `change total to global` | `global total` |
| `replace items[2] to "x"` | `change items[2] to "x"` |
| `add 5 to grid[1]` (added to `grid`) | `add 5 to grid[1]` (adds to the inner list) |
| `if code is "[num]4" do:` | `if code matches p"[num]4" do:` |
| `if answer IS "yes" do:` | `if answer matches p"yes"i do:` |
| `find "[num]+" from text` | `find(text, p"[num]+")` |
| `find "[num]+" from text g` | `find_all(text, p"[num]+")` |
| `match text from "(a)(b)"` | `match(text, p"(a)(b)")` |
| `replace "a" in text to "b" g` | `replace_all(text, p"a", "b")` |
| `split text by "[sp]+"` | `split(text, p"[sp]+")` |
| `count "a" in text i` | `count(text, p"a"i)` |
| `a && b`, `a \|\| b` | `a and b`, `a or b` |
| A variable named `each`, `skip`, `with`, ... | The same name with a trailing underscore, or another name |
| `loop repeat i to 1 ~ length(items)` | `loop each item in items do:` |

## Related links {#resources}

Everything covered here is also available as {{examples.count}} runnable examples in the IDE's **Load an example** menu. We recommend working through them in order, from the basics.

- [cuffscript: engine and CLI source code]({{site.githubUrl}})
- [cuffscript-wasm: npm package](https://www.npmjs.com/package/cuffscript-wasm)
- [CHANGELOG: changes by version]({{site.changelogUrl}})
