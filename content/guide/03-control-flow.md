---
group: Control flow
summary: Conditionals and loops, working with lists and maps
---

## Conditionals and loops {#conditionals-loops}

Branching looks like `if ... do: ... else if ... do: ... else do: ... end`. There are three loops: `loop repeat` runs over a number range, `loop while` runs while a condition is true, and `loop each` visits what a collection holds. `stop` ends the nearest loop immediately, and `skip` moves on to its next pass. A loop does not open a scope, so its variable is still there afterwards. Block statements must be indented, and every opener needs exactly one `end`.

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

`loop repeat` runs over a number range, and both ends are included. If the start is larger than the end it counts down, and a range is never empty: `1 ~ 0` runs twice, for `1` and then `0`.

```cuff
loop repeat i to 1 ~ 0 do:
    print(i)
end
```

```output
1
0
```

`loop each` visits the items of a list, the keys of a map, or the characters of a text. Use it instead of counting up to a list's length, which would still run twice for an empty list.

```cuff
loop each word in ["red", "", "blue", "stop", "green"] do:
    if word is "" do:
        skip
    end
    if word is "stop" do:
        stop
    end
    print(word)
end

loop each key in {"a": 1, "b": 2} do:
    print(key)
end
```

```output
red
blue
a
b
```

## Working with lists and maps {#collections}

Collections are handled with natural-language statements instead of methods: `add ... to ...` appends to a list, `change ... to ...` changes an index or key, and `remove ... from ...` removes. All three work on anything that holds a value, however deep: the target is a name followed by any number of `[index]` and `.field`. Assigning to a key that a map doesn't have creates a new key.

```cuff
set list inventory to ["sword", "shield"]
add "potion" to inventory
change inventory[1] to "magic_staff"
remove 2 from inventory

set map profile to {"name": "Bob"}
change profile["level"] to 50
remove "level" from profile

set list grid to [[1, 2], [3, 4]]
add 5 to grid[1]          note: adds to the inner list
change grid[2][1] to 30   note: changes an item two levels down
print(grid)
```

```output
[[1, 2, 5], [30, 4]]
```

Lists, maps and objects are shared, not copied, when you assign them. `copy(x)` (also written `x.copy()`) makes a separate copy, one level deep.

```cuff
set list a to [1, 2, 3]
set list b to a
add 4 to b
set list c to copy(a)
add 5 to c
print(a, c)
```

```output
[1, 2, 3, 4] [1, 2, 3, 4, 5]
```
