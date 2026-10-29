---
group: Pattern matching
summary: match / find / replace / split / count, quick reference
---

## Pattern matching: basics and tokens {#pattern-basics toc="Basics and tokens"}

Instead of the traditional regex symbols such as `\d`, `\w`, `^` and `$`, CuffScript uses readable bracket tokens like `[num]`. Checking with `is` / `IS` verifies, by default, that the **whole string** matches.

| Token | Meaning |
|---|---|
| `[num]` | One digit |
| `[let]` | One English letter |
| `[low]` / `[up]` | One lower-case / upper-case English letter |
| `[str]` | One English letter or digit |
| `[word]` | One English letter, digit or underscore (for identifiers) |
| `[sp]` | One whitespace character |
| `[nl]` | One line-break character (`\n` or `\r`; a Windows `\r\n` is two characters, so use `[nl]2`) |
| `[any]` | Any one character |
| `[int]` / `[float]` / `[hex]` | A signed integer / a decimal with digits on both sides of the point (`3.14`, but not `10`, `.5` or `1e5`) / one hexadecimal character |
| `[email]` / `[phone]` / `[url]` | Presets for an email address / a South Korean phone number / a URL |
| `[edge]` | Word boundary |
| `[start]` / `[end]` | Start / end of the string |
| `[one:a\|b]` | Choose one of the alternatives |
| `[abc]` / `[!abc]` | A set of characters / a negated set |
| `N` / `+` / `*` / `?` / `N~M` | Exactly N / one or more / zero or more / zero or one / N to M |
| `(...)` | Capture group (accessed 1-based) |
| `<name:...>` | Named capture |

To match a symbol itself, escape it with `\`. That is needed for `[`, `(`, `<`, `]`, `)`, `>` and `\`, and for a `~` that isn't part of a repeat range such as `3~5`. `+`, `*` and `?` need it only after something they could repeat. `|`, `.`, `:`, `!`, `{` and `}` are ordinary characters, and `|` is **not** alternation outside `[one:...]`: `"(a|b)"` matches the text `a|b`. As everywhere in the language, a colon inside a pattern may not have a space before it (`[one:a|b]` works, `[one :a|b]` is a syntax error).

```cuff
set str phone to "010-1234-5678"
set str filename to "photo.png"

if phone is "[num]3-[num]4-[num]4" do: print("Valid number") end
if filename is "[str]+\.[one:jpg|png|gif]" do: print("Image file") end
```

```output
Valid number
Image file
```

A few more examples make the tokens feel familiar:

```cuff
set str color to "#ff00aa"
set str sentence to "my cat sat on the mat"
set str code to "xyz"

note: hex color code ("#" followed by 6 hex characters)
if color is "#[hex]6" do: print("Valid color code") end

note: [edge] marks a word boundary, so "cat" matches but "category" would not
if find "[edge]cat[edge]" from sentence is not empty do: print("Cat mentioned") end

note: [!abc] means any character not in the set, here 3 non-vowels in a row
if code is "[!aeiou]3" do: print("3 letters with no vowels") end
```

```output
Valid color code
Cat mentioned
3 letters with no vowels
```

::: warn ReDoS protection
To prevent catastrophic backtracking from nested quantifiers that beginners easily write, such as `([any]+)+`, the engine limits the number of matching steps and the time spent. When a limit is exceeded, the run is stopped safely with a `Regex Runtime Error`.
:::

## match / find / replace / split / count {#pattern-commands}

`match` pulls out capture-group values. It searches the text for the first place the pattern matches, the way `find` does, and gives `empty` when nothing matches.

```cuff
set str serial to "SN-2026-998"
set match result to match serial from "SN-([num]4)-([num]+)"
if result is not empty do:
    print(f"Year: {result[1]}") note: "2026"
end

note: named captures are looked up by key, like a map
set match res to match "2026-12-25" from "<year:[num]4>-<month:[num]2>-<day:[num]2>"
print(res["year"])
```

`find` searches for a part of the text. On its own it returns the first matching string; with the `g` flag it returns every match as a 1-based list. When nothing matches, a plain `find` gives `empty` and `find ... g` gives an empty list `[]`.

```cuff
set str article to "Ticket numbers: T-123, T-456"
set list tickets to find "T-[num]3" from article g
print(tickets[1])
```

```output
T-123
```

`replace` swaps the parts that match a pattern for another string. Add `g` to replace every match.

```cuff
set str phone_log to "Call log: 010-1234-5678"
set str masked to replace "[num]4-[num]4" in phone_log to "****-****"
print(masked)
```

```output
Call log: 010-****-****
```

`split` divides a string around a pattern.

```cuff
set list parts to split "apple, banana,cherry" by ",[sp]*"
```

`count` counts how many times a pattern appears. It gives `0` when there are none.

```cuff
set str article to "Ticket numbers 12 and 34"
print(count "[num]+" in article)
```

```output
2
```

Flags can follow `find`, `match`, `count` and `replace`: `i` (ignore case), `g` (all matches) and `m` (multi-line). To use several, write them together, like `gi`.

## Quick reference {#pattern-reference}

```text
[Character tokens]
  [num] [let] [low] [up] [str] [word] [sp] [nl] [any]

[Preset tokens]
  [int] [float] [hex] [email] [phone] [url] [edge] [start] [end]

[Quantifiers]
  N   +   *   ?   N~M   N~   ~M   (add ? after one to make it lazy)

[Choice and sets]
  [one:a|b]   [abc]   [!abc]

[Groups]
  (...)        capture group, 1-based index
  <name:...>   named capture

[Commands]
  is / IS    match    find (g)    replace ... to ... (g)    split ... by ...    count ... in ...
  Flags: i (ignore case)  g (all matches)  m (multi-line)
```
