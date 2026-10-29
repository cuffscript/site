---
group: Modules and libraries
summary: "`use ... from ...`, {{engine.dlcCount}} built-in DLCs"
---

## use ... from ... {#modules}

To load another `.cuff` file in the same project, write `use [name] from [relative path]`. In this IDE you can create several file tabs and try this syntax as it is. Module statements must be written on a single line.

```cuff
note: lib/greetings.cuff
set constant str DEFAULT_GREETING to "Hello"
set returnable func greet(name) do:
    change DEFAULT_GREETING to global
    return DEFAULT_GREETING + ", " + name + "!"
end
```

```cuff fragment
note: main.cuff
use greetings from ./lib
print(greet("CuffScript"))
print(DEFAULT_GREETING)
```

## Built-in DLC list {#dlc}

Official built-in libraries are loaded with a single `use DLC:name` line, and several can be loaded on one line separated by commas, as in `use DLC:math, DLC:string` (each item needs its own `DLC:`). All of their functions are registered as global names, so you call them directly, without a `DLC:` prefix.

::: callout Every function name is "library_verb"
`sqrt` → `math_sqrt`, `upper` → `str_upper`, `get` → `network_get`: a library prefix tells you from the name alone which `use` line a function came from. The only exceptions are `length` / `contains` / `index_of` (provided by the string, list and map libraries, and deliberately behaving the same across them, although `index_of` comes from the string and list libraries only) and `to_json` / `from_json` / `to_number` / `to_str` / `to_boolean` (whose names already show their direction).
:::

### Full function list

Every built-in function registered in the engine. The introductions below cover only the representative ones, with examples.

{{engine:dlc-reference}}

### `DLC:math`

```cuff
use DLC:math

print(math_sqrt(16))       note: 4
print(math_abs(-5))        note: 5
print(math_pow(2, 10))     note: 1024
print(math_round(3.6))     note: 4
print(math_floor(3.9))     note: 3
print(math_ceil(3.1))      note: 4
print(math_min(4, 1, 9))   note: 1 (takes any number of arguments)
print(math_max(4, 1, 9))   note: 9
```

### `DLC:string`

```cuff
use DLC:string

print(str_upper("hello"))              note: "HELLO"
print(str_lower("HELLO"))              note: "hello"
print(str_trim("  padded  "))          note: "padded"
print(length("hello"))                 note: 5, an exception to the prefix rule
print(contains("hello world", "world"))   note: true, also unprefixed
print(str_starts_with("hello", "he"))  note: true
print(str_ends_with("hello", "lo"))    note: true
```

### `DLC:time` / `DLC:random`

```cuff
use DLC:time
use DLC:random

print(time_now())               note: Unix timestamp (seconds, a decimal); time_timestamp() is exactly the same function
set number roll to random_int(1, 6)
print(f"Dice roll: {roll}")     note: an integer from 1 to 6, both ends included
print(random_float())           note: a decimal from 0.0 up to, but not including, 1.0; it used to be called plain random()
```

### `DLC:list`

These follow a functional style: they **return a new list** and leave the original untouched. `list_sort` works only when the list is all numbers or all strings.

```cuff
use DLC:list
use DLC:convert

set list scores to [5, 2, 8, 1, 9, 2]
print(list_sort(scores))      note: [1, 2, 2, 5, 8, 9], scores itself is unchanged
print(list_reverse(scores))   note: [2, 9, 1, 8, 2, 5]
print(list_unique(scores))    note: [5, 2, 8, 1, 9]

note: list_join() takes only a list of strings, so convert numbers with to_str() first
set list score_strs to []
loop repeat i to 1 ~ 5 do:
    add to_str(scores[i]) to score_strs
end
print(list_join(score_strs, ", "))   note: "5, 2, 8, 1, 9"
```

### `DLC:map`

A map has no built-in way to list its keys, so load this library when you need to iterate. `map_keys` and `map_values` return lists in the map's insertion order.

```cuff
use DLC:map

set map profile to {"name": "Bob", "level": 12}

print(map_keys(profile))          note: ["name", "level"]
print(map_values(profile))        note: ["Bob", 12]
print(map_has_key(profile, "level"))   note: true

note: loop repeat only ever runs over a number range (start ~ end), so go through
note: a list by index. map_entries() returns a list of [key, value] pairs.
set list pairs to map_entries(profile)
loop repeat i to 1 ~ length(pairs) do:
    set list entry to pairs[i]
    print(f"{entry[1]} = {entry[2]}")
end

note: map_merge() returns a new map; when keys overlap, the second argument wins
set map defaults to {"volume": 50, "difficulty": "normal"}
set map overrides to {"difficulty": "hard"}
print(map_merge(defaults, overrides))   note: {"volume": 50, "difficulty": "hard"}
```

### `DLC:convert`

```cuff
use DLC:convert

set number n to to_number("42.5")
print(n + 1)              note: 43.5
print(to_str(123) + "!")  note: "123!"
print(to_boolean(""))     note: false (an empty string, 0 and empty are false; any other string is true)
```

`to_number`, `to_str` and `to_boolean` are actually core built-ins that are always available, so you can call them without `use DLC:convert`. The declaration itself is harmless (it just registers the same functions again); write it explicitly when you want the code to show where they come from.

### `DLC:json`

```cuff
use DLC:json

set map user to {"name": "Alice", "level": 7, "active": true}
set str packed to to_json(user)
print(packed)                 note: {"name":"Alice","level":7,"active":true}
print(to_json(user, 2))       note: pretty-printed with 2-space indentation

set map parsed to from_json(packed)
print(parsed["name"])         note: "Alice"
```

JSON's object / array / string / number / true / false / null map to CuffScript's `map` / `list` / `str` / `number` / `boolean` / `empty`. `from_json` follows RFC 8259 strictly, so common variants such as trailing commas, single quotes and unquoted keys are rejected with an `InvalidArgumentValue` ({{error.InvalidArgumentValue}}) error.

### `DLC:network`

`network_get(url)` and `network_post(url, body[, content_type])` are backed by a working HTTP/1.1 client and return a map shaped like `{"status", "ok", "body"}`. Only plain HTTP is supported, and `https://` is not quietly downgraded to plain text: it is an error right away. A connection failure, DNS failure or timeout is a `NetworkRequestFailed` ({{error.NetworkRequestFailed}}) runtime error, which `or_else` can catch. Requests to loopback and private ranges (including cloud metadata addresses) are blocked by default to prevent SSRF. A host that runs untrusted code can turn the library off completely with `CuffEngine::Options::networkEnabled = false` (or `cuffc --no-network`).

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

### `DLC:filesystem`

`file_exist`, `file_size`, `file_read`, `file_readlines`, `file_write`, `file_add` and `file_remove` read and write real local files next to the script. Every path is confined to **the same sandbox root** that `use ... from` uses to find modules (the folder the script is in, or a `--root` set by the host), so an attempt to escape with an absolute path or `../` is rejected with `FilesystemAccessDenied` ({{error.FilesystemAccessDenied}}) before anything is touched. Symbolic links that point outside the root are rejected too. Calling `file_read` or `file_readlines` on a file that doesn't exist gives `empty` instead of an error. `file_remove` deletes regular files only: a folder, even an empty one, is not removed, and it returns `false`.

```cuff
use DLC:filesystem

set str path to "notes.txt"

print(file_exist(path))                        note: false
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

::: callout What if library names collide?
You can load several DLCs at once, such as `use DLC:list` and `use DLC:convert`, and they work together as long as no function names collide. The `DLC:list` example above also loads `DLC:convert` for `to_str`.
:::
