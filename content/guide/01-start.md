---
group: Getting started
home: false
---

## What is CuffScript {#intro}

CuffScript is an interpreted language that expresses variables, functions and control flow with keywords close to natural language (`set`, `to`, `do:`, `end`). Like Python, it uses indentation to separate blocks. Lists and strings are indexed from 1, and regular expressions are written with readable tokens such as `[num]` and `[str]` instead of symbols like `\d` and `\w`.

## Using this IDE {#ide-tour}

- **Run (Ctrl/Cmd + Enter)**: runs the currently open tab as the entry point.
- **View AST**: shows the tokens and syntax tree without running the code. It is the same information as `cuffc --ast`.
- **Standard input (stdin)**: `input()` reads the text you pre-fill in the stdin tab, one line at a time from the top, and returns an empty string once it runs out. (In environments that support live input, a field appears in the output panel instead.)
- **File tabs**: the `+` button adds files, so you can build multi-file projects that load each other with `use ... from ...`. A run always starts from the active tab.
- **Share link**: copies a URL that contains the whole project. No server storage is involved, so you can pass code around with just a link.
- **Download**: saves the current tab as a `.cuff` file.
- Your work is saved automatically in the browser's localStorage, so it survives a refresh.

::: warn Beware of infinite loops
CuffScript code runs in a separate worker inside the browser. If a run takes too long (8 seconds by default) it is stopped automatically, and you can always stop it yourself with the **Stop** button.
:::
