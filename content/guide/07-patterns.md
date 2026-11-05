---
group: Pattern matching
summary: Pattern literals, matches, match / find / replace / split / count, quick reference
---

## Pattern matching: basics and tokens {#pattern-basics toc="Basics and tokens"}

A pattern is written as a pattern literal, `p"..."`. Instead of the traditional regex symbols such as `\d`, `\w`, `^` and `$`, it uses readable bracket tokens like `[num]`. The text between the quotes goes to the pattern parser exactly as written (the literal is *raw*), so a backslash is written once; the only escape the literal itself reads is `\"`. Flags follow the closing quote: `i` ignores case, and `m` makes the pattern multi-line.

`text matches p"..."` checks that the **whole** text fits the pattern. A pattern is also a value of type `pattern`: keep it in a variable (`set pattern digits to p"[num]+"`), pass it to a function, or build one while the program runs with `pattern(text)` or `pattern(text, "i")`. `is` never reads a string as a pattern.

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

To match a symbol itself, escape it with `\`. That is needed for `[`, `(`, `<`, `]`, `)`, `>` and `\`, and for a `~` that isn't part of a repeat range such as `3~5`. `+`, `*` and `?` need it only after something they could repeat. `|`, `.`, `:`, `!`, `{` and `}` are ordinary characters, and `|` is **not** alternation outside `[one:...]`: `p"(a|b)"` matches the text `a|b`. As everywhere in the language, a colon inside a pattern may not have a space before it (`[one:a|b]` works, `[one :a|b]` is a syntax error).

```cuff
set str phone to "010-1234-5678"
set str filename to "photo.png"

if phone matches p"[num]3-[num]4-[num]4" do: print("Valid number") end
if filename matches p"[str]+\.[one:jpg|png|gif]" do: print("Image file") end
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
if color matches p"#[hex]6" do: print("Valid color code") end

note: [edge] marks a word boundary, so "cat" matches but "category" would not
if find(sentence, p"[edge]cat[edge]") is not empty do: print("Cat mentioned") end

note: [!abc] means any character not in the set, here 3 non-vowels in a row
if code matches p"[!aeiou]3" do: print("3 letters with no vowels") end
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

These are ordinary functions that take the text first and the pattern second. `match` pulls out capture-group values. It searches the text for the first place the pattern matches, the way `find` does, and gives `empty` when nothing matches.

```cuff
set str serial to "SN-2026-998"
set match result to match(serial, p"SN-([num]4)-([num]+)")
if result is not empty do:
    print(f"Year: {result[1]}")
end

note: named captures are looked up by key, like a map
set match res to match("2026-12-25", p"<year:[num]4>-<month:[num]2>-<day:[num]2>")
print(res["year"])
```

`find` returns the first matching string, and `find_all` returns every match as a 1-based list. When nothing matches, `find` gives `empty` and `find_all` gives an empty list `[]`.

```cuff
set str article to "Ticket numbers: T-123, T-456"
set list tickets to find_all(article, p"T-[num]3")
print(tickets[1])
```

```output
T-123
```

`replace` swaps the first match for another string, and `replace_all` swaps every match.

```cuff
set str phone_log to "Call log: 010-1234-5678"
set str masked to replace(phone_log, p"[num]4-[num]4", "****-****")
print(masked)
```

```output
Call log: 010-****-****
```

`split` divides a string around a pattern.

```cuff
set list parts to split("apple, banana,cherry", p",[sp]*")
```

`count` counts how many times a pattern appears. It gives `0` when there are none.

```cuff
set str article to "Ticket numbers 12 and 34"
print(count(article, p"[num]+"))
```

```output
2
```

With a library such as `DLC:string` loaded, these can also be written as methods on the text: `article.find(p"T-[num]3")` is `find(article, p"T-[num]3")`. Flags go after the closing quote of the literal, as in `p"yes"i`, and can be combined, as in `p"^x"im`.

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

[Using a pattern]
  p"..."     pattern literal, raw; flags i (ignore case) and m (multi-line) after the quote
  text matches p"..."          the whole text fits the pattern
  match(text, p)   find(text, p)   find_all(text, p)
  replace(text, p, new)   replace_all(text, p, new)
  split(text, p)   count(text, p)
```
