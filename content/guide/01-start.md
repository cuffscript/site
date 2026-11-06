---
group: Getting started
home: false
---

## What is CuffScript {#intro}

CuffScript is a small, interpreted programming language designed to be easy to read for people who are just starting out. Its code reads close to plain English: you `set` a variable `to` a value, you `change` it later, and every block of code opens with `do:` and closes with `end`. A few choices are deliberate, and you will meet them on every page of this guide:

- **Counting starts at 1.** The first item of a list and the first character of a text are at position `1`, and a slice includes both of its ends.
- **Patterns are readable.** Instead of regular-expression symbols such as `\d` or `\w`, you write bracket words like `[num]` and `[str]`.
- **Errors are meant to be handled.** `or_else` recovers from a statement that failed, and `fail` raises an error of your own.
- **The language is small on purpose.** There are no closures, no `==` (equality is written `is`) and no multiple inheritance. What does exist is described completely in this guide.

The guide is written to be read from top to bottom. Each page teaches one area, explains its rules, and then shows examples. Every example on these pages is run against the real engine when the site is built, so the output you see is the output you get.

## Your first program {#first-program}

A program is a text file of statements. The engine reads it from the top and runs one statement after another. `print(...)` writes its arguments to the output, separated by spaces, and ends the line.

```cuff
print("Hello, CuffScript!")
set str name to "Ann"
print("Nice to meet you,", name)
```

```output
Hello, CuffScript!
Nice to meet you, Ann
```

Three things are worth noticing already. Each statement sits on its own line. Text is written between quotes. And `set str name to "Ann"` creates a variable called `name` that holds a `str` (a piece of text); `print` can then use it like any other value.

## The shape of a program {#shape}

Most programs are built from the same few parts: variables, conditions, loops and functions. The example below uses all of them. You do not need to understand every word yet; read it once, because the following pages explain each part in detail.

```cuff
note: a function that says whether a number is even
func is_even(number n) do:
    return n % 2 is 0
end

set number total to 0
loop repeat i to 1 ~ 5 do:
    if is_even(i) do:
        change total to total + i
    end
end
print("The even numbers from 1 to 5 add up to", total)
```

```output
The even numbers from 1 to 5 add up to 6
```

Read it like this. `func ... do:` starts a function and `end` finishes it. `set number total to 0` creates a variable, and `change total to total + i` gives it a new value. `loop repeat i to 1 ~ 5 do:` runs its body once for each whole number from 1 to 5, with `i` holding the current one. `if ... do:` runs its body only when the condition is true. Every block is indented one level deeper than the line that opens it, and every block ends with its own `end`. A line that starts with `note:` is a comment that the engine ignores.

## Using this IDE {#ide-tour}

The IDE on this site runs the real CuffScript engine inside your browser, so there is nothing to install. These are its controls:

- **Run (Ctrl/Cmd + Enter)** runs the currently open tab as the entry point of the program.
- **View AST** shows the tokens and the syntax tree without running the code. It is the same information as `cuffc --ast`.
- **Standard input (stdin)** is the text that `input()` reads. Whatever you write in the stdin tab is read one line at a time from the top, and `input()` returns an empty string once the lines run out. (In environments that support live input, a field appears in the output panel instead.)
- **File tabs** hold the files of your project. The `+` button adds a file, so you can build a program from several files that load each other with `use ... from ...` (see [Modules and libraries](#modules)). A run always starts from the active tab.
- **Share link** copies a URL that contains the whole project. Nothing is stored on a server, so you can pass code around with just a link.
- **Download** saves the current tab as a `.cuff` file.
- **Load an example** opens one of the ready-made programs. They are ordered from the basics upward.
- Your work is saved automatically in the browser's localStorage, so it survives a refresh.

::: warn Beware of infinite loops
CuffScript code runs in a separate worker inside the browser. If a run takes too long (8 seconds by default) it is stopped automatically, and you can always stop it yourself with the **Stop** button.
:::

## Running programs on your own computer {#running-locally}

To run CuffScript files outside the browser, build the command-line tool `cuffc` from the engine source (a C++17 compiler is all you need) and give it a file:

```bash
make
./cuffc hello.cuff
```

`cuffc --ast file.cuff` prints the tokens and the syntax tree instead of running the program. `--max-steps` and `--timeout` set an execution budget that stops a runaway program, `--root` sets the folder that modules and files must stay inside, and `--no-network` and `--no-filesystem` switch those two libraries off. A program that ends with an error exits with a non-zero status. To run CuffScript from a JavaScript or TypeScript project, install the `cuffscript-wasm` package.
