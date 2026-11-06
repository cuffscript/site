---
group: Pattern matching
summary: Pattern literals, tokens, quantifiers, captures, and the text functions
---

## What patterns are for {#pattern-basics toc="What patterns are for"}

A **pattern** describes text by its shape instead of by exact characters: "three digits, a dash, four digits" rather than one particular phone number. You use patterns to check that text has the right format, to pull values out of text, to find every part of a text that fits, to replace or split text, and to count matches.

Where other languages use regular-expression symbols such as `\d`, `\w`, `^` and `$`, CuffScript uses readable bracket words: `[num]` is one digit, `[let]` is one English letter, `[sp]` is a space. Those words are the *tokens* of the pattern language, and this page introduces them in groups. A pattern is written as a **pattern literal**:

```cuff
set str phone to "010-1234-5678"
if phone matches p"[num]3-[num]4-[num]4" do:
    print("Valid number")
end
```

```output
Valid number
```

## Writing a pattern {#pattern-literals}

A pattern literal is `p"..."`. Three facts about it:

- **It is raw.** The text between the quotes goes to the pattern parser exactly as written, so a backslash is written once (`p"\."`, not `"\\."`). The only thing the literal itself reads is `\"`, which is a quote.
- **It is checked when the program is read.** A mistake in a pattern is reported before anything runs.
- **Flags follow the closing quote**, with no space: `i` ignores upper and lower case, and `m` makes `[start]` and `[end]` work on every line. They can be combined as `im`. See [Flags](#pattern-flags).

A pattern is a value of the type `pattern`. You can keep it in a variable (`set pattern digits to p"[num]+"`), pass it to a function, and compare two of them with `is` (equal when their text and flags are the same). To build a pattern while the program is running, use `pattern(text)` or `pattern(text, flags)`; a mistake in the text is then raised at that call.

**`matches` and the whole text.** `text matches pattern` is true only when the **whole** text fits the pattern. The left side must be a text and the right side a pattern. `matches` is a comparison, so `!` negates it without parentheses. To look for a pattern *inside* a text, use the functions in [Using patterns](#pattern-commands). Note that `is` never reads a text as a pattern: `code is "[num]4"` compares the text with those exact characters.

```cuff
set str answer to "YES"
print(answer is "yes", answer matches p"yes", answer matches p"yes"i)
print("a1" matches p"[let][num]", "a12" matches p"[let][num]", !"a12" matches p"[let][num]")
```

```output
false false true
true false true
```

## Tokens for one character {#pattern-characters}

| Token | Matches exactly one |
|---|---|
| `[num]` | digit |
| `[let]` | English letter |
| `[low]` / `[up]` | lower-case / upper-case English letter |
| `[str]` | English letter or digit |
| `[word]` | English letter, digit or underscore (what an identifier is made of) |
| `[sp]` | whitespace character |
| `[nl]` | line-break character (`\n` or `\r`; a Windows `\r\n` is two characters, so use `[nl]2`) |
| `[any]` | character of any kind |

`[let]`, `[str]` and `[word]` mean **English** letters only, so they do not match accented letters or Hangul. `[any]` does match them, and patterns work per character, not per byte, so one accented letter or one Hangul syllable counts as one.

```cuff
set str word to "héllo"
print(word matches p"[let]+", word matches p"[any]5")
```

```output
false true
```

### Your own sets

Write characters inside brackets to make a set. `[abc]` is one of `a`, `b` or `c`, and `[a-z]` is a range (the start of a range may not come after its end). An exclamation mark first makes the set a negation: `[!0-9]` is any character that is not a digit. Inside a set every character stands for itself and nothing is escaped, which has a few consequences:

- A word that is not one of the named tokens is a set of its letters. `[nope]` is not an error; it matches one of `n`, `o`, `p` or `e`. A misspelt token such as `[nun]` therefore quietly matches the wrong thing, so check your spelling.
- `^` is an ordinary member, not negation: `[^a]` matches `^` or `a`. Negation is `!`.
- A set ends at the first `]`, so `]` cannot be a member. Match it outside a set, as `\]`.

```cuff
print("3" matches p"[1234]", "x" matches p"[a-z]")
print("7" matches p"[!0-9]", "%" matches p"[!0-9]", "n" matches p"[nope]")
```

```output
true true
false true true
```

## Repeating: counts and quantifiers {#pattern-quantifiers}

Put a repeat after a token to say how many times it may appear.

| Repeat | Meaning |
|---|---|
| `N` (a number) | Exactly N times: `[num]6` is six digits |
| `+` | One or more times |
| `*` | Zero or more times |
| `?` | Zero times or once |
| `N~M` | At least N and at most M times |
| `N~` | At least N times |
| `~M` | At most M times |

A run of digits is a count only when it directly follows something that consumes characters: a bracket token or set, a `[one:...]` choice, a `(...)` group or a `<name:...>` capture. After a plain character or an anchor such as `[start]`, digits are ordinary text. So `p"v2"` matches the text `v2` and `p"010-[num]4-[num]4"` matches `010-1234-5678`. The one thing this rules out is a literal digit straight after a token, because the digit would be read as part of the count: write `[num]4[one:5]` for four digits followed by a 5.

```cuff
print("123456" matches p"[num]6", "AB" matches p"[up]3")
print("v2" matches p"v2", "010-1234-5678" matches p"010-[num]4-[num]4")
print("http" matches p"https?", "https" matches p"https?", "httpss" matches p"https?")
print("abcdefgh" matches p"[str]8~16", "abc" matches p"[str]8~16")
```

```output
true false
true true
true true false
true false
```

**Greedy and lazy.** The repeats `+`, `*` and `~` are *greedy*: they take as much text as they can. Adding `?` right after one makes it *lazy*, so it takes as little as possible. This matters when you search inside text:

```cuff
set str html to "<b>one</b> and <b>two</b>"

note: greedy: from the first <b> to the very last </b>
print(find(html, p"\<b\>[any]+\</b\>"))

note: lazy: stops at the nearest </b>
print(find(html, p"\<b\>[any]+?\</b\>"))
```

```output
<b>one</b> and <b>two</b>
<b>one</b>
```

## Groups and choices {#pattern-groups}

Parentheses `(...)` bundle several tokens into one unit, so a repeat can apply to the whole bundle. They also *capture* the text they matched ([Captures](#pattern-captures)). The token **`[one:a|b|c]`** matches exactly one of the listed words or symbols. The `|` has this meaning only inside `[one:...]`; elsewhere it is an ordinary character.

```cuff
print("ABABAB" matches p"(AB)3", "12-ab34-cd" matches p"([num]2-[let]2)+")
print("png" matches p"[one:jpg|png|gif]", "bmp" matches p"[one:jpg|png|gif]")
```

```output
true true
true false
```

## Positions: start, end and word edge {#pattern-anchors}

These tokens match a *position* and consume no characters. `[start]` is the very beginning of the text, `[end]` is the very end, and `[edge]` is a word boundary: the point between a word and what is not a word (a space, punctuation, or the start or end of the text). They matter when you search inside a text with `find` and similar functions, because `matches` already needs the whole text to fit. `[edge]` stops a short word from matching inside a longer one.

```cuff
set str message to "NOTICE: maintenance is starting."
print(find(message, p"[start]NOTICE:"))
print(find(message, p"[start]maintenance"))
print(find(message, p"starting\.[end]"))

set str sentence to "The category of catalog is books"
print(find_all(sentence, p"[edge]cat[edge]"))
print(find_all("a cat sat", p"[edge]cat[edge]"))
```

```output
NOTICE:
empty
starting.
[]
["cat"]
```

## Ready-made tokens {#pattern-presets}

| Token | Matches |
|---|---|
| `[int]` | A signed integer |
| `[float]` | A decimal with digits on both sides of the point (`3.14`, but not `10`, `.5` or `1e5`) |
| `[hex]` | One hexadecimal character |
| `[email]` | An email address |
| `[phone]` | A South Korean phone number |
| `[url]` | A URL |

```cuff
print("-42" matches p"[int]", "3.14" matches p"[float]", "10" matches p"[float]", "ff" matches p"[hex]2")
print("ann@example.com" matches p"[email]")
```

```output
true true false true
true
```

## Escaping symbols {#pattern-escaping}

To match a symbol itself, put a backslash in front of it. That is needed for `[`, `(`, `<`, `]`, `)`, `>` and `\`, and for a `~` that is not part of a repeat such as `3~5`. The characters `+`, `*` and `?` need it only after something they could repeat. The characters `|`, `.`, `:`, `!`, `{` and `}` are ordinary, and note that `|` is **not** alternation outside `[one:...]`: `p"(a|b)"` matches the text `a|b`. The angle brackets need escaping because `<` and `>` open and close a named capture. As everywhere in the language, a colon inside a pattern may not have a space before it (`[one:a|b]` works, `[one :a|b]` is a syntax error).

```cuff
print("a<b" matches p"a\<b", "(x)" matches p"\(x\)")
print("a|b" matches p"(a|b)", "a" matches p"(a|b)", "a" matches p"[one:a|b]")
```

```output
true true
true false true
```

## Using patterns: match, find, replace, split, count {#pattern-commands}

Seven built-in functions work on text and patterns. They need no `use`, and the text is always the first argument and the pattern the second. They search *inside* the text (use `[start]` and `[end]` to pin a pattern to the edges). A text where a pattern is expected is an error, and its hint tells you to write `p"..."` or `pattern(text)`.

| Function | Result | When nothing matches |
|---|---|---|
| `match(text, p)` | A `match` value with the captures of the first match | `empty` |
| `find(text, p)` | The first matching text | `empty` |
| `find_all(text, p)` | A list of every matching text | `[]` |
| `replace(text, p, new)` | The text with the first match replaced | The text, unchanged |
| `replace_all(text, p, new)` | The text with every match replaced | The text, unchanged |
| `split(text, p)` | A list of the pieces between matches | A list with the whole text |
| `count(text, p)` | How many times the pattern matches | `0` |

Matches are found from left to right and never overlap. The replacement is used as plain text, and `split` keeps empty pieces.

```cuff
set str article to "Ticket numbers: T-123, T-456"
set list tickets to find_all(article, p"T-[num]3")
print(tickets[1])
print(find(article, p"T-[num]3"), count(article, p"T-[num]3"), count("abc", p"[num]"))

print(replace("a-b-c", p"-", "+"), replace_all("a-b-c", p"-", "+"))
print(replace_all("too   many    spaces", p"[sp]+", " "))

set str phone_log to "Call log: 010-1234-5678"
print(replace(phone_log, p"[num]4-[num]4", "****-****"))

print(split("apple, banana,cherry", p",[sp]*"))
print(split("a,,b", p","))
```

```output
T-123
T-123 2 0
a+b-c a+b+c
too many spaces
Call log: 010-****-****
["apple", "banana", "cherry"]
["a", "", "b"]
```

Use `find` when you want the text that matched, declared as a `str`, and use `match` when you want the pieces inside it.

## Captures {#pattern-captures}

A **capture** is the part of the text that a group matched. `match` returns a `match` value that holds them. Captures are numbered from **1**, in the order of their opening parentheses, and a negative number counts from the end (`result[-1]` is the last one). A group that did not take part in the match is captured as an empty text, and a group that repeats holds its last repetition. `result[0]`, a position past the last capture, or a name that was not captured is an error.

Instead of numbers you can give a capture a **name** with `<name:...>` and look it up by key, like a map. Named and numbered captures are counted separately: a pattern with only named captures has no `result[1]`.

```cuff
set match result to match("order SN-2026-998 shipped", p"SN-([num]4)-([num]+)")
if result is not empty do:
    print(result[1], result[2], result[-1])
end
print(match("nothing here", p"SN-([num]4)"))

set match res to match("2026-12-25", p"<year:[num]4>-<month:[num]2>-<day:[num]2>")
print(f"{res['day']}/{res['month']}/{res['year']}")
```

```output
2026 998 998
empty
25/12/2026
```

A `match` value is shown as `<match "text">`, where `text` is the whole text that matched, and `type_of` names it `match`. Because a failed `match` gives `empty` rather than a `match`, always test with `is empty` before using the captures. A `match` cannot be passed to `length` or `to_json`; copy the captures you need into a list or map first.

## Flags {#pattern-flags}

| Flag | Name | Effect |
|---|---|---|
| `i` | Ignore case | Matches English letters without telling upper and lower case apart (only `A`-`Z` and `a`-`z`) |
| `m` | Multi-line | Makes `[start]` and `[end]` match at the start and end of every line, not only of the whole text |

A flag belongs to the pattern, so it applies wherever the pattern is used. Each flag may appear once, and a letter that is not a flag is a syntax error. There is no flag for "every match": that is what `find_all` and `replace_all` do.

```cuff
set str logs to "Error:12 ok ERROR:7"
print(find_all(logs, p"error:[num]+"i))

set str text to "first\nsecond"
print(find_all(text, p"[start][let]+"m))
print(find_all(text, p"[start][let]+"))

set str word to "cat"
print("Cat" matches pattern(word, "i"), find_all("a CAT sat", pattern("[edge]" + word + "[edge]", "i")))
```

```output
["Error:12", "ERROR:7"]
["first", "second"]
["first"]
true ["CAT"]
```

## Safety and errors {#pattern-safety}

A syntax error in a pattern literal is reported before the program runs, and it cannot be caught by `or_else` (the same holds for the error of a bad `pattern(...)` text, which ends the program). Nested repeats such as `([any]+)+` can make a search take an enormous number of steps. To prevent that, the engine limits the number of matching steps and the time spent; when a limit is exceeded, the run stops safely with a runtime pattern error, which `or_else` can catch.

## Quick reference {#pattern-reference}

```text
[One character]
  [num] [let] [low] [up] [str] [word] [sp] [nl] [any]
  [abc] [a-z] [!abc]

[Ready-made]
  [int] [float] [hex] [email] [phone] [url]

[Repeats]
  N   +   *   ?   N~M   N~   ~M   (add ? after one to make it lazy)

[Choices and groups]
  [one:a|b]
  (...)        capture group, numbered from 1
  <name:...>   named capture

[Positions]
  [start] [end] [edge]

[Using a pattern]
  p"..."     raw literal; flags i (ignore case) and m (multi-line) after the quote
  text matches p"..."          the whole text fits the pattern
  match(text, p)   find(text, p)   find_all(text, p)
  replace(text, p, new)   replace_all(text, p, new)
  split(text, p)   count(text, p)   pattern(text [, flags])
```
