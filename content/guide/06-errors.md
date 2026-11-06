---
group: Error handling
summary: Reading error reports, or_else, error objects, fail, the error codes
---

## Reading an error report {#error-report}

When something goes wrong, the engine stops the program and prints a report. A real report looks like this for the code below. It names the error, says where it happened, shows the source line, and puts a `^` under the exact position (columns count characters, and the `^` stays lined up even after wide or multi-byte characters such as CJK text or emoji). For some errors it adds a `hint:` line with a suggestion.

```cuff error=DivisionByZero
set number a to 10
set number b to 0
print(a / b)   note: there is no or_else, so the program stops here and prints the message below
```

```text vars
ERROR: [{{error.DivisionByZero}}] Runtime Error at line 3, column 9: division by zero
    print(a / b)
            ^
```

The tag in brackets, here {{error.DivisionByZero}}, identifies the error: `E`, then a category digit, a dash and a number. A program that ends with an error exits with a non-zero status. In this IDE the output panel shows the report in red and the run status changes to Error. Mistakes in the source itself (a stray character, a space before a colon, an unterminated text, a missing `end`, bad indentation) are found before the program runs; the engine reports them as a syntax error and the message says what is wrong.

## Recovering with or_else {#or-else}

Instead of try-catch, you attach an `or_else` handler after a statement that might fail. It goes on the same line as the last token of the statement, or after the `end` of a block. If the statement finishes normally, the handler is skipped. If it raises an error that can be caught, the handler runs and the program continues after it.

```cuff
set number quantity to to_number("abc") or_else do:
    print("Not a number; using 1.")
    change quantity to 1
end
print(f"quantity = {quantity}")

loop repeat i to 1 ~ 3 do:
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
2. If the failed statement was a declaration, its name is bound to `empty` before the handler runs, so the handler can `change` it.
3. The handler runs in a scope of its own: a new name declared in it is local to the handler, and an existing name can still be changed with `change`.
4. An error raised **inside** the handler is not caught by the same `or_else`.
5. `return` inside a handler returns from the enclosing function, and `stop` ends the enclosing loop.
6. `or_else` guards the one statement it follows. To guard several statements, put them in a function and guard the call.
7. It cannot guard the work of an `async` call that is queued rather than awaited, because that line finished long before the call ran ([Functions](#async)).

Remember that not finding something is usually *not* an error. A failed `find` or `match` gives `empty`, so `or_else` does not run; test for it with `is empty`.

## Getting the error: or_else as {#error-objects}

`or_else as err do: ... end` gives the handler the error as a value, in the variable `err`. Every error that a handler can catch arrives as an object of the built-in class `Error`, with these fields:

| Field | Type | Holds |
|---|---|---|
| `message` | `str` | What went wrong |
| `code` | `str` | The error code, such as the one in the report above |
| `line`, `column` | `number` | Where it happened |
| `hint` | `str` | The engine's suggestion, or an empty text |

```cuff
set number n to to_number("abc") or_else as err do:
    print("failed with", err.code, "at line", err.line)
    print(err.message)
    change n to 0
end
print(n)
```

`Error("text")` creates an error object of your own, and its `to_str()` is the code followed by the message.

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
print(divide(1, 0)) or_else as err do:
    print(err.message)
end
```

```output
2
cannot divide by zero
```

To tell kinds of errors apart, make a class that `extends Error` and test it with `isa`. There is no separate branch for each kind of error; one handler inspects the error and decides. A class of your own can carry extra fields.

```cuff
class ValidationError extends Error do:
    set str field to ""
end

func check_age(number age) do:
    if age < 0 do:
        set ValidationError e to ValidationError("age is negative")
        change e.field to "age"
        fail e
    end
    return age
end

check_age(-1) or_else as err do:
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
