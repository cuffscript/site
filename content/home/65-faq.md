---
type: faq
id: faq
title: Frequently asked questions
---

Short answers to the questions people ask first. Click a question to open it.

### Is CuffScript only for beginners?

It is designed to be easy to start with, but it is a complete language and not a toy. It has functions (with typed parameters and default values), classes with inheritance and private members, `async` calls, pattern matching, error handling with `or_else` and `fail`, modules, and built-in libraries for math, text, lists, maps, JSON, dates, time and random numbers. What it leaves out on purpose, such as closures, multiple inheritance and `==`, keeps the language small enough to learn completely.

### Do I need to install anything to try it?

No. The [IDE](/ide/) on this site runs the engine inside your browser, and its **Share link** button turns your whole program into a URL, so passing code to someone else takes one click. To run files on your own computer, build the `cuffc` command-line tool from source with a C++17 compiler, or install the `cuffscript-wasm` package to use CuffScript from JavaScript or TypeScript.

### Why does counting start at 1?

Because that is how people count: the first item is item 1, and the last of five is item 5. The same rule applies to lists, texts, slices and the groups captured by a pattern. A slice includes both of its ends, and a negative number counts from the end.

```cuff
list items = ["a", "b", "c", "d", "e"]
print(items[1], items[-1], items[2~4])
```

```output
a e ["b", "c", "d"]
```

### Why does `=` store a value while `is` compares?

So that each symbol means one thing. `=` always stores: `number age = 25` declares a variable and `age = 26` gives it a new value. Comparing is a different job, so it has its own word, and `age is 26` reads as a question. Because `=` never means "equals", putting it where a comparison belongs, as in `if x = 1 do:`, is a syntax error, and its hint tells you to write `is`.

```cuff
number age = 25
age = 26
print(age is 26)
```

```output
true
```

### How is it different from Python or JavaScript?

Like Python, CuffScript reads close to plain English and indents its blocks. The differences you will notice first are these: counting starts at 1; every block is closed with `end`; a variable is declared together with its type (`number x = 5`); patterns are written with readable tokens such as `[num]` instead of regular-expression symbols; recovering from a failed statement uses `or_else` instead of try and except; and functions are not values, so there are no closures.

### What can I build with it?

CuffScript suits small programs: text processing and validation, working with lists, maps and JSON, calculations, game logic, teaching examples, and scripts that live inside another application. In a browser tab a program has no file access and cannot open network connections. The native `cuffc` adds reading and writing files and folders (`DLC:filesystem`) and plain HTTP requests (`DLC:network`).

### What are DLCs?

DLC is the name for the built-in libraries: {{engine.dlcNames}}. You switch one on with a line such as `use DLC:math`, and from then on its functions, which are named like `math_sqrt`, can be called directly. There are {{engine.dlcCount}} libraries in this version, and the [guide](/guide/#dlc) lists every function in each of them.

### Can I use it inside my own application?

Yes. The engine is a library: use the `cuffscript-wasm` package from JavaScript or TypeScript, or the `CuffEngine` class from C++. The host decides what a program may touch. For example `cuffc` can switch the network and file libraries off (`--no-network`, `--no-filesystem`) and give a program a step or time budget (`--max-steps`, `--timeout`).

### Is it safe to run a program I did not write?

CuffScript is built so that a program can do only what its host allows. File access is confined to one folder and cannot escape it with `..` or links, network requests to local and private addresses are blocked, and an execution budget stops runaway loops. In the browser IDE the file library is blocked and the browser stops raw network access. Treat these as protections and not as a guarantee, and read the project's security policy before you rely on them for untrusted code.

### Is it free to use?

Yes. CuffScript is open source under the Apache-2.0 license, so you can use it, change it and ship it in your own projects under that license's terms.

### Where should I start?

Open the [IDE](/ide/), pick a program from the **Load an example** menu and run it. Then read the [guide](/guide/) from its first page: each page teaches one area and explains the rules before it shows examples.
