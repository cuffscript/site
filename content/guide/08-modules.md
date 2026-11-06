---
group: Modules and libraries
summary: "Splitting a program into files, and the {{engine.dlcCount}} built-in libraries (DLC)"
---

## Splitting a program into files {#modules}

A long program is easier to read when it is split into files. `use name from ./folder` loads the file `./folder/name.cuff` and makes what it defines available to your program. In this IDE you can try it by adding file tabs named, for example, `lib/greetings.cuff` and `main.cuff`. A `use` statement must be written on a single line.

```cuff
note: lib/greetings.cuff
set constant str DEFAULT_GREETING to "Hello"
func greet(name) do:
    global DEFAULT_GREETING
    return DEFAULT_GREETING + ", " + name + "!"
end
```

```cuff fragment
note: main.cuff
use greetings from ./lib
print(greet("CuffScript"))
print(DEFAULT_GREETING)
```

These are the rules:

- **The path.** It is relative to the folder of the script that runs, and it must stay inside that folder (or inside the folder that the host program set as the root). An absolute path, or one that escapes with `../`, raises `ModuleAccessDenied` ({{error.ModuleAccessDenied}}). A file that does not exist raises `ModuleNotFound` ({{error.ModuleNotFound}}), and a file that fails to parse raises `ModuleParseFailed` ({{error.ModuleParseFailed}}).
- **It runs once.** The code of a module runs the first time it is loaded. Later `use` statements for the same module, including circular ones, do nothing.
- **What you get.** The functions and classes of the module become available to the whole program. Its top-level variables are copied into the scope that wrote `use`, after the module has run. A function from a module follows the same rule as any other function: to read a variable that its module defined at the top level, it bridges the name with `global` first, as `greet` does above.
- **Nesting.** Modules may load other modules, up to a depth limit (`ModuleLimitExceeded` ({{error.ModuleLimitExceeded}}) beyond it).

## Built-in libraries (DLC) {#dlc}

CuffScript comes with a set of library packages called **DLCs**. A library's functions become available from the line `use DLC:name` onward, and every function is then called directly by its name, with no `DLC:` prefix. Several libraries can be loaded on one line, separated by commas, as in `use DLC:math, DLC:string` (each entry needs its own `DLC:`). Loading a library twice is harmless, and an unknown library name raises `UnknownDLC` ({{error.UnknownDLC}}) with a hint that lists the libraries that exist.

::: callout Every function name is "library_verb"
`sqrt` becomes `math_sqrt`, `upper` becomes `str_upper`, `get` becomes `network_get`: a library prefix tells you from the name alone which `use` line a function came from. The exceptions are `length`, `contains` and `index_of` (provided by the string, list and map libraries and deliberately behaving the same across them), and `to_json`, `from_json`, `to_number`, `to_str` and `to_boolean` (whose names already show their direction).
:::

These rules hold for every library function:

- A function checks its arguments before it runs. The wrong number of arguments raises `ArgumentCountMismatch` ({{error.ArgumentCountMismatch}}), a value of the wrong type raises `TypeMismatch` ({{error.TypeMismatch}}), and a value outside what the function accepts raises `InvalidArgumentValue` ({{error.InvalidArgumentValue}}). All of these can be caught with `or_else`.
- Functions return new values and never modify their arguments: a list or map you pass in comes back unchanged.
- Text is measured and indexed in characters, not bytes.
- A function whose first argument is the value it works on can also be written as a method of that value, such as `text.upper()` ([Calling a function as a method](#methods)).

**Always available.** These work without any `use`: `print`, `input`, `type_of(x)` (the type name as text, or the class name for an object), `to_number`, `to_str`, `to_boolean`, `copy` (a shallow copy of a list, map or object), `pattern` and the seven pattern functions `match`, `find`, `find_all`, `replace`, `replace_all`, `split` and `count` ([Pattern matching](#pattern-commands)).

**Need a library.** `length` and `contains` are not available until `DLC:string`, `DLC:list` or `DLC:map` is loaded, and `index_of` needs `DLC:string` or `DLC:list`. Without one of those lines the call raises `UndefinedFunction` ({{error.UndefinedFunction}}), and `use DLC:map` alone does not give you `index_of`.

### Full function list

Every built-in function that the engine registers, library by library. The sections below explain each library and show examples.

{{engine:dlc-reference}}

### `DLC:math` {#dlc-math}

Mathematical functions on numbers. Anything that is not a finite number (the square root of a negative number, say) is reported as an error rather than returned as `inf` or `nan`, so a program never has to test for them.

| Function | Result |
|---|---|
| `math_sqrt(x)` | The square root |
| `math_abs(x)` | The absolute value |
| `math_pow(base, exponent)` | `base` to the power `exponent`, the same as `base ** exponent` |
| `math_mod(a, b)` | The remainder of `a / b`, the same as `a % b` (takes the sign of `b`) |
| `math_round(x [, digits])` | Rounds to `digits` decimal places (0 to 15, default 0); halves round away from zero |
| `math_floor(x)`, `math_ceil(x)`, `math_trunc(x)` | Round down, round up, round toward zero |
| `math_sign(x)` | `-1`, `0` or `1` |
| `math_min(a, b, ...)`, `math_max(a, b, ...)` | The smallest or largest of the numbers, or of the numbers in one list |
| `math_clamp(value, low, high)` | `value`, kept between `low` and `high` |
| `math_log(x [, base])`, `math_log2(x)`, `math_log10(x)`, `math_exp(x)` | Logarithms (natural by default) and `e` to the power `x` |
| `math_sin(x)`, `math_cos(x)`, `math_tan(x)` | Trigonometry, in radians |
| `math_asin(x)`, `math_acos(x)`, `math_atan(x)`, `math_atan2(y, x)` | Inverse trigonometry, giving radians |
| `math_pi()`, `math_e()` | The constants, called with no arguments |

```cuff
use DLC:math

print(math_sqrt(16), math_pow(2, 10), math_round(2.5), math_round(3.14159, 2))
print(math_min(4, 9, 2), math_max([3, 8, 5]), math_clamp(15, 0, 10))
print(math_mod(-7, 3), math_floor(-1.5), math_trunc(-1.5), math_sign(-8))
```

```output
4 1024 3 3.14
2 8 10
2 -2 -1 -1
```

The four rounding functions differ for negative numbers and for halves:

| `x` | `math_floor` | `math_ceil` | `math_trunc` | `math_round` |
|---:|---:|---:|---:|---:|
| `2.5` | `2` | `3` | `2` | `3` |
| `-2.5` | `-3` | `-2` | `-2` | `-3` |
| `-0.5` | `-1` | `0` | `0` | `-1` |

Decimal fractions such as `0.1` have no exact binary form, so comparing the result of arithmetic with `is` can fail even though both sides print the same. Round both sides to the number of digits you care about before comparing.

```cuff
use DLC:math
print(0.1 + 0.2 is 0.3, math_round(0.1 + 0.2, 10) is 0.3)
```

```output
false true
```

### `DLC:string` {#dlc-string}

Functions on text. A text is a sequence of characters, so `length("héllo")` is 5.

| Function | Result |
|---|---|
| `length(s)` | The number of characters |
| `contains(s, part)` | Whether `s` contains the text `part` |
| `index_of(s, part)` | The 1-based position of the first `part`, or `empty` if there is none |
| `str_upper(s)`, `str_lower(s)` | The text in upper or lower case |
| `str_trim(s)`, `str_trim_start(s)`, `str_trim_end(s)` | The text without surrounding white space (both sides, the start, the end) |
| `str_starts_with(s, prefix)`, `str_ends_with(s, suffix)` | Whether the text begins or ends with the given text |
| `str_repeat(s, n)` | The text repeated `n` times |
| `str_pad_left(s, width [, fill])`, `str_pad_right(s, width [, fill])` | The text padded with `fill` (one character, a space by default) until it is `width` characters long |
| `str_char_code(s)`, `str_from_char_code(n)` | The code point of the first character, and the character with a given code point |

```cuff
use DLC:string

print(str_upper("hello"), str_lower("HELLO"), str_trim("  padded  ") + "|")
print(length("héllo"), contains("hello world", "world"), index_of("hello", "l"))
print(str_starts_with("hello", "he"), str_ends_with("hello", "lo"), str_repeat("ab", 3))
print(str_pad_left("7", 3, "0"), str_pad_right("ab", 4, ".") + "|")
print(str_char_code("A"), str_from_char_code(66))
```

```output
HELLO hello padded|
5 true 3
true true ababab
007 ab..|
65 B
```

### `DLC:time` and `DLC:random` {#dlc-time-random}

`time_now()` gives the seconds since the Unix epoch (1970-01-01 00:00:00 UTC) with a fractional part; `time_timestamp()` is the same function. The random functions are:

| Function | Result |
|---|---|
| `random_float()` | A number from 0 up to, but not including, 1 |
| `random_int(low, high)` | A whole number from `low` to `high`, both included |
| `random_choice(xs)` | A random element of a list (an empty list is an error) |
| `random_shuffle(xs)` | A new list with the same elements in random order |
| `random_seed(n)` | Starts the sequence from the whole number `n`, so the numbers that follow can be repeated |

```cuff
use DLC:time, DLC:random

set number started to time_now()
random_seed(42)
set number roll to random_int(1, 6)
print(started > 0, roll >= 1 and roll <= 6, random_float() < 1)
print(random_choice(["a", "b", "c"]) is not empty, random_shuffle([1, 2, 3]) is not empty)
```

```output
true true true
true true
```

### `DLC:list` {#dlc-list}

Functions on lists. They follow a functional style: they **return a new list** and leave the original untouched.

| Function | Result |
|---|---|
| `length(xs)`, `contains(xs, v)`, `index_of(xs, v)` | The number of elements, whether an element equal to `v` exists, and the 1-based position of the first one (or `empty`) |
| `list_sort(xs)` | A copy in ascending order. The elements must be all numbers or all texts |
| `list_reverse(xs)` | A copy in reverse order |
| `list_unique(xs)` | A copy with later duplicates removed |
| `list_join(xs, separator)` | The elements of a list of texts joined with `separator` (convert other values with `to_str` first) |
| `list_sum(xs)`, `list_average(xs)` | The sum and the average of a list of numbers |
| `list_flatten(xs)` | A copy with the lists inside it spliced in, one level deep |
| `list_range(start, end [, step])` | The numbers from `start` to `end`, counting down when `start` is larger |

```cuff
use DLC:list, DLC:convert

set list scores to [5, 2, 8, 1, 9, 2]
print(list_sort(scores), list_reverse(scores), list_unique(scores))
print(list_sum(scores), list_average(scores), list_flatten([[1, 2], [3]]), list_range(1, 5))

set list score_strs to []
loop each score in scores do:
    add to_str(score) to score_strs
end
print(list_join(score_strs, ", "))
```

```output
[1, 2, 2, 5, 8, 9] [2, 9, 1, 8, 2, 5] [5, 2, 8, 1, 9]
27 4.5 [1, 2, 3] [1, 2, 3, 4, 5]
5, 2, 8, 1, 9, 2
```

### `DLC:map` {#dlc-map}

A map has no built-in way to list its keys, so load this library when you need to go through one.

| Function | Result |
|---|---|
| `length(m)`, `contains(m, key)` | The number of keys, and whether the map has the key |
| `map_has_key(m, key)` | The same as `contains`, spelled for maps |
| `map_keys(m)`, `map_values(m)` | Lists of the keys and of the values, in insertion order |
| `map_entries(m)` | A list of `[key, value]` pairs |
| `map_merge(a, b)` | A new map with the keys of both; where both have a key, `b` wins |

```cuff
use DLC:map

set map profile to {"name": "Bob", "level": 12}
print(map_keys(profile), map_values(profile), map_has_key(profile, "level"))

loop each entry in map_entries(profile) do:
    print(f"{entry[1]} = {entry[2]}")
end

set map defaults to {"volume": 50, "difficulty": "normal"}
print(map_merge(defaults, {"difficulty": "hard"}), length(defaults), contains(defaults, "volume"))
```

```output
["name", "level"] ["Bob", 12] true
name = Bob
level = 12
{"volume": 50, "difficulty": "hard"} 2 true
```

### `DLC:convert` {#dlc-convert}

`to_number`, `to_str` and `to_boolean` are always available, so `use DLC:convert` is optional; write it when you want the code to show where they come from.

| Function | Result |
|---|---|
| `to_number(x)` | A number stays as it is, `true` and `false` become `1` and `0`, and a text is read as plain decimal text. Any other type is an error |
| `to_str(x)` | The display form of any value, as `print` would write it |
| `to_boolean(x)` | The truthiness of any value ([Truthiness](#truthiness)) |

`to_number` accepts what a person would call a decimal number: `"42"`, `" 42 "`, `"+42"`, `"-3.5"`, `".5"`, `"5."` and `"1e3"` all work. Text such as `""`, `"12abc"`, `"1 2"`, `"0x10"`, `"1_000"`, `"inf"` or `"nan"` raises `InvalidArgumentValue`, which `or_else` can catch.

```cuff
set number n to to_number("42.5")
print(n + 1, to_str(123) + "!", to_boolean(""), to_number(" 7 "), to_number("1e3"))

print(to_number("12abc")) or_else do:
    print("not a number")
end
```

```output
43.5 123! false 7 1000
not a number
```

### `DLC:json` {#dlc-json}

`to_json(value [, indent])` turns a value into JSON text, compact by default or pretty-printed with `indent` spaces per level (0 to 10). `from_json(text)` reads JSON text back. JSON objects, arrays, strings, numbers, `true`, `false` and `null` map to `map`, `list`, `str`, `number`, `boolean` and `empty`. `from_json` follows the JSON standard strictly, so common variants such as trailing commas, single quotes and unquoted keys are rejected with `InvalidArgumentValue` ({{error.InvalidArgumentValue}}), and the message names the position where the text went wrong. A `match` value cannot be converted; copy the captures you need into a list or map first.

```cuff
use DLC:json

set map user to {"name": "Alice", "level": 7, "active": true}
set str packed to to_json(user)
print(packed)
print(to_json(user, 2))

set map parsed to from_json(packed)
print(parsed["name"])
```

```output
{"name":"Alice","level":7,"active":true}
{
  "name": "Alice",
  "level": 7,
  "active": true
}
Alice
```

### `DLC:network` {#dlc-network}

`network_get(url)` and `network_post(url, body [, content_type])` are backed by a working HTTP/1.1 client and return a map shaped like `{"status", "ok", "body"}`. Only plain HTTP is supported, and `https://` is not quietly downgraded to plain text: it is an error right away. A connection failure, a DNS failure or a timeout is a `NetworkRequestFailed` ({{error.NetworkRequestFailed}}) runtime error, which `or_else` can catch. Requests to loopback and private address ranges (including cloud metadata addresses) are blocked by default to prevent server-side request forgery. A host that runs untrusted code can turn the library off completely with `CuffEngine::Options::networkEnabled = false` (or `cuffc --no-network`).

```cuff
use DLC:network

set map res to network_get("http://example.com") or_else do:
    print("Request failed: the network may be blocked, or this IDE environment may be the limit")
    change res to {"status": 0, "ok": false, "body": ""}
end
if res["ok"] do:
    print(res["body"])
end
```

::: warn What about this browser IDE?
The behavior above is for the native `cuffc`. The IDE on this page compiles CuffScript to WebAssembly and runs it inside a browser tab, and a browser doesn't let a script open arbitrary TCP sockets at all. So it is safest to assume that `network_get` and `network_post` calls end in a failure that `or_else` has to catch in this IDE. To see real network requests, run a locally built `cuffc`.
:::

### `DLC:filesystem` {#dlc-filesystem}

These functions read and write real local files next to the script. Every path is confined to **the same sandbox root** that `use ... from` uses to find modules (the folder the script is in, or a `--root` set by the host), so an attempt to escape with an absolute path or `../` is rejected with `FilesystemAccessDenied` ({{error.FilesystemAccessDenied}}) before anything is touched. Symbolic links that point outside the root are rejected too.

| Function | Result |
|---|---|
| `file_exist(path)` | Whether the regular file exists (a folder gives `false`) |
| `file_size(path)` | Its size in bytes, or `empty` on failure |
| `file_read(path)` | Its text, or `empty` on failure |
| `file_readlines(path)` | Its lines as a list, or `empty` on failure; Windows and Unix line endings give the same list |
| `file_write(path, text)` | Overwrites the file or creates it; `true` on success, `false` otherwise |
| `file_add(path, text)` | Appends text, creating the file if needed; `true` on success, `false` otherwise |
| `file_remove(path)` | Deletes a regular file and says whether it succeeded; a folder, even an empty one, is never removed |

Reading a file that does not exist gives `empty` instead of an error, so test the result with `is empty`.

```cuff
use DLC:filesystem

set str path to "notes.txt"

print(file_exist(path))                         note: false
print(file_write(path, "line one\nline two"))   note: true
print(file_add(path, "\nline three"))           note: true, appends
print(file_size(path))                          note: number of bytes
print(file_readlines(path))                     note: ["line one", "line two", "line three"]

print(file_read("no_such_file.txt"))            note: empty, not an error

print(file_remove(path))                        note: true
print(file_exist(path))                         note: false
```

::: warn It is blocked outright in this browser IDE
Unlike `DLC:network`, this is not "mostly fails" but a firm block. Instead of leaving each file operation as a failure for `or_else` to catch, this IDE refuses to run at all, with an immediate error, if `use DLC:filesystem` appears anywhere in the code. The sandbox "file system" on this page is a virtual store that holds the other tabs of this IDE project, so letting code read and write it would only be confusing. In a locally installed `cuffc` it works normally unless you pass `--no-filesystem`.
:::
