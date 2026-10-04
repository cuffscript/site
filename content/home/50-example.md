---
id: example
title: 예제 코드
---

::: p home-example-caption
재귀로 피보나치 수열을 구하는 예제입니다.
:::

```cuff
set returnable func fib(n) do:
    if n <= 1 do: return n end
    return fib(n - 1) + fib(n - 2)
end

print(f"fib(10) = {fib(10)}")
```

IDE에는 기초 문법부터 모듈까지 순서대로 따라갈 수 있는 예제 {{examples.count}}개가 미리 준비돼 있습니다.
