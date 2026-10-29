---
group: Error handling
summary: "`or_else` and the error code system"
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
