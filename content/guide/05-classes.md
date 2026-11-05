---
group: Classes and objects
summary: Classes, objects, inheritance and the with block
---

## Classes {#classes}

A class bundles data (fields) with the functions that work on it (methods). It is declared at the top level of a file, its name starts with a capital letter, and it may be used above its declaration. Fields are declared with `set`, methods with `func`, and an optional method named `init` is the constructor. Inside a method, `self` is the object. `Player("Ann")` makes an object, and `ann.walk(3)` calls a method.

A member marked `private` can be used only by the methods of its class. Objects are shared when you assign them, like lists and maps: `is` compares identity, and `copy()` makes a separate copy, one level deep. If the class has a `to_str` method, `print` and f-strings use it; otherwise they show `<Player>`.

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

set Player alias to ann
alias.walk(2)
print(ann.x, ann is alias)

set Player twin to ann.copy()
twin.walk(100)
print(ann.x, twin.x)
```

```output
Ann is at 3 after 1 step(s)
5 true
5 105
```

Using a member the class doesn't declare raises `UnknownMember` ({{error.UnknownMember}}), and using a `private` member from outside the class raises `PrivateMemberAccess` ({{error.PrivateMemberAccess}}). Both can be caught with `or_else`.

```cuff error=PrivateMemberAccess
class Vault do:
    private set number code to 1234
end

set Vault v to Vault()
print(v.code)   note: PrivateMemberAccess, code is private
```

## Inheritance {#inheritance}

`class Square extends Rectangle do:` inherits the fields and methods of the parent class. A method with the same name replaces the parent's, `super.method()` calls the parent's version, and the parent's constructor is called explicitly with `super.init(...)`. `shape isa Shape` is true for objects of that class and of its descendants, and a parameter typed with the parent class accepts every child.

```cuff
class Shape do:
    set str name to "shape"

    func init(str name) do:
        change self.name to name
    end

    func area() do:
        return 0
    end

    func describe() do:
        return f"{self.name} with area {self.area()}"
    end
end

class Rectangle extends Shape do:
    set number width to 0
    set number height to 0

    func init(number width, number height) do:
        super.init("rectangle")
        change self.width to width
        change self.height to height
    end

    func area() do:
        return self.width * self.height
    end
end

class Square extends Rectangle do:
    func init(number side) do:
        super.init(side, side)
        change self.name to "square"
    end

    func describe() do:
        return super.describe() + ", all sides equal"
    end
end

set list shapes to [Rectangle(3, 4), Square(5)]
loop each shape in shapes do:
    print(shape.describe())
    print(shape isa Shape, shape isa Square)
end
```

```output
rectangle with area 12
true false
square with area 25, all sides equal
true true
```

## The with block {#with}

`with object do: ... end` lets you use an object's members by their plain names, or as `.name`, inside the block. A name is looked up as a variable of the block first, then as a member of the object, then in the rest of the program, and `.name` always means a member of the innermost `with`. A `with` block opens a scope of its own, and `return` works through it.

```cuff
class Robot do:
    set str name to "R2"
    set number y to 0

    func init(str name) do:
        change self.name to name
    end

    func move(number steps) do:
        change self.y to self.y + steps
    end

    func status() do:
        return f"{self.name} at y={self.y}"
    end
end

set Robot rover to Robot("Rover")
with rover do:
    move(3)
    move(2)
    print(status())
    print(.name)
end
```

```output
Rover at y=5
Rover
```
