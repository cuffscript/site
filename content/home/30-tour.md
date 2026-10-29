---
id: tour
title: Core syntax at a glance
---

The guide covers the full syntax step by step; here is just a quick look at what it looks like.

| Concept | Code | Notes |
|---|---|---|
| Variable | `set number x to 10` | Declare with `set`, reassign with `change ... to` |
| Constant | `set constant list PRIMES to [2, 3, 5]` | Names are ALL-CAPS; lists can be frozen like tuples |
| Conditions and loops | `if x > 0 do: ... end` | Every block is wrapped in `do:` ... `end` |
| Functions | `set pure returnable async func f() do: ... end` | Combine `pure`, `returnable` and `async` freely |
| Pattern matching | `find "[num]+" from text` | Readable names like `[num]` instead of `\d` |
| Error recovery | `risky() or_else do: ... end` | Recovers only from calls that raise an error, like a game's restart button |
| Built-in libraries | `use DLC:map` | {{engine.dlcCount}} libraries: {{engine.dlcNames}} |
