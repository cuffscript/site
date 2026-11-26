---
group: Error handling
summary: Reading error reports, or_else, error objects, fail, the error codes
---

## Reading an error report {#error-report}

When something goes wrong, the engine stops the program and prints a report. A real report looks like this for the code below. The first line names the error and says where it happened. Under it comes the numbered source line, with `^` marks under the part of the line that the error is about (one `^` for a single character such as `/`, and one for each character of a name, a number or a text) and the message written beside the marks. Columns count characters, and the marks stay lined up even after wide or multi-byte characters such as CJK text or emoji. For some errors a `hint:` with a suggestion follows after a blank line.

```cuff error=DivisionByZero
number a = 10
number b = 0
print(a / b)   note: there is no or_else, so the program stops here and prints the message below
```

```text vars
ERROR: [{{error.DivisionByZero}}] Runtime Error at line 3, column 9
  |
3 | print(a / b)
  |         ^ division by zero
```

The tag in brackets, here {{error.DivisionByZero}}, identifies the error: `E`, then a category digit, a dash and a number. A program that ends with an error exits with a non-zero status. In this IDE the output panel shows the report in red and the run status changes to Error. Mistakes in the source itself (a stray character, a space before a colon, an unterminated text, a missing `end`, bad indentation) are found before the program runs; the engine reports them as a syntax error and the message says what is wrong.

## Backtraces: the calls that led there {#backtraces}

When the error happens inside a function, the report also lists the calls that led to it. The line `in divide, called from:` names the function where the error happened, and each line under it is one call, innermost first, with the line of the call and the function it was written in. The last line is the call at the top level of the program.

```cuff error=DivisionByZero
func divide(number a, number b) do:
    return a / b
end
func average(list xs) do:
    number total = 0
    loop each number x in xs do:
        total = total + x
    end
    return divide(total, length(xs))
end
print(average([]))
```

```text vars
ERROR: [{{error.DivisionByZero}}] Runtime Error at line 2, column 14
  |
2 |     return a / b
  |              ^ division by zero

  in divide, called from:
    line 9 in average: return divide(total, length(xs))
    line 11: print(average([]))
```

Read it from the top: the division on line 2 failed, `divide` was called from line 9 inside `average`, and `average` was called from line 11 at the top level. The rules for how a call is shown:

- A method is written `Class.method`. A function that comes from a module is written with its file, for example `half ('./m/half.cuff')`.
- A function that calls itself is shown once, with a count instead of one line per call: `line 5 in count_down: return count_down(n - 1) (and 4 more times)`. When the error is raised by that repeated call itself, as in runaway recursion, the count is the number of calls: `line 2 in down: return down(n + 1) (999 times)`.
- After the first 30 calls only the last 10 are kept, and a line such as `... 961 more calls` says how many were left out between them.
- An error at the top level has no backtrace, because no call led to it.
- An error inside a task goes on from the `await` that received it ([Async functions and tasks](#async)).
- An error raised again with `fail err` keeps the calls it first came out of, and goes on from the `fail`.

## Recovering with or_else {#or-else}

Instead of try-catch, you attach an `or_else` handler after a statement that might fail. It goes on the same line as the last token of the statement, or after the `end` of a block. If the statement finishes normally, the handler is skipped. If it raises an error that can be caught, the handler runs and the program continues after it.

```cuff
number quantity = to_number("abc") or_else do:
    print("Not a number; using 1.")
    quantity = 1
end
print(f"quantity = {quantity}")

loop repeat number i = 1 ~ 3 do:
    print(10 / (i - 2)) or_else do:
        print("skipped a division by zero")
    end
end
```

```output
Not a number; using 1.
quantity = 1
-10
skipped a division by zero
10
```

The exact rules are:

1. Whatever the statement did before the error stays done: changes to variables, output already printed and calls already made are not undone.
2. If the failed statement was a declaration, its name is bound to `empty` before the handler runs, so the handler can assign it. The variable keeps its declared type, and an assignment is checked against it; if the handler does not assign it, it holds `empty`, the one case where a variable holds a value that its type does not accept.
3. The handler runs in a scope of its own: a new name declared in it is local to the handler, and an existing name can still be assigned.
4. An error raised **inside** the handler is not caught by the same `or_else`.
5. `return` inside a handler returns from the enclosing function, and `stop` ends the enclosing loop.
6. `or_else` guards the one statement it follows. To guard several statements, put them in a function and guard the call.
7. It cannot catch an error of an `async` call that is not awaited, because the call has not run yet when that line finishes. Keep the `Task` and put `or_else` on the `await` instead ([Async functions and tasks](#async)).

Remember that not finding something is usually *not* an error. A failed `find` or `match` gives `empty`, so `or_else` does not run; test for it with `is empty`.

## Getting the error: or_else as {#error-objects}

`or_else as Error err do: ... end` gives the handler the error as a value, in a variable that is declared right there with a type (`Error`, a class that extends `Error`, `object` or `any`). Every error that a handler can catch arrives as an object of the built-in class `Error`, with these fields:

| Field | Type | Holds |
|---|---|---|
| `message` | `str` | What went wrong |
| `code` | `str` | The error code, such as the one in the report above |
| `line`, `column` | `number` | Where it happened |
| `hint` | `str` | The engine's suggestion, or an empty text |
| `backtrace` | `list` | The calls the error came out of, innermost first (see below). Empty for an error that was never raised |

```cuff
number n = to_number("abc") or_else as Error err do:
    print("failed with", err.code, "at line", err.line)
    print(err.message)
    n = 0
end
print(n)
```

`Error("text")` creates an error object of your own, and its `to_str()` is the code followed by the message.

`err.backtrace` holds the same calls as the report in [Backtraces](#backtraces): a list with one map per call, innermost first. Each map has `function` (empty at the top level), `file` (empty for the program itself), `line`, `column`, and `repeated`, the number of times more that the same call follows it.

```cuff
class Account do:
    number balance = 0
    func withdraw(number amount) do:
        if amount > balance do:
            fail "insufficient funds"
        end
        balance = balance - amount
    end
end
func pay(Account a, number n) do:
    a.withdraw(n)
end
Account acc = Account()
pay(acc, 5) or_else as Error err do:
    loop each map call in err.backtrace do:
        print(call["function"], call["line"])
    end
end
```

```output
Account.withdraw 4
pay 11
 14
```

The last line is the top-level call: its `function` is empty, so only the line number shows.

## Raising your own errors {#fail}

`fail value` raises an error from your program. The value is an `Error` object, or a text, which becomes `Error(text)`. The error belongs to the category `E7` ("program errors"), reported as {{error.ProgramError}}, and it is caught like any error the engine raises. If nothing catches it, the program stops with a report. Inside a handler, `fail err` raises the same error again for a caller further out, and the error keeps its class on the way.

```cuff
func divide(number a, number b) do:
    if b is 0 do:
        fail "cannot divide by zero"
    end
    return a / b
end

print(divide(6, 3))
print(divide(1, 0)) or_else as Error err do:
    print(err.message)
end
```

```output
2
cannot divide by zero
```

To tell kinds of errors apart, make a class that `extends Error` and test it with `isa`. There is no separate branch for each kind of error; one handler inspects the error and decides. A class of your own can carry extra fields, but it cannot declare a field that `Error` already has (`message`, `code`, `line`, `column`, `hint` or `backtrace`): that is an error ({{error.DuplicateMember}}).

```cuff
class ValidationError extends Error do:
    str field = ""
end

func check_age(number age) do:
    if age < 0 do:
        ValidationError e = ValidationError("age is negative")
        e.field = "age"
        fail e
    end
    return age
end

check_age(-1) or_else as Error err do:
    if err isa ValidationError do:
        print(f"bad {err.field}: {err.message}")
    else do:
        fail err
    end
end
```

```output
bad age: age is negative
```

## Which errors can be caught {#error-codes}

An error code is made of a category and a number. The category tells you which stage produced the error, and whether `or_else` can recover from it:

| Code | Category | Caught by or_else? |
|---|---|---|
| `E1-xxx` | Lexical (tokenizer) | No |
| `E2-xxx` | Syntax (parser) | No |
| `E3-0xx` | Pattern syntax (compiling a pattern) | No |
| `E3-1xx` | Pattern runtime (step and time limits, etc.) | Yes |
| `E4-xxx` | Runtime (interpreter) | Yes |
| `E5-xxx` | Modules and libraries (use/from) | Yes |
| `E6-xxx` | Resource limits (steps, time, memory) | No |
| `E7-xxx` | Program errors (raised with `fail`) | Yes |
| `E9-xxx` | Internal (engine bug) | No |

If the program itself is wrong (a syntax error, say), the error cannot appear inside code that is already running, so `or_else` does not catch it. Only "correct code running into a bad situation", such as division by zero, a missing file or a bad value, can be recovered with `or_else`. `E6` happens only when the CLI's `--max-steps` or `--timeout` execution budget is exceeded (both are off by default); it is a sign that the program has gone out of control, so `or_else` is deliberately designed not to catch it.

{{engine:error-codes}}
