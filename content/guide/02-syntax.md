---
group: Basics
summary: Variables and constants, data types, the colon rule, operators, indexing
---

## Variables and constants {#variables}

The first time you create a value, always write `set [type] [name] to [value]`. To change it afterwards, use `change [name] to [value]`.

```cuff
set number age to 25
set str name to "Alice"
set empty data to empty

change age to 26
change name to "Bob"
```

Constants are declared with `set constant [type] [name] to [value]`. The name must be all upper case (`UPPER_CASE`), and trying to `change` it later is a runtime error.

```cuff
set constant number MAX_RETRIES to 3
set constant str API_URL to "https://cufflang.dev"
```

`constant` also works with `list` and `map`. A constant list is fully read-only, like a Python tuple: adding, removing and index assignment are all runtime errors, and it stays read-only when you assign it to another variable or pass it to a function. The protection is *shallow*, though: a list or map stored inside a constant list can still be changed. A constant map refuses `change CONFIG["key"] to ...` and `remove "key" from CONFIG`, but the map itself is not frozen: another variable that was given the same map can still change it, and the constant then shows that change. Copy it with `map_merge(CONFIG, {})` when you need an independent map.

```cuff error=ConstantReassignment
set constant list PRIMES to [2, 3, 5, 7, 11]

add 13 to PRIMES          note: runtime error, a frozen list can't be added to
change PRIMES[1] to 0     note: also a runtime error
```

```cuff error=ConstantReassignment
set constant map SETTINGS to {"volume": 5}

change SETTINGS["volume"] to 9    note: runtime error, a constant map can't be changed through its name
```

Words such as `add`, `count`, `find`, `split`, `replace`, `match`, `in`, `by`, `not` and `global` can also be used as the names of variables, functions, parameters and loop variables (`set number count to 3`). A word that has its own syntax, like `find`, is treated as syntax only when that syntax follows it, and as an ordinary name otherwise. The exception is `and` and `or`: they are operators, so they can't be used as names.

## Data types {#types}

| Type | Description | Example |
|---|---|---|
| `number` | Integer or decimal | `5`, `3.14` |
| `str` | String | `"hello"` |
| `boolean` | True or false | `true`, `false` |
| `list` | 1-based ordered list | `["a", "b"]` |
| `map` | Dictionary with string keys | `{"k": "v"}` |
| `empty` | No value | `empty` |

Function parameters can be written without a type, and you can add one if you like ([Defining functions](#functions)). An f-string (`f"..."`) embeds expressions in a string, and to print a brace itself you write it twice, as `{{` `}}`.

```cuff
set number x to 5
print(f"x + 1 = {x + 1}")
print(f"JSON-like: {{\"key\": \"value\"}}")
```

## The colon rule and comments {#colon-comments}

To enforce readability at the language level, every colon (`:`) outside a string follows one rule: **never a space before it, a space after it is recommended**. Breaking it is a syntax error from the lexer right away. If the body after `do:` fits on one line, you can add `end` at the end of that line and write a one-line form with no indentation.

A single-line comment is `note: text`. A multi-line comment runs from the line after `note:` up to just before `endnote`.

```cuff
note: a single-line comment
set number x to 10
if x is 10 do: print("Passed") end   note: a trailing comment on the same line works too

note:
This is a multi-line comment area.
Indentation and line breaks are free-form.
endnote
```

```output
Passed
```

## Operators {#operators}

`is` is a normal equality check, and `IS` is a comparison that **ignores English letter case**. `!` flips a boolean.

```cuff
set str input_text to "Apple"

if input_text is "apple" do: print("Not run: the case differs") end
if input_text IS "apple" do: print("Runs because IS ignores case") end

set boolean is_active to false
if !is_active do: print("Runs because ! flips the value") end
```

Combine conditions with `and` and `or` (`&&` and `||` mean the same). The operands can be of any type, and the result is always a `boolean`. When the left side alone decides the result, the right side is not evaluated, so `x is not 0 and 10 / x > 1` never divides by zero.

```cuff
set number age to 30
if age >= 18 and age < 65 do: print("Working age") end
print(age < 18 or age >= 65)

set number x to 0
print(x is not 0 and 10 / x > 1)
```

```output
Working age
false
false
```

`%` is the remainder of a division, and its sign follows the divisor (`-7 % 3` is `2`). `**` is exponentiation and groups from the right (`2 ** 3 ** 2` is `512`, and `-2 ** 2` is `-4`). Both are the same calculations as `math_mod` and `math_pow`, and a remainder by zero is a `DivisionByZero` ({{error.DivisionByZero}}) error.

```cuff
print(7 % 3, -7 % 3, 2 ** 10, 2 ** 3 ** 2, -2 ** 2)
```

```output
1 2 1024 512 -4
```

The binding strength weakens in this order: `**`, unary `-`, `* / %`, `+ -`, comparisons (including `is`), `!`, `and`, `or`. That is why `!x is 3` means `!(x is 3)`.

## Indexing and slicing {#indexing}

The first position of a list or string is **`1`**. Index `0` does not exist, and accessing it is a runtime error. Negative indexes count from the end, so the last item is `-1`. Slices use a tilde, as in `[start~end]`, and include both ends.

```cuff
set list colors to ["red", "green", "blue", "yellow"]

print(colors[1])    note: "red"
print(colors[-1])   note: "yellow"
print(colors[2~3])  note: ["green", "blue"]
```
