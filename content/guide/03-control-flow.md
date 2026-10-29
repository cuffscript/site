---
group: Control flow
summary: Conditionals and loops, working with lists and maps
---

## Conditionals and loops {#conditionals-loops}

Branching looks like `if ... do: ... else if ... do: ... else do: ... end`. There are two loops: `loop repeat`, which runs over a range, and `loop while`, which runs while a condition is true. `stop` ends only the nearest loop immediately. Block statements must be indented, and every opener needs exactly one `end`.

```cuff
set number score to 85

if score >= 90 do:
    print("Excellent")
else if score >= 80 do:
    print("Good")
else do:
    print("Keep trying")
end

loop repeat i to 1 ~ 10 do:
    if i is 4 do:
        stop
    end
    print(f"Round: {i}")
end
```

```output
Good
Round: 1
Round: 2
Round: 3
```

`loop repeat` always runs over a number range, and both ends are included. If the start is larger than the end it counts down, and a range is never empty: `1 ~ 0` runs twice, for `1` and then `0`. Take care when the end comes from the length of a list that might be empty, since `1 ~ length(items)` then still runs twice.

```cuff
loop repeat i to 1 ~ 0 do:
    print(i)
end
```

```output
1
0
```

## Working with lists and maps {#collections}

Collections are handled with natural-language statements instead of methods: `add ... to ...` appends to a list, `change ... to ...` changes an index or key, and `remove ... from ...` removes. Assigning to a key that a map doesn't have creates a new key.

```cuff
set list inventory to ["sword", "shield"]
add "potion" to inventory
change inventory[1] to "magic_staff"
remove 2 from inventory

set map profile to {"name": "Bob"}
change profile["level"] to 50
remove "level" from profile
```
