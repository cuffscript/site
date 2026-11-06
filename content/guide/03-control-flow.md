---
group: Control flow
summary: Conditionals, loops, printing and input, working with lists and maps
---

## Conditionals {#conditionals}

An `if` statement runs its body only when its condition is true. You can add any number of `else if` branches and one final `else`; the first branch whose condition is true runs, and the others are skipped. A condition can be any value, and it is judged by the rules in [Truthiness](#truthiness): `false`, `0`, `empty`, an empty text, an empty list and an empty map count as false, and everything else as true. A variable that you create inside a branch belongs to the surrounding scope, because `if` does not open a scope of its own.

```cuff
set number score to 85

if score >= 90 do:
    print("Excellent")
else if score >= 80 do:
    print("Good")
else do:
    print("Keep trying")
end
```

```output
Good
```

## Loops {#loops}

CuffScript has three loops. Each one repeats its body, and each ends with `end`.

**`loop repeat`** counts through a range of whole numbers: `loop repeat i to 1 ~ 10 do:` runs the body once for each whole number from `1` to `10`, with `i` holding the current number. Both ends are included, they are worked out once before the first pass, and they must be whole numbers. If the start is larger than the end, the loop counts down. A range is never empty: `1 ~ 1` runs once, and `1 ~ 0` runs **twice**, with `i` equal to `1` and then `0`, because it counts down.

```cuff
loop repeat i to 1 ~ 3 do:
    print(i * i)
end

loop repeat k to 3 ~ 1 do:
    print(k)
end

loop repeat j to 1 ~ 0 do:
    print(j)
end
```

```output
1
4
9
3
2
1
1
0
```

**`loop while`** tests its condition before every pass and stops as soon as it is false. Make sure something in the body eventually changes the condition, or the loop never ends.

```cuff
set number n to 1
loop while n < 20 do:
    change n to n * 3
end
print(n)
```

```output
27
```

**`loop each`** visits what a collection holds: the elements of a list, the keys of a map (in the order they were added), or the characters of a text. An empty collection runs the body no times. The loop works from a snapshot taken when it starts, so adding to the list inside the body does not make the loop longer. This is the loop to use whenever you want to go through a list, because a `repeat` loop over its positions would run twice for an empty list.

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

loop each ch in "hey" do:
    print(ch)
end
```

```output
red
blue
a
b
h
e
y
```

Two statements steer a loop from inside its body. **`stop`** ends the nearest enclosing loop immediately. **`skip`** ends the current pass of the nearest enclosing loop and goes on with the next one. Either one outside a loop is an error (`StopOutsideLoop` ({{error.StopOutsideLoop}})).

**A loop does not open a scope.** The loop variable, and anything you declare in the body, are still there after the loop, holding their last values.

```cuff
loop repeat i to 1 ~ 3 do:
    set number squared to i * i
end
print(i, squared)
```

```output
3 9
```

## Printing and reading input {#print-input}

`print(a, b, ...)` writes its arguments separated by single spaces and ends the line. A text is written as it is, and any other value in its display form ([Text and f-strings](#text)). `print()` with no arguments writes an empty line, and an empty text argument still takes its place between the spaces.

`input()` reads one line from the standard input and gives it back as a `str`, without its line ending. `input("Name? ")` writes the prompt first. When the input is used up it returns the empty string, so a loop that reads until it sees a blank line also stops at the end of the input. In the IDE, the input comes from the stdin tab.

```cuff skip
set str answer to input("Name? ")
print("Hello,", answer)
```

## Working with lists and maps {#collections}

Collections are changed with three natural-language statements instead of methods. Each of them takes a **place**: a spot that holds a value. A place is a variable name, followed by any number of steps: `[index]` to go into a list or a map, and `.field` to go into an object. For example `inventory`, `grid[2]`, `grid[2][3]`, `player.score` and `team[1].tags[2]` are all places. A slice such as `x[1~2]` and the result of a call such as `f()` are not places.

| Statement | What it does |
|---|---|
| `change [place] to [value]` | Replaces what the place holds. For a list item that is the element at that position, for a map it sets or creates the key, and for a field it sets the field. |
| `add [value] to [place]` | Appends the value to the end of the list that the place holds. |
| `remove [position] from [place]` | When the first operand is a number, removes the element at that position of the list. |
| `remove [value] from [place]` | When the first operand is any other value, removes the first element equal to it (`ElementNotFound` ({{error.ElementNotFound}}) when there is none). |
| `remove "key" from [place]` | Deletes that key from the map the place holds. A key that is missing is ignored. |

Every step of a place before the last one is only *read*, so these statements change the collection that the place leads to, in place, and every name that refers to it sees the change.

```cuff
set list inventory to ["sword", "shield"]
add "potion" to inventory
change inventory[1] to "magic staff"
print(inventory)
remove 2 from inventory
print(inventory)
remove "potion" from inventory
print(inventory)

set map profile to {"name": "Bob"}
change profile["level"] to 50
print(profile)
remove "level" from profile
print(profile)
```

```output
["magic staff", "shield", "potion"]
["magic staff", "potion"]
["magic staff"]
{"name": "Bob", "level": 50}
{"name": "Bob"}
```

**Position or value.** `remove` decides by the *type* of its first operand: a number is always a position. To delete the number `20` from `[10, 20, 30]`, look its position up first with `index_of`, which comes with the `DLC:list` library ([Modules and libraries](#dlc)).

```cuff
use DLC:list
set list items to [10, 20, 30]
remove index_of(items, 20) from items
print(items)
```

```output
[10, 30]
```

**Positions must exist.** Position `0` raises `ZeroIndexAccess` ({{error.ZeroIndexAccess}}) and a position past the end raises `IndexOutOfRange` ({{error.IndexOutOfRange}}), for `change` and for `remove` alike. `add`, and `remove` with a position, need a list; using them on a map is an error.

**Nested collections.** Because a place can have any number of steps, the same three statements reach as deep as you like.

```cuff
set list grid to [[1, 2], [3, 4]]
add 5 to grid[1]          note: adds to the inner list
change grid[2][1] to 30   note: changes an item two levels down
print(grid)
```

```output
[[1, 2, 5], [30, 4]]
```

**Sharing and copying.** Lists, maps and objects are shared when you assign them, so a change made through one name shows through the other. `copy(x)` (also written `x.copy()`) makes a separate copy. The copy is shallow: a list or object stored inside it is still shared with the original.

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

**Looking inside a collection.** The functions `length`, `contains` and `index_of` are not available until a library that provides them is loaded: `length` and `contains` come with `DLC:string`, `DLC:list` or `DLC:map`, and `index_of` with `DLC:string` or `DLC:list`.

```cuff
use DLC:list
set list items to [10, 20, 30]
print(length(items), contains(items, 20), index_of(items, 30))
```

```output
3 true 3
```
