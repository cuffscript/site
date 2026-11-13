---
type: features
id: highlights
title: Highlights
---

What sets CuffScript apart, in six short programs. Every snippet here is run by the real engine when the site is built, so the output shown is the output you get.

### Reads like plain English

Keywords are words you already know: `if`, `loop`, `and`, `or`, `is`, `do:` and `end`. A variable is declared with its type, as in `number age = 25`, and changed with a plain `=`. A block opens with `do:` and closes with `end`, so you can always see where it starts and stops.

```cuff
number age = 25
age = age + 1
if age >= 18 do:
    print("adult")
end
```

```output
adult
```

### Counting starts at 1

The first item of a list or a text is number 1, a slice includes both of its ends, and `-1` is the last item. It is the way people count.

```cuff
list colors = ["red", "green", "blue"]
print(colors[1], colors[-1], colors[2~3])
```

```output
red blue ["green", "blue"]
```

### Patterns you can read

Describe text with words like `[num]` and `[let]` instead of cryptic symbols, then use the pattern to check, find, replace or split text.

```cuff
str phone = "010-1234-5678"
print(phone matches p"[num]3-[num]4-[num]4")
print(replace(phone, p"[num]4-[num]4", "****-****"))
```

```output
true
010-****-****
```

### Errors you can handle

A statement that fails can be recovered on the spot with `or_else`, and your own program can raise errors with `fail`. When an error does stop a program, the report shows the line, points at the problem and often says how to fix it.

```cuff
number n = to_number("abc") or_else do:
    print("not a number, using 0")
    n = 0
end
print(n)
```

```output
not a number, using 0
0
```

### Classes without ceremony

Fields, methods, inheritance and private members, with `self` to mean the object and no boilerplate around it.

```cuff
class Dog do:
    str name = "Rex"

    func speak() do:
        return f"{self.name} says woof"
    end
end

print(Dog().speak())
```

```output
Rex says woof
```

### Runs anywhere

The same engine runs in your browser as WebAssembly (the IDE on this site), as the command-line tool `cuffc`, and inside your own JavaScript, TypeScript or C++ project.

```bash
npm install cuffscript-wasm
```
