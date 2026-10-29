---
group: Functions
summary: Defining functions, async (async/await), scope and global
---

## Defining functions {#functions}

Functions also start with `set`. The one-line shorthand is not allowed: a function is always written as an indented block. To return a value, add `returnable` and use `return`. Calls use only parentheses `()`, with no `do:`.

```cuff
set returnable func fib(n) do:
    if n <= 1 do:
        return n
    end
    return fib(n - 1) + fib(n - 2)
end
print(f"fib(10) = {fib(10)}")
```

Nested function definitions and closures are not supported. Using `set func` inside a function raises `NestedFunctionNotSupported` ({{error.NestedFunctionNotSupported}}), so always define functions at the top level. A function can see only its own local variables; global variables have to be connected as described in [Scope and global](#scope).

Put one of `number`, `str`, `boolean`, `list`, `map` or `match` before a parameter and the argument's type is checked when the function is called. Typed and untyped parameters can be mixed, and `empty` is accepted for any type. A wrong type raises `ParameterTypeMismatch` ({{error.ParameterTypeMismatch}}) at the line of the call.

```cuff error=ParameterTypeMismatch
set func add_num(number n1, number n2) do:
    print(n1 + n2)
end

add_num(1, 2)
add_num("1", 2)   note: error at the call line, a string is not a number
```

The three modifiers `returnable`, `async` and `pure` can be combined freely, in any order. A `pure` function can neither read nor write global variables. Even the `change name to global` bridge is no exception: trying it raises a `PureFunctionGlobalAccess` ({{error.PureFunctionGlobalAccess}}) runtime error right away. This restriction **propagates through calls**: a `pure` function can't call a user function that isn't `pure` either, and doing so raises `PureFunctionImpureCall` ({{error.PureFunctionImpureCall}}) immediately. The function being called must be marked `pure` too. (Native functions such as `print` and DLC functions are not affected.)

```cuff
set number shared_state to 0

set pure returnable func double(x) do:
    return x * 2
end

set pure returnable func quad(x) do:
    return double(double(x))   note: a pure function calling a pure one is fine
end
print(quad(5))   note: 20

set func bump() do:
    change shared_state to global
    change shared_state to shared_state + 1
end

set pure func broken() do:
    bump()   note: PureFunctionImpureCall, a pure function calls the non-pure bump()
end
```

## Async (async / await) {#async}

Calling an `async` function without `await` does not run it immediately. It is queued, and runs after all the synchronous top-level code has finished, in the order it was queued (FIFO). Adding `await` runs it right now and gives you its result, if it has one.

```cuff
set async func notify() do:
    print("[async] done")
end

set async returnable func fetch_score() do:
    return 87
end

print("[sync] start")
notify() note: queued, not run now
set number score to await fetch_score() note: await runs it immediately
print(f"[sync] score = {score}")
print("[sync] end")
note: the queued notify() runs after this point.
```

## Scope and global {#scope}

A function sees only the variables it creates itself with `set` (and its parameters). To use a global variable, whether to read it or to change it, first connect it with `change [name] to global`. Without that connection the name is an `UndefinedVariable` ({{error.UndefinedVariable}}) error. Other functions and built-in functions such as `print` can be called without any connection.

```cuff
set number counter to 0

set func increment() do:
    change counter to global
    change counter to counter + 1
end

increment()
increment()
print(f"counter = {counter}")
```
