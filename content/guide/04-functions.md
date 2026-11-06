---
group: Functions
summary: Declaring and calling functions, parameters, scope and global, pure and async functions
---

## Defining functions {#functions}

A function is a named block of code that you can run again and again. It starts with `func`, lists its parameters in parentheses, opens its body with `do:` and ends with `end`. There is no `set` in front. A short function fits on one line, as in `func twice(x) do: return x * 2 end`. A call is the function's name followed by arguments in parentheses, either as a statement on its own line or as part of an expression; a call never uses `do:`.

```cuff
func greet(name) do:
    print(f"Hello, {name}!")
end

func fib(n) do:
    if n <= 1 do:
        return n
    end
    return fib(n - 1) + fib(n - 2)
end

greet("Ann")
print(f"fib(10) = {fib(10)}")
```

```output
Hello, Ann!
fib(10) = 55
```

These are the rules for declaring and calling:

- **Where.** Functions are declared at the top level of a program or module, or in a block of it (an `if`, say). Declaring one inside another function or a method raises `NestedFunctionNotSupported` ({{error.NestedFunctionNotSupported}}), so always declare functions at the top level.
- **Hoisting.** Declarations are processed before the program runs, so a function may be called on a line above the one that declares it. If a name is declared more than once, the last declaration in the file is the one every call uses.
- **Argument count.** A call must pass at least as many arguments as the function has parameters without a default, and at most as many as it has parameters; otherwise the error is `ArgumentCountMismatch` ({{error.ArgumentCountMismatch}}). There are no variable-length parameter lists.
- **Not values.** A function is not a value: it cannot be stored in a variable, passed to another function, returned or compared. There are no closures. A function that has the name of a built-in function replaces that built-in for the whole program.
- **Recursion.** A function can call itself. Calls may nest only so deep (1,000 levels), and unbounded recursion stops with `StackOverflow` ({{error.StackOverflow}}).

```cuff
print(double(21))
func double(x) do: return x * 2 end
```

```output
42
```

## Parameters and their types {#parameters}

A parameter is written `name` or `type name`. The types are `number`, `str`, `boolean`, `list`, `map`, `match`, `pattern`, `object` and the name of a class, and typed and untyped parameters may be mixed in one list. A word on its own is always a name: `f(list)` has a parameter called `list`, and `f(list items)` has a parameter called `items` of type `list`.

A typed parameter checks its argument when the function is called. A value of another type stops the run on the calling line with `ParameterTypeMismatch` ({{error.ParameterTypeMismatch}}). `empty` is accepted by every type.

```cuff error=ParameterTypeMismatch
func add_num(number n1, number n2) do:
    print(n1 + n2)
end

add_num(1, 2)
add_num("1", 2)   note: error at the call line, a text is not a number
```

A parameter written `name to [value]` has a **default** and becomes optional. Parameters without a default come first. The default is worked out each time the function is called without that argument, in the scope of the function, so it can use the parameters before it, but not a global variable. A default is checked against the parameter's type when it is used, just like an argument.

```cuff
func greet(str name, str word to "Hello", str line to word + ", " + name + "!") do:
    return line
end
print(greet("Ann"))
print(greet("Bob", "Hi"))
print(greet("Cy", "Yo", "custom line"))
```

```output
Hello, Ann!
Hi, Bob!
custom line
```

## Returning values {#returning}

`return [value]` ends the call and hands the value to the caller. A bare `return`, and a function body that ends without one, both give `empty`. A `return` outside any function is an error.

```cuff
func nothing() do:
    set number unused to 1
end
print(nothing() is empty)
```

```output
true
```

## Scope and global {#scope}

A **scope** is the set of variables that a piece of code can see. CuffScript scopes by function:

1. The **global scope** holds what the top level of a program declares.
2. A **function scope** is created on every call. It holds the parameters, every name that the body declares with `set` (even inside an `if` or a loop), and the names that the body *bridges* with `global`.
3. **`if` and loop bodies do not create a scope.** A name declared in one stays visible in the surrounding scope.
4. An **`or_else` handler** runs in a scope of its own. A new name declared in it is local to the handler, and so is the name given by `or_else as`; an existing name can still be changed with `change`.
5. A **`with` block** has a scope of its own ([Classes and objects](#with)).

The rule that surprises newcomers is that a function does **not** see global variables, not even constants, unless it asks for them. To read or change a variable of the main program, write `global [name]` first (several names can be listed, as in `global a, b`). From that statement to the end of that call, the name means the global variable, whether you read it, `change` it, or use `add`, `remove` and `change x[i]` on it. `global` is valid only inside a function. A name that you declare with `set` in the function is a new local that takes precedence over a bridge of the same name.

```cuff
set number counter to 0

func bump() do:
    global counter
    change counter to counter + 1
end

bump()
bump()
print(counter)
```

```output
2
```

Without the bridge, the name is simply not visible, and the error can be caught like any other:

```cuff
set number counter to 0

func peek() do:
    return counter
end

set number seen to peek() or_else do:
    print("counter is not visible here")
    change seen to -1
end
print(seen)
```

```output
counter is not visible here
-1
```

Functions are the exception to the rule: every function can be called from any other function without a bridge. Functions and classes from a module are available to the whole program, and the top-level variables of a module are copied into the scope that loaded it ([Modules and libraries](#modules)).

## Pure functions {#pure}

Put `pure` in front of `func` to promise that a function does not touch the outside world. A `pure` function may use its parameters, its own locals, and the built-in and library functions, and nothing else:

- Reading, changing or bridging a global variable raises `PureFunctionGlobalAccess` ({{error.PureFunctionGlobalAccess}}).
- Calling a user function that is not itself `pure` raises `PureFunctionImpureCall` ({{error.PureFunctionImpureCall}}). A pure function may call itself and other pure functions. The second rule is what keeps a pure function pure; otherwise it could reach a global by calling an ordinary helper.
- A pure method of a class may read the fields of `self`, but changing a field raises `PureFunctionFieldWrite` ({{error.PureFunctionFieldWrite}}).

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

To lift the restrictions, remove the word `pure`.

## Async functions {#async}

An `async` function is a function whose calls are **queued** instead of run on the spot. CuffScript's `async` is cooperative and single-threaded: nothing ever runs in parallel, and `async` only changes *when* a call runs.

- A call to an `async` function without `await` does not run it now. The call is put in a queue and returns `empty` at once. After all the top-level code of the program has finished, the queued calls run, once each, in the order they were queued. Their return values cannot be seen. A queued function may queue further calls, and they run in the same pass.
- `await f(...)` runs the function to completion right there and gives its result.
- `await` on a function that is not `async` raises `AwaitOnNonAsync` ({{error.AwaitOnNonAsync}}).
- An error raised by a queued call stops the program, and the calls queued after it do not run. An `or_else` written on the line that queued the call cannot catch it, because that line finished long before.

`async` and `pure` can be combined and go in front of `func` in either order (`async pure func f()`).

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

## Calling a function as a method {#methods}

A built-in or library function whose first argument is the value it works on can also be written as a method of that value: `value.name(other arguments)` runs the function with `value` as its first argument. The method name is the function name without its library prefix: `str_upper(s)` is `s.upper()`, `list_sort(xs)` is `xs.sort()` and `map_keys(m)` is `m.keys()`. The functions `length`, `contains` and `index_of` keep their names, the conversions are `x.to_str()`, `x.to_number()` and `x.to_boolean()`, and the pattern functions are methods too (`text.find(p"[num]+")`). `copy` is a method of lists, maps and objects.

A method needs the library of its function, loaded with `use DLC:...`, just as the function form does. A function without a receiver, such as `math_min`, `random_int`, `time_now`, `file_read` or `network_get`, is not a method. The plain function form always works too, and methods can be chained.

```cuff
use DLC:string, DLC:list

set str title to "  hello  "
print(title.trim().upper())
print([3, 1, 2].sort(), "a,b".split(p","), [1, 2, 3].length())
```

```output
HELLO
[1, 2, 3] ["a", "b"] 3
```
