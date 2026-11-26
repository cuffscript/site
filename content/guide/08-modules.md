---
group: Modules and libraries
summary: "Splitting a program into files, and the {{engine.dlcCount}} built-in libraries (DLC)"
---

## Splitting a program into files {#modules}

A long program is easier to read when it is split into files. `use name from ./folder` loads the file `./folder/name.cuff` and makes what it defines available to your program. In this IDE you can try it by adding file tabs named, for example, `lib/greetings.cuff` and `main.cuff`. A `use` statement must be written on a single line.

```cuff
note: lib/greetings.cuff
constant str DEFAULT_GREETING = "Hello"
func greet(str name) do:
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
`sqrt` becomes `math_sqrt`, `upper` becomes `str_upper`, `get` becomes `network_get`: a library prefix tells you from the name alone which `use` line a function came from. The exceptions are `length`, `contains` and `index_of` (built in, so they need no library), and `to_json`, `from_json`, `to_number`, `to_str` and `to_boolean` (whose names already show their direction).
:::

These rules hold for every library function:

- A function checks its arguments before it runs. The wrong number of arguments raises `ArgumentCountMismatch` ({{error.ArgumentCountMismatch}}), a value of the wrong type raises `TypeMismatch` ({{error.TypeMismatch}}), and a value outside what the function accepts raises `InvalidArgumentValue` ({{error.InvalidArgumentValue}}). All of these can be caught with `or_else`.
- Functions return new values and never modify their arguments: a list or map you pass in comes back unchanged.
- Text is measured and indexed in characters, not bytes.
- A function whose first argument is the value it works on can also be written as a method of that value, such as `text.upper()` ([Calling a function as a method](#methods)).

**Always available.** These work without any `use`: `print`, `input`, `type_of(x)` (the type name as text, or the class name for an object), `to_number`, `to_str`, `to_boolean`, `copy` (a shallow copy of a list, map or object), `length`, `contains` and `index_of`, `task_done` (whether a `Task` has finished), `pattern` and the seven pattern functions `match`, `find`, `find_all`, `replace`, `replace_all`, `split` and `count` ([Pattern matching](#pattern-commands)).

`length(x)` is the number of characters, elements or keys of a text, list or map. `contains(x, v)` asks whether a text has the part `v`, a list an element equal to `v`, or a map the key `v`, and `index_of(x, v)` gives the 1-based position of the first match in a text or a list, or `empty`.

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
| `math_bit_and(a, b, ...)`, `math_bit_or(a, b, ...)`, `math_bit_xor(a, b, ...)` | The bits set in every number, in any of them, or in an odd number of them (two or more numbers) |
| `math_bit_not(x, width)` | `x` with its lowest `width` bits flipped, the complement in `width` bits (`width` from 1 to 53, and `x` must fit in it) |
| `math_bit_shl(x, n)`, `math_bit_shr(x, n)` | `x` shifted `n` bits (0 to 53) to the left or to the right; shifting right drops the low bits |
| `math_bit_test(x, position)` | Whether the bit at `position` is set (0 is the lowest bit, 52 the highest), as a `boolean` |
| `math_to_base(x, base [, width])` | The digits of `x` in a base from 2 to 36 as a `str` (`0`-`9`, then lowercase `a`-`z`), padded on the left with zeros to at least `width` digits |
| `math_from_base(text, base)` | The number that the digits in `text` write in that base; only digits are accepted, in either case (no sign, space or prefix such as `0x`) |

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

The bit functions and the base functions work on the whole numbers from `0` to `9007199254740991` (2^53 - 1), the ones that a `number` holds exactly. A negative number, a fraction or a larger one raises `InvalidArgumentValue` ({{error.InvalidArgumentValue}}), and so does a left shift that would push a bit past the 53rd, so no bit is lost silently. There are no negative numbers, so `math_bit_not` takes the width to complement in. The language has no hexadecimal or binary literals: `math_from_base` reads them from text and `math_to_base` writes them. Each of the nine is also a method: `12.bit_and(10)`, `255.to_base(16)`, `"ff".from_base(16)`.

```cuff
use DLC:math
print(math_bit_and(12, 10), math_bit_or(12, 10), math_bit_xor(12, 10), math_bit_not(5, 4))
print(math_bit_shl(1, 10), math_bit_shr(1024, 3), math_bit_test(5, 2), 5.bit_test(1))
print(math_to_base(255, 16), math_to_base(5, 2, 8), math_from_base("FF", 16), "1010".from_base(2))
```

```output
8 14 6 10
1024 128 true false
ff 00000101 255 10
```

Setting and clearing a flag in an 8-bit register:

```cuff
use DLC:math
number status = math_from_base("10010110", 2)
number set = math_bit_or(status, math_bit_shl(1, 0))
number cleared = math_bit_and(set, math_bit_not(math_bit_shl(1, 7), 8))
print(math_to_base(set, 2, 8), math_to_base(cleared, 2, 8))
```

```output
10010111 00010111
```

### `DLC:string` {#dlc-string}

Functions on text. A text is a sequence of characters, so `length("héllo")` is 5 (`length`, `contains` and `index_of` are built in and work on texts too).

| Function | Result |
|---|---|
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

`time_now()` gives the seconds since the Unix epoch (1970-01-01 00:00:00 UTC) with a fractional part; `time_timestamp()` is the same function. To turn those seconds into calendar dates, use `DLC:datetime` below. `time_sleep(seconds)` waits at least that many seconds (fractions are allowed, up to a limit of 1000 days; a negative or larger number raises `InvalidArgumentValue`) and gives `empty`. Inside a task it lets the other tasks run ([Async functions and tasks](#async)), and a program's time limit still ends it in the middle of a sleep. The random functions are:

| Function | Result |
|---|---|
| `random_float()` | A number from 0 up to, but not including, 1 |
| `random_int(low, high)` | A whole number from `low` to `high`, both included |
| `random_choice(xs)` | A random element of a list (an empty list is an error) |
| `random_shuffle(xs)` | A new list with the same elements in random order |
| `random_seed(n)` | Starts the sequence from the whole number `n`, so the numbers that follow can be repeated |

There is one generator for the whole process, and it is **not secure**: never use it for passwords, tokens or keys.

```cuff
use DLC:time, DLC:random

number started = time_now()
random_seed(42)
number roll = random_int(1, 6)
print(started > 0, roll >= 1 and roll <= 6, random_float() < 1)
print(random_choice(["a", "b", "c"]) is not empty, random_shuffle([1, 2, 3]) is not empty)
```

```output
true true true
true true
```

### `DLC:datetime` {#dlc-datetime}

Calendar dates and times. An **instant** is a number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC), the same number that `time_now()` gives, so this library and `DLC:time` work together. The library does the arithmetic of the Gregorian calendar for the years 1 to 9999 and has no time zone database: a **zone** is a whole number of minutes east of UTC that your script passes in (`540` is UTC+09:00, `-330` is UTC-05:30, and `0` is UTC).

| Function | Result |
|---|---|
| `datetime_parts(seconds [, offset])` | A map with the calendar fields of the instant in the zone: `year`, `month` (1 to 12), `day`, `hour`, `minute`, `second`, `weekday` (1 is Monday, 7 is Sunday) and `yearday` (1 to 366). A fraction of a second is dropped. |
| `datetime_make(year, month, day [, hour [, minute [, second [, offset]]]])` | The instant for those fields in the zone, or `empty` when the date does not exist (month 13, 31 April, 29 February of a year that is not a leap year, hour 24). Missing fields are `0`. |
| `datetime_format(seconds, pattern [, offset])` | The instant written as text by the pattern, in the zone. |
| `datetime_parse(text, pattern [, offset])` | The instant that the text writes, read by the pattern, or `empty` when the text does not fit it. |
| `datetime_offset([seconds])` | The offset from UTC that **this machine's** time zone has at that instant (now when it is left out), in minutes east, so `datetime_parts(t, datetime_offset(t))` is the local time. `0` when the system cannot say. |

A date that does not exist, or text that does not fit, is not an error: `datetime_make` and `datetime_parse` give `empty`, because the data is what is wrong, and a script that reads dates from outside has to ask (keep the result in an `any` variable and test it with `is empty`). An instant outside the years 1 to 9999, or an offset of a day or more, raises `InvalidArgumentValue` ({{error.InvalidArgumentValue}}).

```cuff
use DLC:datetime

number t = 1700000000
print(datetime_parts(t))
print(datetime_parts(t, 540))
print(datetime_make(2023, 11, 14, 22, 13, 20))
print(datetime_make(2023, 2, 29), datetime_make(2024, 2, 29))
```

```output
{"year": 2023, "month": 11, "day": 14, "hour": 22, "minute": 13, "second": 20, "weekday": 2, "yearday": 318}
{"year": 2023, "month": 11, "day": 15, "hour": 7, "minute": 13, "second": 20, "weekday": 3, "yearday": 319}
1700000000
empty 1709164800
```

`datetime_format` and `datetime_parse` read the same **pattern**:

| Written | Means | Example |
|---|---|---|
| `YYYY` | The year, four digits | `2023` |
| `MM` | The month, two digits | `03` |
| `DD` | The day of the month, two digits | `09` |
| `HH` | The hour of a 24-hour day, two digits | `07` |
| `mm` | The minute, two digits | `05` |
| `ss` | The second, two digits | `09` |
| `SSS` | The milliseconds, three digits | `250` |
| `Z` | The zone: `Z` for UTC, otherwise `+HH:mm` or `-HH:mm` | `+09:00` |
| `[text]` | The text between the brackets, as it is | `T` |

Any other character stands for itself, so `-`, `:`, `/`, a space and non-ASCII text can be written as they are. A word that contains a token, such as `Class` (which has `ss` in it), is put in brackets so that it is read as text: `[Class]`. When parsing, the digit tokens are fixed width, so `datetime_parse("2023-2-3", "YYYY-MM-DD")` is `empty`, and so is text with anything left over. A pattern with no `YYYY`, `MM` or `DD` reads that part as 1970, January or the 1st.

```cuff
use DLC:datetime

number t = 1700000000.123
print(datetime_format(t, "YYYY-MM-DD HH:mm:ss"))
print(datetime_format(t, "YYYY-MM-DD[T]HH:mm:ss.SSSZ", 540))
print(datetime_format(t, "DD/MM/YYYY [at] HH:mm", -330))
print(datetime_parse("2023-11-15T07:13:20+09:00", "YYYY-MM-DD[T]HH:mm:ssZ"))
print(datetime_parse("15/11/2023", "DD/MM/YYYY"), datetime_parse("32/11/2023", "DD/MM/YYYY"))
```

```output
2023-11-14 22:13:20
2023-11-15T07:13:20.123+09:00
14/11/2023 at 16:43
1700000000
1700006400 empty
```

Because an instant is a plain number, adding and comparing dates is ordinary arithmetic. A day is `86400` seconds in UTC; a day in a zone that changes its clock is not always that long, and the library has no zone rules, so a script that must keep "the same local time tomorrow" makes the date again with `datetime_make`. `datetime_offset` is the only function whose answer depends on the machine, so a script that has to give the same result everywhere passes an explicit offset instead.

```cuff
use DLC:datetime
use DLC:math

number start = datetime_make(2024, 1, 31)
number later = datetime_make(2024, 3, 1)
print(math_floor((later - start) / 86400), "days")
map p = datetime_parts(start + 30 * 86400)
print(p["month"], p["day"])

map leap = datetime_parts(datetime_make(2024, 2, 29, 12, 0, 0))
print(leap["weekday"], leap["yearday"])
```

```output
30 days
3 1
4 60
```

### `DLC:list` {#dlc-list}

Functions on lists. They follow a functional style: they **return a new list** and leave the original untouched.

| Function | Result |
|---|---|
| `list_sort(xs)` | A copy in ascending order. The elements must be all numbers or all texts |
| `list_reverse(xs)` | A copy in reverse order |
| `list_unique(xs)` | A copy with later duplicates removed |
| `list_join(xs, separator)` | The elements of a list of texts joined with `separator` (convert other values with `to_str` first) |
| `list_sum(xs)`, `list_average(xs)` | The sum and the average of a list of numbers |
| `list_flatten(xs)` | A copy with the lists inside it spliced in, one level deep |
| `list_range(start, end [, step])` | The numbers from `start` to `end`, counting down when `start` is larger |

```cuff
use DLC:list, DLC:convert

list scores = [5, 2, 8, 1, 9, 2]
print(list_sort(scores), list_reverse(scores), list_unique(scores))
print(list_sum(scores), list_average(scores), list_flatten([[1, 2], [3]]), list_range(1, 5))

list score_strs = []
loop each number score in scores do:
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
| `map_has_key(m, key)` | The same as `contains`, spelled for maps |
| `map_keys(m)`, `map_values(m)` | Lists of the keys and of the values, in insertion order |
| `map_entries(m)` | A list of `[key, value]` pairs |
| `map_merge(a, b)` | A new map with the keys of both; where both have a key, `b` wins |

```cuff
use DLC:map

map profile = {"name": "Bob", "level": 12}
print(map_keys(profile), map_values(profile), map_has_key(profile, "level"))

loop each list entry in map_entries(profile) do:
    print(f"{entry[1]} = {entry[2]}")
end

map defaults = {"volume": 50, "difficulty": "normal"}
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
number n = to_number("42.5")
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

map user = {"name": "Alice", "level": 7, "active": true}
str packed = to_json(user)
print(packed)
print(to_json(user, 2))

map parsed = from_json(packed)
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

### `DLC:csv` {#dlc-csv}

Reads and writes CSV text (comma-separated values), the format that spreadsheets and many tools exchange. A **row** is a list of fields, and a **record** is a map from a field name to its field.

| Function | Result |
|---|---|
| `csv_parse(text [, separator])` | A list of rows, each a list of fields. The separator is one character, a comma by default. |
| `csv_parse_records(text [, separator])` | A list of maps: the first row names the fields, and every other row maps those names to its fields. A field name given twice, or a row with more or fewer fields than the first, raises `InvalidArgumentValue` ({{error.InvalidArgumentValue}}) with the row's number. |
| `csv_write(rows [, separator])` | The rows as text, one line each. |
| `csv_write_records(records [, separator])` | A header row of every key, in the order the keys first appear, then a row for each map; a key that a map does not have is an empty field. |

```cuff
use DLC:csv

str text = "name,score\nAda,95\nLinus,88\n"
list records = csv_parse_records(text)
loop each map record in records do:
    print(record["name"], to_number(record["score"]) + 1)
end
print(type_of(csv_parse(text)[2][2]))
print(csv_write([["a", "b,c"], ["say \"hi\"", "3.5"]]))
print(csv_parse("x;y\n1;2", ";"))
print(csv_write_records(records))
```

```output
Ada 96
Linus 89
str
a,"b,c"
"say ""hi""",3.5

[["x", "y"], ["1", "2"]]
name,score
Ada,95
Linus,88
```

A field that holds the separator, a quote or a line break is written between quotes with the quotes inside it doubled, and read back the same way. Every field is read as a text, so convert numbers yourself with `to_number`.

### `DLC:hash` {#dlc-hash}

Hashes, message authentication codes, encodings and checksums, so a program can fingerprint data, sign it, or exchange it with other systems. A function that takes data takes a `str` and uses its UTF-8 bytes. A hash comes back as lowercase hexadecimal text.

`DLC:hash` is **not an audited cryptographic library**. Its functions are checked against the published test vectors, but nobody has reviewed them as security code, it makes no random numbers (a salt or a key has to come from elsewhere), and only `hash_equal` compares in constant time.

| Function | Result |
|---|---|
| `hash_sha256(data)` | SHA-256: 64 hexadecimal digits. The standard choice for a fingerprint of data. |
| `hash_sha512(data)` | SHA-512: 128 digits. |
| `hash_sha1(data)`, `hash_md5(data)` | SHA-1 (40 digits) and MD5 (32 digits). Both are broken for collisions: use them for compatibility with what still needs them, and for file checksums, never for security. |
| `hash_crc32(data)` | CRC-32 as zip and PNG compute it: 8 digits. A fast check for accidental damage, with no security at all. |
| `hash_hmac_sha256(key, message)`, `hash_hmac_sha512(key, message)` | HMAC: a code that only someone who has the key can make for the message. |
| `hash_pbkdf2_sha256(password, salt, iterations [, length])` | PBKDF2 with HMAC-SHA-256: a key of `length` bytes (32 when left out), made slow to guess by `iterations` rounds. Both numbers have a limit. For storing passwords, a salt of 16 random bytes and 600,000 rounds or more are the usual advice. |
| `hash_equal(a, b)` | Whether `a` and `b` are the same bytes, compared in a time that does not depend on where they differ. Use it to check a code or key that someone else sent; `is` stops at the first difference, which tells a patient attacker how much of a guess was right. |
| `hash_hex_encode(data)`, `hash_hex_decode(text)` | Base16: two lowercase digits per byte. Decoding takes either case and needs an even number of digits. |
| `hash_base64_encode(data)`, `hash_base64_decode(text)` | Base64 with `=` padding. Decoding accepts the text with or without its padding. |
| `hash_base64url_encode(data)`, `hash_base64url_decode(text)` | The URL-safe Base64: `-` and `_` in place of `+` and `/`, written without padding, as JSON Web Tokens and URLs use it. |
| `hash_to_bytes(text)`, `hash_from_bytes(bytes)` | The bytes of a `str` as a list of numbers, and a `str` made of those bytes. |

Text that is not valid Base64 or hexadecimal, and a number outside a limit, raise `InvalidArgumentValue` ({{error.InvalidArgumentValue}}).

```cuff
use DLC:hash

print(hash_sha256("hello"))
print(hash_crc32("123456789"), hash_md5(""))
print(hash_equal("secret", "secret"), hash_equal("secret", "Secret"))
print(hash_base64_encode("hello"), hash_base64_decode("aGVsbG8="), hash_hex_encode("hi"))
print(hash_to_bytes("Hi"), hash_from_bytes([72, 105]))
```

```output
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
cbf43926 d41d8cd98f00b204e9800998ecf8427e
true false
aGVsbG8= hello 6869
[72, 105] Hi
```

### `DLC:path` {#dlc-path}

Works with file names as **text**: it never touches the file system, so it behaves the same everywhere and needs no permission. Names are written with `/`, as the rest of CuffScript does.

| Function | Result |
|---|---|
| `path_join(part, ...)` | The parts joined with `/`. A part that is absolute starts the path again; an empty part adds nothing. |
| `path_normalize(path)` | The path with `.` parts and doubled slashes removed and each `..` taking away the part before it. A relative path keeps the `..` it cannot resolve. |
| `path_basename(path)`, `path_dirname(path)` | The last part, and everything before it (`.` when there is nothing before it). |
| `path_extension(path)`, `path_stem(path)` | The last part from its last dot (`.gz` of `a.tar.gz`, or an empty text), and the last part without its extension. A name that only starts with a dot, such as `.bashrc`, has no extension. |
| `path_with_extension(path, extension)` | The path with its extension replaced or added; an empty text removes it. |
| `path_split(path)` | The parts as a list, the root first when there is one. |
| `path_is_absolute(path)` | Whether the path begins with a root. |
| `path_relative(from, to)` | The path that leads from the folder `from` to `to`; both must be absolute with the same root, or both relative. |

```cuff
use DLC:path

print(path_join("reports", "2024", "q1.csv"))
print(path_dirname("reports/2024/q1.csv"), path_basename("reports/2024/q1.csv"))
print(path_extension("archive.tar.gz"), path_stem("q1.csv"), path_with_extension("q1.csv", ".txt"))
print(path_normalize("a/./b/../c//d"), path_is_absolute("/etc"), path_is_absolute("etc"))
print(path_split("/usr/local/bin"), path_relative("/a/b", "/a/c/d"))
```

```output
reports/2024/q1.csv
reports/2024 q1.csv
.gz q1 q1.txt
a/c/d true false
["/", "usr", "local", "bin"] ../c/d
```

### `DLC:network` {#dlc-network}

`network_get(url)` and `network_post(url, body [, content_type])` are backed by a working HTTP/1.1 client and return a map shaped like `{"status", "ok", "body"}`. Only plain HTTP is supported, and `https://` is not quietly downgraded to plain text: it is an error right away. A connection failure, a DNS failure or a timeout is a `NetworkRequestFailed` ({{error.NetworkRequestFailed}}) runtime error, which `or_else` can catch. A request made inside a task lets the other tasks run until its answer comes ([Async functions and tasks](#async)), and only a limited number of requests are under way at once while the rest wait their turn. Requests to loopback and private address ranges (including cloud metadata addresses) are blocked by default to prevent server-side request forgery. A host that runs untrusted code can turn the library off completely with `CuffEngine::Options::networkEnabled = false` (or `cuffc --no-network`).

```cuff
use DLC:network

map res = network_get("http://example.com") or_else do:
    print("Request failed: the network may be blocked, or this IDE environment may be the limit")
    res = {"status": 0, "ok": false, "body": ""}
end
if res["ok"] do:
    print(res["body"])
end
```

::: warn What about this browser IDE?
The behavior above is for the native `cuffc`. The IDE on this page compiles CuffScript to WebAssembly and runs it inside a browser tab, and a browser doesn't let a script open arbitrary TCP sockets at all. So it is safest to assume that `network_get` and `network_post` calls end in a failure that `or_else` has to catch in this IDE. To see real network requests, run a locally built `cuffc`.
:::

### `DLC:filesystem` {#dlc-filesystem}

These functions read and write real local files and folders next to the script. Every path is confined to **the same sandbox root** that `use ... from` uses to find modules (the folder the script is in, or a `--root` set by the host), so an attempt to escape with an absolute path or `../` is rejected with `FilesystemAccessDenied` ({{error.FilesystemAccessDenied}}) before anything is touched. Symbolic links that point outside the root are rejected too.

| Function | Result |
|---|---|
| `file_exist(path)` | Whether the regular file exists (a folder gives `false`) |
| `file_size(path)` | Its size in bytes, or `empty` on failure |
| `file_read(path)` | Its text, or `empty` on failure |
| `file_readlines(path)` | Its lines as a list, or `empty` on failure; Windows and Unix line endings give the same list |
| `file_write(path, text)` | Overwrites the file or creates it; `true` on success, `false` otherwise |
| `file_add(path, text)` | Appends text, creating the file if needed; `true` on success, `false` otherwise |
| `file_remove(path)` | Deletes a regular file and says whether it succeeded; a folder is never removed by it (use `file_removedir`) |
| `file_isdir(path)` | Whether the folder exists (a file gives `false`) |
| `file_list(path)` | The names in the folder, as a list of texts in byte order (files and folders mixed; `[]` for an empty folder), or `empty` when the path is not a folder or cannot be read. A name is not a path: join it with the folder, as `"reports/" + name` |
| `file_makedir(path)` | Makes the folder and the missing folders on the way to it; `true` when the folder exists afterwards, also when it was already there |
| `file_removedir(path)` | Removes an **empty** folder; `false` for a folder with anything in it, for a file, for a missing path, and for the allowed folder itself |
| `file_copy(from, to)` | Copies a regular file; `false` when `to` already exists, when `from` is not a regular file, or when the folder of `to` does not exist |
| `file_move(from, to)` | Renames or moves a file or a folder inside the allowed folder; `false` when `to` already exists or `from` does not |

Reading a file that does not exist gives `empty` instead of an error, so test the result with `is empty`.

```cuff
use DLC:filesystem

str path = "notes.txt"

print(file_exist(path))                         note: false
print(file_write(path, "line one\nline two"))   note: true
print(file_add(path, "\nline three"))           note: true, appends
print(file_size(path))                          note: number of bytes
print(file_readlines(path))                     note: ["line one", "line two", "line three"]

print(file_read("no_such_file.txt"))            note: empty, not an error

print(file_remove(path))                        note: true
print(file_exist(path))                         note: false
```

Nothing is replaced or deleted by surprise. `file_copy` and `file_move` stop at an existing destination, `file_removedir` takes only an empty folder, the allowed folder itself is never moved or removed, and no function removes a folder that has something in it: clearing a folder is a loop over `file_list` that removes each file. Writing a file into a folder that does not exist gives `false`, so make the folder first with `file_makedir`.

```cuff
use DLC:filesystem

file_makedir("export/old")
file_write("export/a.txt", "A")
file_write("export/b.txt", "B")
print(file_move("export/a.txt", "export/old/a.txt"))
print(file_copy("export/b.txt", "export/old/b.txt"), file_copy("export/b.txt", "export/old/b.txt"))
print(file_list("export"))
print(file_list("export/old"))
loop each str name in file_list("export") do:
    if file_isdir("export/" + name) do:
        print(name, "is a folder")
    end
end

file_remove("export/old/a.txt")
file_remove("export/old/b.txt")
file_remove("export/b.txt")
print(file_removedir("export"), file_removedir("export/old"), file_removedir("export"))
```

```output
true
true false
["b.txt", "old"]
["a.txt", "b.txt"]
old is a folder
false true true
```

::: warn It is blocked outright in this browser IDE
Unlike `DLC:network`, this is not "mostly fails" but a firm block. Instead of leaving each file operation as a failure for `or_else` to catch, this IDE refuses to run at all, with an immediate error, if `use DLC:filesystem` appears anywhere in the code. The sandbox "file system" on this page is a virtual store that holds the other tabs of this IDE project, so letting code read and write it would only be confusing. In a locally installed `cuffc` it works normally unless you pass `--no-filesystem`.
:::

### `DLC:hardware` {#dlc-hardware}

Lets a program ask about, and use, the parts of the device it runs on: its battery, buttons, lights, buzzer, screen, serial line, sensors and pins. CuffScript cannot reach any of them by itself. The **host** (the program that runs the script) decides which parts exist and supplies them, so hardware is off until a host turns a part on (`cuffc --hardware` does it for the command-line tool, and an embedding program supplies its own). The same program then runs on a laptop, a board or a robot, and asks `hw_supports` first. A part that is not there raises `HardwareUnsupported` ({{error.HardwareUnsupported}}), which `or_else` can catch.

| Function | Result |
|---|---|
| `hw_supports(part)` | Whether the device has the part and the host gives it. `part` is one of `"battery"`, `"button"`, `"led"`, `"beep"`, `"screen_text"`, `"serial"`, `"sensor"`, `"pin"`, `"pwm"` or `"analog"`. |
| `hw_battery()` | A map: `"level"` (0 to 100) and `"charging"` (a `boolean`). |
| `hw_button(button)` | `true` while the button is held down. |
| `hw_led(light, on)` | Turns the light on (`true`) or off (`false`). |
| `hw_beep(hertz, seconds)` | Sounds the buzzer; 880 Hz for 0.2 seconds when nothing is given. |
| `hw_screen_text(line, text)` | Shows `text` on a line of the device's screen, counted from 0. |
| `hw_serial()` and `hw_serial(text)` | What has arrived on the serial line since the last read (an empty text when nothing has; it does not wait), and sending `text` on it. |
| `hw_sensor(name)` | The reading of the sensor with that name, a number. The names are the host's; the usual ones are `"temperature"`, `"humidity"`, `"light"` and `"pressure"`. |
| `hw_pin(pin)` and `hw_pin(pin, high)` | Reads a digital pin (`true` for high), and sets it high or low. |
| `hw_pwm(pin, duty)` | Drives the pin with a pulse that is on for `duty` of the time, from 0 to 1. |
| `hw_analog(pin)` | Reads an analog input as a fraction of its range, from 0 to 1. |

The numbers that name a button, a light, a line of a screen or a pin are the host's own. `--hardware` gives a computer the parts it really has, such as a battery, a temperature sensor and the terminal's bell; a part the computer does not have is simply not supported.

```cuff
use DLC:hardware

print(hw_supports("battery"))
hw_led(1, true) or_else as Error e do:
    print(e.message)
end
```

```output
false
hw_led() is not supported on this device
```

In this browser IDE no hardware is supplied, so every part reports that it is not supported. A host that embeds the engine decides what to supply ([Embedding](#embedding-cpp)).
