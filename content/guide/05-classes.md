---
group: Classes and objects
summary: Classes, objects, private members, inheritance, the with block
---

## Classes and objects {#classes}

A **class** describes a kind of thing: the values it holds (its *fields*) and what it can do (its *methods*). An **object** is one thing of that kind, made from the class, and it carries its own values. Use a class when several values and the functions that work on them belong together, such as a player with a name, a position and a way to walk.

```cuff
class Player do:
    set str name to "unknown"
    set number x to 0
    private set number steps to 0

    func init(str name, number x to 0) do:
        change self.name to name
        change self.x to x
    end

    func walk(number distance) do:
        change self.x to self.x + distance
        change self.steps to self.steps + 1
    end

    func report() do:
        return f"{self.name} is at {self.x} after {self.steps} step(s)"
    end
end

set Player ann to Player("Ann")
ann.walk(3)
print(ann.report())
```

```output
Ann is at 3 after 1 step(s)
```

### Declaring a class

A class is declared with `class Name do: ... end`. Its body holds field declarations and method declarations, and nothing else.

- The name starts with a capital letter (`InvalidClassName` ({{error.InvalidClassName}}) otherwise).
- A class is declared at the top level of a file, never inside a block or a function (`ClassNotTopLevel` ({{error.ClassNotTopLevel}})). A class declared in a module is visible to the whole program once the module is loaded.
- Classes and functions share one name space: a class cannot have the name of a function, of another class, or of the built-in `Error` (`ClassNameConflict` ({{error.ClassNameConflict}})).
- Like functions, classes exist from the start of the program, so a class may be used above the place where it is written.

### Fields

A field is declared with the words of a variable: `set [constant] type name to value`. The default value is worked out again for every object, so each object gets its own list or map. The default cannot use `self`. The set of fields is fixed: reading or writing a field that the class does not have raises `UnknownMember` ({{error.UnknownMember}}), and the message lists the fields it does have, which catches a misspelt name. The declared type is checked on the default value only; a later `change` does not check the type. A `constant` field is written in capitals, can be set while `init` runs, and cannot be changed afterwards.

A field is read and written with a dot, as in `player.name` and `change player.x to 5`. Fields are places like any other, so `add item to self.items` and `change self.grid[2][3] to 0` work on what a field holds.

### Methods

A method is a function declared in a class body, and it follows the rules of functions: it sees only its own variables and the ones linked with `global`, and `return` works anywhere in it. In addition:

- The object that the method was called on is **`self`**. A field is always written `self.name`; a bare `name` in a method is a variable of the method.
- A method is called with a dot and parentheses: `player.walk(3)`. A method is not a value, so `player.walk` without parentheses raises `MethodNotCalled` ({{error.MethodNotCalled}}), and so does calling a field.
- A method can be `async` or `pure`. A queued `async` method runs later with the object it was called on, and `await object.method()` runs it now.

### Making an object

A class is used like a function: `Player("Ann")`. There is no `new`. Three things happen, in order: the object is allocated, the default of every field is worked out (from the oldest ancestor down to the class itself), and then the nearest method named **`init`** runs with the arguments of the call. `init` is the constructor. It is an ordinary method, and its parameters may have defaults. A class without an `init` takes no arguments. If `init` raises an error, no object is made.

### Objects are shared, and `copy` makes a new one

An object is held by reference, like a list or a map: giving it a second name does not copy it, and a change through either name is seen through both. `is` on two objects asks whether they are the *same* object, never whether their fields are equal. `copy()` makes a new object of the same class with the same field values. The copy is shallow: a field that holds a list or an object is shared between the two objects.

```cuff
class Point do:
    set number x to 0
    set number y to 0
end

set Point a to Point()
set Point b to a
set Point c to a.copy()
change b.x to 5
print(a.x, c.x, a is b, a is c)
```

```output
5 0 true false
```

### Showing an object

`print`, an f-string and `to_str` use the object's `to_str()` method when its class has one, and show `<ClassName>` when it does not. The method must return a text. The fields are not shown by default; write a `to_str` for that. (`init` and `to_str` are the two method names that the language gives a meaning to.)

```cuff
class Point do:
    set number x to 0
    set number y to 0

    func to_str() do:
        return f"({self.x}, {self.y})"
    end
end

class Blank do:
end

print(Point(), f"at {Point()}", Blank())
```

```output
(0, 0) at (0, 0) <Blank>
```

## Private members {#private}

Put `private` in front of a field or a method to hide it outside the class that declares it. A private member can be used only inside the methods of that class, so outside code has to go through the methods you chose to offer. Two objects of one class can use each other's private members. A child class cannot see the private members of its parent, but a method that it inherits runs as part of the parent and can. A private field is left out of the text that `print` shows and of `to_json`. There is no `protected`.

```cuff
class Account do:
    private set number balance to 0

    func deposit(number amount) do:
        change self.balance to self.balance + amount
    end

    func report() do:
        return f"balance: {self.balance}"
    end
end

set Account a to Account()
a.deposit(40)
print(a.report())
```

```output
balance: 40
```

Writing `a.balance` outside the class raises `PrivateMemberAccess` ({{error.PrivateMemberAccess}}).

```cuff error=PrivateMemberAccess
class Vault do:
    private set number code to 1234
end

set Vault v to Vault()
print(v.code)   note: PrivateMemberAccess, code is private
```

## Inheritance {#inheritance}

`class Square extends Rectangle do: ... end` makes `Square` a *child* of `Rectangle`. A child has every field and method of its parent and of the parent's parent, and so on. A class can have only one parent.

- A method with the same name in the child **replaces** the parent's for objects of the child. There is no `override` word.
- `super.name(arguments)` calls the parent's version on the same object. It is available only in a method of a class that has a parent.
- A child that does not define `init` uses its parent's. A child that defines `init` does not get the parent's automatically: call it with `super.init(...)` when you need it.
- A child cannot declare a field or method that has the name of one it already has (`DuplicateMember` ({{error.DuplicateMember}})). A class cannot extend itself, directly or through its ancestors, and it can extend only a class (`InvalidInheritance` ({{error.InvalidInheritance}})).

```cuff
class Animal do:
    set str name to "animal"

    func init(str name) do:
        change self.name to name
    end

    func speak() do:
        print(f"{self.name} makes a sound")
    end
end

class Dog extends Animal do:
    set number tricks to 0

    func init(str name, number tricks to 0) do:
        super.init(name)
        change self.tricks to tricks
    end

    func speak() do:
        super.speak()
        print(f"{self.name} barks")
    end
end

set Dog rex to Dog("Rex", 3)
rex.speak()
print(rex.tricks)
```

```output
Rex makes a sound
Rex barks
3
```

### Types and `isa`

A class name can be written wherever a type can: in `set Player p to ...`, in a parameter (`func f(Player p)`) and in a field. A value of a child class is accepted where its parent is wanted, so a parameter typed with the parent accepts every child. The type `object` accepts any object. `value isa ClassName` is true when `value` is an object of that class or of one of its descendants, and false for every other value. Because `isa` is a comparison, `!` negates it without parentheses. `type_of(object)` gives the name of its class as text.

```cuff
class Animal do:
end

class Dog extends Animal do:
end

set Animal pet to Dog()
print(pet isa Animal, pet isa Dog, type_of(pet))
print(1 isa Animal, Animal() isa Dog)
```

```output
true true Dog
false false
```

## The with block {#with}

`with object do: ... end` lets a block use the members of one object without writing its name each time. The object is worked out once, when the block starts, and it must be an object (`NotAnObject` ({{error.NotAnObject}})).

- A plain name is looked up in this order: a variable made inside the block, then a member of the object (a method when it is called, a field otherwise), then the rest of the program. Members come before outer names on purpose: what a name means is decided by the class and does not change when a variable of that name appears elsewhere.
- `.name` always means a member of the object of the **innermost** `with`. Use it when a plain name could mean something else. It is a syntax error outside a `with` block.
- `with` blocks can be nested. A name is looked for in the inner object first, then in the next one out.
- A variable made with `set` inside the block is gone after its `end`. `return`, `stop`, `skip`, `await` and `or_else` work through a block as if it were not there.
- Inside a method, `self` is still the object the method was called on, not the object of a `with` inside it. A private member stays private: `with` does not open it.

`player.walk(3)` and `with player do: walk(3) end` do the same thing.

```cuff
class Robot do:
    set str name to "R2"
    set number y to 0

    func move(number steps) do:
        change self.y to self.y + steps
    end

    func status() do:
        return f"{self.name} at {self.y}"
    end
end

set Robot rover to Robot()

with rover do:
    move(3)
    move(2)
    print(status())
    change y to y + 10
    print(.y)
end
```

```output
R2 at 5
15
```

## Objects and JSON {#objects-json}

`to_json(object)` (from `DLC:json`) writes the **public** fields in the order they were declared, the parent's first, with nested objects, lists and maps written the same way. Methods and private fields are not written. `from_json` always gives back a map, so build an object from it in your own code.

```cuff
use DLC:json

class Item do:
    set str name to "pen"
    private set number cost to 3
end

class Box extends Item do:
    set list tags to ["new"]
end

print(to_json(Box()))
```

```output
{"name":"pen","tags":["new"]}
```

Errors are objects too: the built-in class `Error` and the classes that extend it are described in [Error handling](#error-objects).
