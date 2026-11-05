---
group: Error handling
summary: "`or_else`, error objects, `fail` and the error code system"
---

## or_else {#or-else}

Instead of try-catch, you attach `or_else do: ... end` after a statement that might fail. Inside the block you can fill an existing variable with `change` or declare a new one.

```cuff
set number a to 10
set number b to 0
set number result to a / b or_else do:
    print("Division by zero failed, using the default value")
    change result to -1
end
print(f"result = {result}")
```

## Getting the error: or_else as {#error-objects}

`or_else as err do: ... end` gives the handler an `Error` object with `message`, `code`, `line`, `column` and `hint`, for every error the handler can catch.

```cuff
set number n to to_number("abc") or_else as err do:
    print(err.code)
    print(err.message)
    change n to 0
end
print(n)
```

## Raising your own errors {#fail}

`fail "message"` or `fail Error("message")` raises an error of your own program. It is reported as {{error.ProgramError}}, a category that `or_else` can catch. A class that `extends Error` raises its own kind of error, which you test with `isa`, and `fail err` inside a handler raises the same error again for a caller further out.

```cuff
class NotFound extends Error do:
end

func find_user(str name) do:
    if name is not "ann" do:
        fail NotFound(f"no user named {name}")
    end
    return name
end

find_user("bob") or_else as err do:
    if err isa NotFound do:
        print(f"not found: {err.message}")
    else do:
        fail err
    end
end
```

```output
not found: no user named bob
```

## The error code system {#error-codes}

Every error has a unique code (for example {{error.DivisionByZero}}) and belongs to one category. The number between `E` and `-` tells you which stage it came from.

| Code | Category | Recoverable with or_else? |
|---|---|---|
| `E1-xxx` | Lexical (tokenizer) | No |
| `E2-xxx` | Syntax (parser) | No |
| `E3-0xx` | Regex Syntax (pattern compile) | No |
| `E3-1xx` | Regex Runtime (step and time limits, etc.) | Yes |
| `E4-xxx` | Runtime (interpreter) | Yes |
| `E5-xxx` | Module (use/from) | Yes |
| `E6-xxx` | Resource (execution budget exceeded) | No |
| `E7-xxx` | Program (raised with `fail`) | Yes |
| `E9-xxx` | Internal (engine bug) | No |

If the program itself is wrong (a syntax error, say), the error can't appear inside code that is already running, so `or_else` does not catch it. Only "correct code running into a bad situation" (division by zero, a missing file, and so on) can be recovered with `or_else`. `E6` happens only when the CLI's `--max-steps` or `--timeout` execution budget is exceeded (both are off by default). It is a sign that the program has gone out of control, so `or_else` is deliberately designed not to catch it.

{{engine:error-codes}}

A real error looks like this when you run the code below. The source line where the error happened is shown with it, and the `^` points at the exact column (columns count characters, and the `^` stays lined up even after wide or multi-byte characters such as CJK text or emoji).

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

A runtime error that isn't wrapped in `or_else` stops the program on the spot. In this IDE the output panel shows a message like the one above in red, and the run status changes to Error.
