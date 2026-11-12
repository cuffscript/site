---
group: Basics
summary: Values and types, variables and constants, text, operators, indexing, comments
---

## Lines, blocks and indentation {#blocks}

A statement is written on one line. The only exception is inside brackets: the elements of a list or map and the arguments of a call may continue over several lines between the opening and the closing bracket, and a list or map may end with a trailing comma. A line cannot end in the middle of an expression, so `number x = 1 +` is a syntax error.

A statement that owns a block (`if`, `loop`, `func`, `class`, `with` and the `or_else` handler) ends its header line with `do:`, holds a body of further statements, and is closed by its own `end`. A missing or surplus `end` is a syntax error. Write each body line one level deeper than its header, and every line of the body at the same level. You can indent with spaces or tabs (a tab counts as four columns), but keep to one style within a file. The engine enforces this: a body written on its own lines that is not indented is a syntax error, and so is a line indented deeper than the rest of its body ("unexpected indentation") or one that returns to a level that no enclosing block uses ("inconsistent indentation"). `end` still closes the block; indentation alone does not. An empty body needs no indentation, because `end` (or `else`) may follow the `do:` line directly. Blank lines are ignored.

```cuff error=UnexpectedToken
if true do:
print("not indented")   note: the body must be one level deeper than the header
end
```

When a block's body and its `end` fit on the header's line, no indentation is needed. This one-line form is convenient for short bodies:

```cuff
number x = 10
if x is 10 do: print("ten") end
func twice(number n) do: return n * 2 end
print(twice(x))
```

```output
ten
20
```

## Names and reserved words {#names}

A name (of a variable, a function, a parameter, a class or a field) starts with a letter or `_` and continues with letters, digits and `_`. Letters are ASCII only, and names are case-sensitive, so `score` and `Score` are different names. A class name must start with a capital letter. Variables and functions live in separate name spaces, so a variable and a function may have the same name.

{{engine.keywordCount}} words are reserved: {{engine.keywords}}. They have a meaning in the language, and none of them can be used as the name of a variable, a function, a parameter, a field or a loop variable; the engine reports it with a hint. The words `as` (after `or_else`) and `init` (the constructor method of a class) are not reserved; they mean something only in their own place. `set` and `change` are not keywords either, so they are ordinary names.

Type names are not reserved either. A type name is read as a type only where a type may stand, which is at the start of a declaration, before a parameter name, in a field declaration, in `loop repeat` and `loop each`, and after `or_else as`. Everywhere else it is an ordinary name, so `list list = [1, 2]` declares a list that is called `list`. The same goes for the names of built-in functions such as `find` or `count`: a variable may be called `count`, and a function that you declare with the name of a built-in replaces it.

## Values and types {#types}

Every value has a type. These are the types of the language:

| Type | What it holds | Example | False when |
|---|---|---|---|
| `number` | An integer or a decimal | `5`, `3.14` | it is `0` |
| `str` | Text | `"hello"` | it is the empty string |
| `boolean` | True or false | `true`, `false` | it is `false` |
| `list` | An ordered sequence of values | `["a", "b"]` | it has no elements |
| `map` | Values under string keys | `{"k": "v"}` | it has no keys |
| `pattern` | A pattern ([Pattern matching](#patterns)) | `p"[num]+"` | never |
| `object` or a class name | An object made from a class ([Classes and objects](#classes)) | `Player("Ann")` | never |
| `empty` | No value | `empty` | always |
| `any` | Any value (the type of a variable or parameter that accepts every type) | `any found = empty` | its value decides |

The last column is used when a value stands where a condition is expected; see [Truthiness](#truthiness) below. There is also a `match` type, the result of a successful pattern match, which is covered in [Pattern matching](#pattern-commands).

**Numbers.** A number literal is digits with an optional `.` followed by more digits, such as `42` or `3.14`. There is no exponent form, no number that starts or ends with a dot (`.5`, `5.`), and no digit separators; a leading `-` is the unary minus operator. Every number is a double-precision floating-point value, so decimal fractions are not always exact: `0.1 + 0.2 is 0.3` is false. When you compare the results of calculations, round both sides first (`math_round` in [Modules and libraries](#dlc-math)). `print` shows a whole number without a decimal point (`100`) and any other number with at most 15 significant digits (`0.3`).

**Text.** A `str` is written between double quotes or between single quotes, and it may span several lines. Inside it, `\"`, `\'`, `\\`, `\n` (a new line), `\t` (a tab) and `\r` are escapes; any other backslash sequence is kept exactly as written, which is what lets patterns contain `\.`. Text is made of characters, not bytes, so an accented letter or a Hangul syllable counts as one character.

**Lists and maps.** A list holds any mix of values, including other lists. A map holds values under string keys, and any other kind of key is an error. A map remembers the order in which its keys were added.

```cuff
list mixed = [1, "two", [3, 4]]
map profile = {
    "name": "Ann",
    "tags": ["a", "b"],
}
print(mixed)
print(profile)
print(profile["tags"][2])
```

```output
[1, "two", [3, 4]]
{"name": "Ann", "tags": ["a", "b"]}
b
```

**Empty.** `empty` means "no value". It is what a function gives back when it returns nothing, and what a search such as `find` gives back when it finds nothing. It is always false when used as a condition. As a type, `empty` has exactly one value, `empty`; to keep a value that may be `empty` (the result of `find`, say) declare the variable `any`.

**Lists, maps and objects are shared, not copied.** If you give a list a second name, both names refer to the same list, so a change made through one is seen through the other. Numbers, text, booleans and `empty` behave as plain values. Use `copy(x)` to make an independent copy ([Control flow](#collections) shows an example).

## Variables {#variables}

A variable is created with a **declaration**, `[type] [name] = [value]`, and its value is replaced later with an **assignment**, `[name] = [value]`. The type is required, because CuffScript does not guess it, and `x = 5` on its own is always an assignment to a variable that already exists.

```cuff
number age = 25
str name = "Ann"
boolean active = true
any nothing = empty

age = 26
print(name, age, active, nothing)
```

```output
Ann 26 true empty
```

These rules complete the picture:

- The type is one of `number`, `str`, `boolean`, `list`, `map`, `match`, `pattern`, `object`, `empty`, `any` or the name of a class.
- A variable **keeps the type it was declared with**, and every store into it is checked. A value of another type stops the run with `DeclarationTypeMismatch` ({{error.DeclarationTypeMismatch}}). A class accepts its own objects and those of its children, `object` accepts any object, and `any` accepts every value, so a variable that has to hold values of different types is declared `any`.
- `empty` is a type of its own, and its only value is `empty`. The `empty` that a failed `find` or `match` produces is therefore kept in an `any` variable and tested there with `is empty`.
- An assignment needs a variable that already exists; otherwise the error is `UndefinedVariable` ({{error.UndefinedVariable}}).
- A name is declared **once** in a function (or once at the top level of a program). Declaring it again, in the same block, in a block inside it, or as a parameter or loop variable of the same name, is a syntax error (`DuplicateDeclaration` ({{error.DuplicateDeclaration}})) that is found before the program runs: assign to the first variable instead. A name declared inside a block is free again once that block has ended, so two blocks side by side may use the same name.

```cuff error=DeclarationTypeMismatch
number age = 25
age = "twenty"   note: the variable is a number, the value is a str
```

```cuff error=DuplicateDeclaration
number total = 1
number total = 2   note: declared twice; write total = 2 to assign
```

## Constants {#constants}

A constant is declared with `constant [type] [name] = [value]`. Its name must be written entirely in capital letters, digits and underscores (`InvalidConstantName` ({{error.InvalidConstantName}}) otherwise), and assigning to it later is an error (`ConstantReassignment` ({{error.ConstantReassignment}})). These checks happen when the statement runs.

```cuff
constant number MAX_RETRIES = 3
constant str API_URL = "https://cuffscript.pages.dev"
print(MAX_RETRIES, API_URL)
```

```output
3 https://cuffscript.pages.dev
```

```cuff error=InvalidConstantName
constant number max_users = 100   note: a constant's name must be all capitals
```

A constant can hold any type, and none of them accepts an assignment to the constant's own name. What else is protected depends on the type. A number, a text and a boolean have nothing else to protect. A **constant list** is read-only through every name: `add`, `remove` and index assignment are all errors, and the list stays read-only when you assign it to another variable or pass it to a function. The value is copied when the constant is created, so freezing it never freezes a list that another variable already refers to. The protection is *shallow*: a list or map stored inside a constant list can still be changed.

```cuff error=ConstantReassignment
constant list PRIMES = [2, 3, 5, 7, 11]

add 13 to PRIMES          note: error, a frozen list can't be added to
PRIMES[1] = 0     note: also an error
```

```cuff
list source = [1, 2, 3]
constant list SNAPSHOT = source   note: a frozen copy of source
add 99 to source                       note: allowed, SNAPSHOT is still [1, 2, 3]
print(SNAPSHOT, source)
```

```output
[1, 2, 3] [1, 2, 3, 99]
```

A **constant map** refuses `CONFIG["key"] = ...` and `remove "key" from CONFIG`, but the map itself is not frozen: another variable that was given the same map can still change it, and the constant then shows that change. Copy it with `copy(CONFIG)` when you need a map that is independent of the constant.

```cuff error=ConstantReassignment
constant map SETTINGS = {"volume": 5}

SETTINGS["volume"] = 9    note: error, a constant map can't be changed through its name
```

## Truthiness {#truthiness}

An `if`, an `else if`, a `loop while` and the operator `!` accept a value of any type and treat it as true or false. These values are **false**: `false`, `0`, `empty`, the empty string, an empty list and an empty map. Every other value is true, including the text `"0"`, the text `"false"` and a list that holds only a zero. `to_boolean(x)` applies the same rule, so you can see it directly:

```cuff
print(to_boolean(0), to_boolean("0"), to_boolean([]), to_boolean([0]))
if [] do:
    print("never")
else do:
    print("an empty list is falsy")
end
```

```output
false true false true
an empty list is falsy
```

## Text and f-strings {#text}

The operator `+` joins two texts. An **f-string** puts values into text: write `f"..."` and put an expression between braces, and its display form is inserted. To write a brace itself, double it (`{{` and `}}`). Inside the braces, write text with single quotes, because a double quote would end the f-string. An error inside the braces is reported at the line of the f-string.

```cuff
str city = "Seoul"
map res = {"year": 2026}
print("Hello, " + city + "!")
print(f"{city} has {1 + 1} syllables and the year is {res['year']}")
print(f"Braces: {{like this}}")
print(to_number("42") + 1, to_str(3.5) + "!")
```

```output
Hello, Seoul!
Seoul has 2 syllables and the year is 2026
Braces: {like this}
43 3.5!
```

The **display form** is what `print`, an f-string and `to_str` show for a value. A text is shown as it is at the top level, and in quotes inside a list or map. A number, a boolean and `empty` are shown as their words or digits, a list as `[1, "a", [2]]`, a map as `{"k": "v"}`, and a pattern as the literal that was written. An object is shown by its `to_str()` method when its class has one ([Classes and objects](#classes)). Three conversion functions are always available: `to_str(x)` gives the display form, `to_number(x)` reads a number from text (`true` and `false` become `1` and `0`), and `to_boolean(x)` applies the truthiness rule.

## Operators {#operators}

**Arithmetic.** `*`, `/`, `%`, `**` and the unary `-` need numbers. `/` always divides as floating point, so `5 / 2` is `2.5`, and dividing by zero is an error (`DivisionByZero` ({{error.DivisionByZero}})). `%` is the remainder of a division and takes the sign of the divisor (`-7 % 3` is `2`). `**` raises to a power and groups from the right, so `2 ** 3 ** 2` is `2 ** 9`. `+` adds two numbers, joins two texts, or joins two lists into a new list. Any other combination, such as `"a" + 1`, is a `TypeMismatch` ({{error.TypeMismatch}}) error: convert explicitly with `to_str` or `to_number`.

```cuff
print(5 / 2, 7 % 3, -7 % 3, 2 ** 10, 2 ** 3 ** 2, -2 ** 2)
print("ab" + "cd", [1, 2] + [3])
```

```output
2.5 1 2 1024 512 -4
abcd [1, 2, 3]
```

```cuff error=TypeMismatch
print("age: " + 30)   note: a text and a number can't be added; use to_str(30)
```

**Comparison.** `<`, `>`, `<=` and `>=` compare two numbers or two texts. Texts are compared by their UTF-8 bytes, so `"a" < "B"` is false: every capital letter comes before every lower-case one. Comparing values of different types is an error, and comparisons do not chain (`1 < 2 < 3` compares `true` with `3` and fails).

**Equality.** CuffScript has no `==` or `!=`. Write `is` and `is not`. Values of different types are never equal. Numbers compare by value and texts by content. Lists and maps compare structurally: they are equal when they have the same length or keys and equal elements. Two objects are equal only when they are the very same object, and two patterns when their text and flags are the same. `is` never reads a text as a pattern; to test text against a pattern use `matches` ([Pattern matching](#patterns)), and to ask whether an object belongs to a class use `isa` ([Classes and objects](#inheritance)).

```cuff
print(3 < 5, "apple" < "banana", "a" < "B")
print(1 is 1, "1" is 1, [1, [2]] is [1, [2]], {"a": 1} is not {"a": 2})
```

```output
true true false
true false true true
```

**Logic.** `and` and `or` combine conditions, and `!` reverses one. The operands may be of any type (see [Truthiness](#truthiness)), and the result is always a `boolean`, never one of the operands. The right operand is evaluated only when the left one does not already decide the result: `and` stops at a false left operand and `or` at a true one. That is why `x is not 0 and 10 / x > 1` never divides by zero.

```cuff
number age = 30
if age >= 18 and age < 65 do:
    print("working age")
end
print(age < 18 or age >= 65, !(age > 20) or age is 30)
print(0 and 1 / 0, 7 or 1 / 0)
```

```output
working age
false true
false true
```

**Precedence.** When an expression has several operators, the ones that bind tighter are worked out first. From the tightest to the loosest:

| Level | Operators | Grouping |
|---|---|---|
| 1 | call `f(...)`, index `x[i]`, slice `x[i~j]`, member `x.name` | left |
| 2 | `**` | right |
| 3 | unary `-` | right |
| 4 | `*` `/` `%` | left |
| 5 | `+` `-` | left |
| 6 | `is` `is not` `matches` `isa` `>` `<` `>=` `<=` | left |
| 7 | `!` | right |
| 8 | `and` | left |
| 9 | `or` | left |

Parentheses group anything. Because `**` binds tighter than a unary minus on its left, `-2 ** 2` is `-4`. Because `!` binds looser than a comparison, `!x is 3` means `!(x is 3)`, and because it binds tighter than `and`, `!a and b` means `(!a) and b`.

## Indexing and slicing {#indexing}

The first position of a list or a text is **`1`**, and position `0` does not exist. A negative position counts from the end, so `-1` is the last one. A slice `x[i~j]` takes positions `i` through `j`, both included, and its bounds may be negative too; if `i` comes after `j` the result is empty. A map is indexed by a string key.

```cuff
list colors = ["red", "green", "blue", "yellow"]
print(colors[1], colors[-1], colors[2~3], colors[-2~-1])

str word = "héllo"
print(word[2], word[2~4], word[-1])

map ages = {"ann": 31}
print(ages["ann"])
```

```output
red yellow ["green", "blue"] ["blue", "yellow"]
é éll o
31
```

Some details to remember:

- Position `0` raises `ZeroIndexAccess` ({{error.ZeroIndexAccess}}), and a position outside the sequence raises `IndexOutOfRange` ({{error.IndexOutOfRange}}). A key that a map does not have raises `KeyNotFound` ({{error.KeyNotFound}}); assigning to a new key creates it.
- A position must be a whole number (`FractionalIndex` ({{error.FractionalIndex}}) otherwise).
- A text is indexed by character, not by byte, so `"héllo"[2]` is `"é"`. A text cannot be changed in place: `word[1] = "x"` is an error. Build a new text with `+` and a slice instead.

## Comments and the colon rule {#colon-comments}

A single-line comment starts with `note:` and runs to the end of the line, either on its own line or after code. A multi-line comment starts when `note:` is the last thing on its line and runs until the word `endnote`. The comment ends at the **first** `endnote`, wherever it appears (even in the middle of a line), so do not write that word inside the comment's text.

```cuff
note: a single-line comment
number x = 10
if x is 10 do: print("Passed") end   note: a trailing comment on the same line works too

note:
This is a multi-line comment area.
Indentation and line breaks are free-form.
endnote
```

```output
Passed
```

To enforce readability at the language level, every colon (`:`) outside a string follows one rule: **there is never a space before it**, and a space after it is recommended. This covers `do:`, `note:`, `DLC:name` and the colons inside patterns. Breaking the rule is a syntax error that is reported before the program runs.
