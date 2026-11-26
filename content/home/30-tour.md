---
id: tour
title: Core syntax at a glance
---

The guide covers the full syntax step by step; here is just a quick look at what it looks like.

| Concept | Code | Notes |
|---|---|---|
| Variable | `number x = 10` | Declared with a type, reassigned with `=`; `any` holds every type |
| Constant | `constant list PRIMES = [2, 3, 5]` | Names are ALL-CAPS; lists can be frozen like tuples |
| Conditions and loops | `if x > 0 do: ... end` | Every block is wrapped in `do:` ... `end`; `loop each` visits a collection |
| Functions | `async pure func f() do: ... end` | `async` and `pure` are optional and can be combined |
| Classes | `class Hero extends Player do: ... end` | Fields, methods, inheritance and `private` members |
| Pattern matching | `text matches p"[num]+"` | Readable names like `[num]` instead of `\d` |
| Error recovery | `risky() or_else as Error err do: ... end` | Recovers from a statement that raises an error, like a game's restart button; `err` is an object |
| Built-in libraries | `use DLC:map` | {{engine.dlcCount}} libraries: {{engine.dlcNames}} |
