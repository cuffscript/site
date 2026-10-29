---
id: example
title: Example code
---

::: p home-example-caption
A recursive Fibonacci example.
:::

```cuff
set returnable func fib(n) do:
    if n <= 1 do: return n end
    return fib(n - 1) + fib(n - 2)
end

print(f"fib(10) = {fib(10)}")
```

The IDE comes with {{examples.count}} ready-made examples that take you from basic syntax to modules, in order.
