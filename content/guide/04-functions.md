---
group: Functions
summary: Declaring and calling functions, parameters, scope and global, pure and async functions
---

## Defining functions {#functions}

A function is a named block of code that you can run again and again. It starts with `func`, lists its parameters in parentheses, opens its body with `do:` and ends with `end`. A short function fits on one line, as in `func twice(number x) do: return x * 2 end`. A call is the function's name followed by arguments in parentheses, either as a statement on its own line or as part of an expression; a call never uses `do:`.

```cuff
func greet(str name) do:
    print(f"Hello, {name}!")
end

func fib(number n) do:
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
- **Hoisting.** Declarations are processed before the program runs, so a function may be called on a line above the one that declares it. Two functions with the same name at the top level of one file are a syntax error (`DuplicateDeclaration` ({{error.DuplicateDeclaration}})); a module may still bring in a function whose name the program already has. The body of a block may be empty and written on one line for every kind of block (`func later() do: end`).
- **Argument count.** A call must pass at least as many arguments as the function has parameters without a default, and at most as many as it has parameters; otherwise the error is `ArgumentCountMismatch` ({{error.ArgumentCountMismatch}}). There are no variable-length parameter lists.
- **Not values.** A function is not a value: it cannot be stored in a variable, passed to another function, returned or compared. There are no closures. A function that has the name of a built-in function replaces that built-in for the whole program.
- **Recursion.** A function can call itself. Calls may nest only so deep (the call depth is one of the engine's [limits](#limits)), and unbounded recursion stops with `StackOverflow` ({{error.StackOverflow}}).

```cuff
print(double(21))
func double(number x) do: return x * 2 end
```

```output
42
```

## Parameters and their types {#parameters}

A parameter is written `[type] [name]`, and every parameter has a type. The types are `number`, `str`, `boolean`, `list`, `map`, `match`, `pattern`, `object`, `empty`, `any` and the name of a class; `any` takes a value of every type. A parameter is a variable of its function and keeps its type, so a later assignment to it is checked like any other.

A parameter checks its argument when the function is called. A value of another type stops the run on the calling line with `ParameterTypeMismatch` ({{error.ParameterTypeMismatch}}). `empty` is accepted only by `any` and `empty`.

```cuff error=ParameterTypeMismatch
func add_num(number n1, number n2) do:
    print(n1 + n2)
end

add_num(1, 2)
add_num("1", 2)   note: error at the call line, a text is not a number
```

A parameter written `[type] [name] = [value]` has a **default** and becomes optional. Parameters without a default come first. The default is worked out each time the function is called without that argument, in the scope of the function, so it can use the parameters before it, but not a global variable. A default is checked against the parameter's type when it is used, just like an argument.

```cuff
func greet(str name, str word = "Hello", str line = word + ", " + name + "!") do:
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
    number unused = 1
end
print(nothing() is empty)
```

```output
true
```

## Scope and global {#scope}

A **scope** is the set of variables that a piece of code can see. CuffScript scopes by function:

1. The **global scope** holds what the top level of a program declares.
2. A **function scope** is created on every call. It holds the parameters, every name that the body declares (even inside an `if` or a loop), and the names that the body *bridges* with `global`.
3. **`if` and loop bodies do not create a scope.** A name declared in one stays visible in the surrounding scope.
4. An **`or_else` handler** runs in a scope of its own. A new name declared in it is local to the handler, and so is the name given by `or_else as`; an existing name can still be assigned.
5. A **`with` block** has a scope of its own ([Classes and objects](#with)).

The rule that surprises newcomers is that a function does **not** see global variables, not even constants, unless it asks for them. To read or change a variable of the main program, write `global [name]` first (several names can be listed, as in `global a, b`). From that statement to the end of that call, the name means the global variable, whether you read it, assign to it, or use `add`, `remove` and `x[i] = ...` on it. `global` is valid only inside a function. A name that you declare with `set` in the function is a new local that takes precedence over a bridge of the same name.

```cuff
number counter = 0

func bump() do:
    global counter
    counter = counter + 1
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
number counter = 0

func peek() do:
    return counter
end

number seen = peek() or_else do:
    print("counter is not visible here")
    seen = -1
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
number shared_state = 0

pure func double(number x) do:
    return x * 2
end

pure func quad(number x) do:
    return double(double(x))   note: a pure function calling a pure one is fine
end
print(quad(5))   note: 20

func bump() do:
    global shared_state
    shared_state = shared_state + 1
end

pure func broken() do:
    bump()   note: PureFunctionImpureCall, a pure function calls the non-pure bump()
end
```

To lift the restrictions, remove the word `pure`.

## Async functions and tasks {#async}

A call of an `async` function can run as a **task**: a call that goes on by itself while the code that made it continues. Tasks are cooperative and single-threaded. One thing runs at a time, a task runs until it waits or ends, and nothing is interrupted, so there are no threads, no locks and no data races. `async` and `pure` can be combined and go in front of `func` in either order (`async pure func f()`).

- `await f(...)` runs the function to its end right there and gives its value, as the call of any function does.
- `f(...)` **without** `await` starts a task and gives a `Task` value at once. The task does not run yet: it runs when the code that is running waits, or when the program reaches its end. Tasks run in the order in which they started, or began to wait.
- `await t`, where `t` is a `Task`, waits until that task has finished and gives its result. A task's result can be awaited any number of times, and `t.done()` (or `task_done(t)`) tells whether the task has finished.
- Waiting lets the other tasks run. `await` of a task that has not finished waits, and so do `time_sleep` ([`DLC:time`](#dlc-time-random)) and the requests of [`DLC:network`](#dlc-network). Waits overlap, so ten requests made by ten tasks take about as long as the slowest of them, not as long as all of them together.
- The program has ended when its last line has run and every task has finished.

```cuff
use DLC:time

async func brew(str drink, number seconds) do:
    time_sleep(seconds)
    return drink + " is ready"
end

Task tea = brew("tea", 0.2)
Task coffee = brew("coffee", 0.1)
print(tea.done())
print(await coffee)
print(await tea)
```

```output
false
coffee is ready
tea is ready
```

The two waits overlap, so the program takes about 0.2 seconds, not 0.3. A program that never waits runs its tasks after its last line, in the order in which they started:

```cuff
async func notify() do:
    print("[async] done")
end

print("[sync] start")
notify()
print("[sync] end")
```

```output
[sync] start
[sync] end
[async] done
```

`Task` is a built-in class: a variable can be declared `Task`, but a program cannot make one with `Task()`, extend it or declare a class of that name. A module's top level does not run its tasks when it ends; they belong to the program and run when it waits.

**Errors in tasks.** An error in a task is not lost. It is raised at each `await` of the task, where `or_else` can catch it. A call written as a statement of its own (`notify()`) starts a task whose value nothing keeps, so an error in it ends the program, and so does an error in a task that is never awaited when the program reaches its end. An error that `or_else` may not catch (a resource limit) ends the program wherever it happens.

```cuff
async func risky() do:
    fail "network down"
end

Task job = risky()
await job or_else as Error e do:
    print("caught:", e.message)
end
```

```output
caught: network down
```

Tasks that all wait for each other can never go on: that is `TaskDeadlock` ({{error.TaskDeadlock}}), raised where the program waits, and a task cannot wait for itself either. `await` of something that is neither a `Task` nor a call of an `async` function, and `await` of a call of a function that is not `async`, raise `AwaitOnNonAsync` ({{error.AwaitOnNonAsync}}). There are limits on how many tasks exist and how many wait at once.

## Calling a function as a method {#methods}

A built-in or library function whose first argument is the value it works on can also be written as a method of that value: `value.name(other arguments)` runs the function with `value` as its first argument. The method name is the function name without its library prefix: `str_upper(s)` is `s.upper()`, `list_sort(xs)` is `xs.sort()` and `map_keys(m)` is `m.keys()`. The functions `length`, `contains` and `index_of` keep their names, the conversions are `x.to_str()`, `x.to_number()` and `x.to_boolean()`, and the pattern functions are methods too (`text.find(p"[num]+")`). `copy` is a method of lists, maps and objects.

A method needs the library of its function, loaded with `use DLC:...`, just as the function form does. A function without a receiver, such as `math_min`, `random_int`, `time_now`, `file_read` or `network_get`, is not a method. The plain function form always works too, and methods can be chained.

```cuff
use DLC:string, DLC:list

str title = "  hello  "
print(title.trim().upper())
print([3, 1, 2].sort(), "a,b".split(p","), [1, 2, 3].length())
```

```output
HELLO
[1, 2, 3] ["a", "b"] 3
```
