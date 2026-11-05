---
group: Functions
summary: Defining functions, async (async/await), scope and global
---

## Defining functions {#functions}

A function starts with `func` and ends with `end`; when the body fits on one line it can follow `do:` directly. Every function can `return` a value, and one that ends without returning gives `empty`. Calls use only parentheses `()`, with no `do:`, and a function may be called above the line that declares it.

```cuff
func fib(n) do:
    if n <= 1 do:
        return n
    end
    return fib(n - 1) + fib(n - 2)
end
print(f"fib(10) = {fib(10)}")
```

```output
fib(10) = 55
```

Nested function definitions and closures are not supported. Using `func` inside a function raises `NestedFunctionNotSupported` ({{error.NestedFunctionNotSupported}}), so always declare functions at the top level. A function can see only its own local variables; global variables have to be connected as described in [Scope and global](#scope).

Put a type name before a parameter (`number`, `str`, `boolean`, `list`, `map`, `match`, `pattern`, `object` or a class name) and the argument's type is checked when the function is called. Typed and untyped parameters can be mixed, and `empty` is accepted for any type. A wrong type raises `ParameterTypeMismatch` ({{error.ParameterTypeMismatch}}) at the line of the call.

```cuff error=ParameterTypeMismatch
func add_num(number n1, number n2) do:
    print(n1 + n2)
end

add_num(1, 2)
add_num("1", 2)   note: error at the call line, a string is not a number
```

A parameter may also have a default, which is worked out at each call and can use the parameters before it.

```cuff
func greet(str name, str word to "Hello") do:
    return f"{word}, {name}!"
end
print(greet("Ann"))
print(greet("Bob", "Hi"))
```

```output
Hello, Ann!
Hi, Bob!
```

`async` and `pure` go in front of `func`, in either order (`async pure func f()`). A `pure` function can neither read nor write global variables. Even the `global name` bridge is no exception: trying it raises a `PureFunctionGlobalAccess` ({{error.PureFunctionGlobalAccess}}) runtime error right away, and changing a field of an object raises `PureFunctionFieldWrite` ({{error.PureFunctionFieldWrite}}). This restriction **propagates through calls**: a `pure` function can't call a user function that isn't `pure` either, and doing so raises `PureFunctionImpureCall` ({{error.PureFunctionImpureCall}}) immediately. The function being called must be marked `pure` too. (Native functions such as `print` and DLC functions are not affected.)

```cuff
set number shared_state to 0

pure func double(x) do:
    return x * 2
end

pure func quad(x) do:
    return double(double(x))   note: a pure function calling a pure one is fine
end
print(quad(5))   note: 20

func bump() do:
    global shared_state
    change shared_state to shared_state + 1
end

pure func broken() do:
    bump()   note: PureFunctionImpureCall, a pure function calls the non-pure bump()
end
```

## Async (async / await) {#async}

Calling an `async` function without `await` does not run it immediately. It is queued, and runs after all the synchronous top-level code has finished, in the order it was queued (FIFO). Adding `await` runs it right now and gives you its result, if it has one.

```cuff
async func notify() do:
    print("[async] done")
end

async func fetch_score() do:
    return 87
end

print("[sync] start")
notify() note: queued, not run now
set number score to await fetch_score() note: await runs it immediately
print(f"[sync] score = {score}")
print("[sync] end")
note: the queued notify() runs after this point.
```

```output
[sync] start
[sync] score = 87
[sync] end
[async] done
```

## Scope and global {#scope}

A function sees only the variables it creates itself with `set` (and its parameters). To use a global variable, whether to read it or to change it, write `global [name]` before the name is used; several names can be listed, as in `global a, b`. Without that connection the name is an `UndefinedVariable` ({{error.UndefinedVariable}}) error. Other functions and built-in functions such as `print` can be called without any connection.

```cuff
set number counter to 0

func increment() do:
    global counter
    change counter to counter + 1
end

increment()
increment()
print(f"counter = {counter}")
```

```output
counter = 2
```

## Calling a function as a method {#methods}

A library function whose first argument is the value it works on can also be called as a method on that value, without the library prefix: `text.upper()` is `str_upper(text)`, and `scores.sort()` is `list_sort(scores)`. The library still has to be loaded with `use`, and the plain function form keeps working.

```cuff
use DLC:string, DLC:list

set str text to "hello"
print(text.upper())

set list scores to [3, 1, 2]
print(scores.sort())
```

```output
HELLO
[1, 2, 3]
```
