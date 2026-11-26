---
group: Reference
summary: Common mistakes, known limitations, related links
---

## Common mistakes {#common-mistakes}

| Mistake | Why it's a problem | How to fix it |
|---|---|---|
| `list[0]` | Indexes start at `1`. `0` is not a valid position. | The first element is `list[1]`. |
| `if x is 5 do :` | A space before a colon is a syntax error. | Attach the colon to the word before it, as in `do:`. |
| `x == 5` or `x != 5` | CuffScript has no `==` or `!=`. | Write `x is 5` and `x is not 5`. |
| `constant number retries = 3` | The constant name isn't all upper case. | Write it in capitals, like `RETRIES`. |
| Assigning to a constant | A constant can't be changed after it is declared. | If the value needs to change, declare it without `constant`. |
| Reading or assigning a global variable directly inside a function | A function sees only its own local variables. | Connect it first with `global name`. ([Scope and global](#scope)) |
| `code is "[num]4"` to test a pattern | `is` only compares values, so this compares with that exact text and is false. | Use `code matches p"[num]4"`. To check only part of a text, use `find(text, p"...")`. |
| Expecting `or_else` to run when `find` finds nothing | A failed `find` or `match` is not an error; it gives `empty`. | Test the result with `is empty`. |
| `remove 2 from items` to delete the second element | `remove` takes a **value**, so this removes the first element that equals `2` (an error when there is none). | Use `remove at 2 from items` to remove by position. |
| `loop repeat number i = 1 ~ length(items)` over a list that may be empty | A range is never empty, so it still runs twice. | Use `loop each item in items do:`. |
| `0.1 + 0.2 is 0.3` | Decimal fractions are not exact. | Round both sides first with `math_round`. |
| `number x = input()` | `input()` always returns a `str`, and a variable keeps its declared type. | Convert it with `to_number(input())`. |
| Storing a value of another type in a variable (`number n = 1`, then `n = "one"`) | A variable keeps the type it was declared with. | Declare it `any` when it has to hold different types. |
| Declaring a name twice in one function | A name is declared once; the second declaration is a syntax error. | Assign to the first variable: `total = 2`. |
| `func f(a)` with a parameter that has no type | Every parameter has a type. | Write `func f(any a)`. |
| Opening a block and forgetting `end` | Every block (`if`, `loop`, `func`, `class`, `with`, ...) needs one `end` per opener. | Use the indentation to check that each block is closed exactly once. |
| A variable or function named `each`, `class`, `with`, ... | Reserved words can't be names. | Rename it, for example `each_`. ([Names and reserved words](#names)) |

## Known limitations {#limitations}

- **The language is small on purpose.** There are no closures and no function values (a function cannot be stored, passed or returned), no `==` or `!=` (equality is `is`), and no multiple inheritance. Nested function definitions are not allowed.
- **Text cannot be changed in place.** Build a new text with `+` and a slice instead.
- **Standard input**: unless live input is available, `input()` consumes the text pre-filled in the stdin panel one line at a time. Once it is used up, `input()` returns an empty string.
- **Network**: in the native `cuffc`, `DLC:network` sends real plain-HTTP requests. In this browser IDE the browser sandbox blocks raw socket access, so requests mostly end in failure ([Modules and libraries](#dlc-network)).
- **File system**: `DLC:filesystem` is available only in the native `cuffc`. In this browser IDE, a `use DLC:filesystem` in any file of the project makes the run refuse to start ([Modules and libraries](#dlc-filesystem)).
- **Recursion depth**: only so many calls may be active at once, and a deeper recursion stops the run safely with a `StackOverflow` ({{error.StackOverflow}}) runtime error. This is one of the engine's limits, all listed in [Limits](#limits).
- **Execution time limit**: to protect the tab from infinite loops, this IDE caps execution time (8 seconds by default; you can always stop a run yourself).
- **Tasks are not threads**: one thing runs at a time, and a task that never waits holds up all the others. `async` makes waiting cheap; it does not make a calculation faster.

## Related links {#resources}

Everything covered here is also available as {{examples.count}} runnable examples in the IDE's **Load an example** menu. We recommend working through them in order, from the basics.

- [cuffscript: engine and CLI source code]({{site.githubUrl}})
- [cuffscript-wasm: npm package](https://www.npmjs.com/package/cuffscript-wasm)
- [CHANGELOG: changes by version]({{site.changelogUrl}})
- [Error reference](/errors/): look up what any error code means and how to fix it
