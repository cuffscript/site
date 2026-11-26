---
group: Under the hood
summary: "How a program runs, how memory is given back, every limit, and how to read the bytecode"
---

## How a program runs {#how-it-runs}

A program goes through the same four steps every time:

```text
1. Read     the whole text becomes a tree; nothing has run yet
2. Collect  every top-level function, then every class, is put in its table
3. Run      the other top-level statements, one after another, in the order written
4. Finish   the tasks that are still alive run to their end
```

A good deal of what you notice about the language follows from these four steps.

**Step 1 is why a syntax error stops the program before its first line,** even when it is in a function that nobody calls:

```cuff error=UnexpectedToken
print("hello")
func never() do:
    number x =
end
```

`hello` is never printed, because the text is read completely before anything runs.

**Step 2 is why a function can be used above the place where it is written.** Functions and classes are collected before the first statement runs, and a class is built after its parent whatever the order in the file:

```cuff
print(double(4))
func double(number n) do:
    return n * 2
end
```

```output
8
```

A variable is different. `number total = 5` is a statement, not a declaration in this sense: it runs in step 3, when its line is reached, so using the variable above that line is an error ({{error.UndefinedVariable}}):

```cuff error=UndefinedVariable
print(total)
number total = 5
```

**Step 3 runs `use` as the statement it is,** so a module's functions exist from the line of the `use` onwards, not before:

```cuff error=UndefinedFunction
print(half(4))
use half from ./m
```

**Step 4 is the end of the program text, not the end of the process.** Tasks may have run long before it, whenever the program waited. At this point the ones that are still alive run until each has finished ([Async functions and tasks](#async)). If an error ends the run at any step, the tasks that are left are dropped without running any further.

### Compiled as it is reached

Each statement of the top level is compiled to bytecode just before it runs, and a function is compiled the first time it is called. Nothing about *when things happen* changes because of that: a statement still runs when its line is reached, with everything above it done. What it does explain is that a mistake that can only be found by running (an undefined name, a value of the wrong type) is reported when the line that makes it runs, and never for a function that is never called:

```cuff
func never() do:
    return missing_name + 1
end
print("fine")
```

```output
fine
```

## Memory {#memory}

Memory is given back by counting: a list, map or object is freed when the last variable, list or object that holds it lets go of it. Counting alone cannot free a list that holds itself, or two objects that hold each other, because each keeps the other's count above zero.

For those, the engine keeps a record of the lists, maps and objects a run makes. Every so often (after ten thousand new ones at first, then less often while it finds nothing to free) it looks for groups that are held only from inside the group. A group that something outside still holds, a variable or a task or the program that embeds the engine, stays. The rest is emptied, and the counts then fall to zero in the ordinary way.

Two things follow for you:

- **You never free anything yourself,** and a cycle in your data is not a leak. There are no destructors either: nothing of your program runs when a value is freed.
- **The search never frees something in use.** A reference that the engine cannot see counts as one from outside, so the worst that can happen is that a cycle stays a little longer. That is why it can run in the middle of a program.

A program that embeds the engine can run the search at a moment of its choosing, or switch it off ([the `collectCycles` option](#embedding-cpp)). When memory really does run out, the run ends with {{error.OutOfMemory}} and the engine can be used again.

## Limits {#limits}

A script can be written by anyone, so everything a program can make unboundedly large or deep has a limit, and **exceeding one is never a crash: it is an ordinary error** with a code. A script can handle it with `or_else` where the error can be caught. These are the engine's default values; every one of them is read from the engine's documentation when the site is updated.

{{engine:limits}}

Two more limits are off until the person running the script sets them: the number of **steps** (a step is one loop pass or one function call) with `--max-steps`, and the **time** with `--timeout`, both in `cuffc` and as options of an embedded engine ([Before you ship](#embedding-safety)). They end a run with {{error.ExecutionStepLimit}} and {{error.ExecutionTimeout}}, which `or_else` cannot catch: the budget is the decision of whoever runs the program, not of the program.

### Calls and the stack

The calls of a program do not use the computer's own stack. A call takes a frame in the engine's bytecode machine, so the **call depth** limit ends runaway recursion at the same depth whatever the function looks like:

```cuff error=StackOverflow
func down(number n) do:
    return down(n + 1)
end
down(1)
```

The report ends with the calls that led to it, and shows the repeated call once with its count ([Backtraces](#backtraces)). A separate **stack budget** guards the work that nests inside the engine itself, such as an object's `to_str` that shows another object, or a default value that makes another object. Both end in the same error, {{error.StackOverflow}}.

## Reading the bytecode {#bytecode}

**View bytecode** in the IDE, `cuffc --bytecode` and `mod.cuffBytecode()` in the browser module all print the same thing: every piece of code at the moment the engine compiles it, in order with the program's own output. Take this program:

```cuff
func total(list prices, number tax = 10) do:
    number sum = 0
    loop each number price in prices do:
        if price < 0 do:
            skip
        end
        sum = sum + price
    end
    return sum + sum * tax / 100
end

number shown = total([120, -5, 80])
print(f"total: {shown}")
```

```output
total: 220
```

The listing it produces (shortened to what matters here):

```text
== statement, line 12: 5 registers ==
     0  LoadK       r1 120
     1  LoadK       r2 -5
     2  LoadK       r3 80
     3  NewList     r0 r1 3
     4  Call        r0 1  ; total
     5  ChkDecl     r0  must be number
     6  DeclG       g0 r0 [number]  takes
     7  RetNil
== function total, line 1: 8 registers, 2 parameters ==
     0  ArgJmp      1 ->3
     1  LoadK       r1 10
     2  DefChk      r1 1  must be number
     3  LoadK       r2 0
     4  EachPrep    r4 r0
     5  EachNext    r4 r3 ->10  must be number
     6  JLtK        r3 0 ->8  if false
     7  Jmp         ->5
     8  Add         r2 r2 r3
     9  Jmp         ->5
    10  Mul         r4 r2 r1
    11  DivK        r4 r4 100
    12  Add         r4 r2 r4
    13  Ret         r4
    14  RetNil
```

How to read it:

- **Each heading is one piece of code.** A statement of the top level is compiled just before it runs, a function the first time it is called, so `total` is listed *after* the statement that calls it, because that call is what compiled it. A function that is never called never appears.
- **`r` is a register,** one of the numbered slots a running piece of code keeps its values in. Every variable a function declares has a register of its own for the whole call, and the rest hold the operands of the expression being worked out. `g` is a variable of the top level, `->` the instruction a jump goes to, and a bare number or text a constant. A name after `;` is what the instruction refers to.
- **The word at the start of a line is the operation.** `LoadK` puts a constant in a register, `NewList` makes a list from consecutive registers, `Call` calls a function by name (its arguments are the registers from `r`, and the result replaces the first of them), `Add` `Mul` `DivK` are arithmetic (a `K` means a constant on the right, as in `/ 100`), `Ret` returns a value and `RetNil` returns `empty`.
- **Loops and conditions are jumps.** `EachPrep` takes what `loop each` walks and `EachNext` hands out one element, or jumps to the end; `JLtK r3 0 ->8 if false` compares and jumps in one instruction, which is the `if price < 0` of the program. `skip` became the `Jmp ->5` back to `EachNext`.
- **Words at the end of a line are flags:** a type to check (`must be number`), or the sense of a jump.
- **`ChkDecl` and `DefChk` are where a value is checked against a declared type.** `DeclG` declares the top-level variable `shown`.

The exact instructions change from one engine version to the next; the way of reading them does not. The complete instruction set, with what each operand means, is in the [engine's own notes on the bytecode machine]({{site.blobUrl}}/docs/internals/bytecode.md).
