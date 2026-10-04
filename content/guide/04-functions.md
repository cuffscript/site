---
group: 함수
summary: 함수 정의, 비동기(async/await), 스코프와 global
---

## 함수 정의 {#functions}

함수도 `set`으로 시작하며, 한 줄 축약형은 허용되지 않고 항상 들여쓰기된 블록으로 작성해야 합니다. 값을 반환하려면 `returnable`을 붙이고 `return`을 씁니다.
호출은 괄호 `()`만 사용하며 `do:`는 붙이지 않습니다.

```cuff
set returnable func fib(n) do:
    if n <= 1 do:
        return n
    end
    return fib(n - 1) + fib(n - 2)
end
print(f"fib(10) = {fib(10)}")
```

중첩 함수 정의와 클로저는 지원하지 않습니다. 함수 안에서 `set func`를 쓰면 `NestedFunctionNotSupported (E4018)` 에러가 납니다 — 함수는 항상 최상위에
정의하세요. 함수는 전역 스코프와 자기 자신의 로컬 스코프만 볼 수 있습니다.

`returnable`, `async`, `pure` 세 수식어는 순서 상관없이 자유롭게 조합할 수 있습니다. `pure`가 붙은 함수는 전역 변수를 읽거나 쓸 수 없습니다 —
`change 이름 to global` 브리지도 예외가 아니며, 시도하는 즉시 `PureFunctionGlobalAccess (E4027)` 런타임 에러가 발생합니다. 이 제약은
호출을 타고 **전파됩니다**: `pure` 함수는 `pure`가 아닌 사용자 함수를 호출할 수도 없으며, 호출하는 즉시
`PureFunctionImpureCall (E4029)`가 납니다. 호출되는 쪽도 `pure`로 표시해야 합니다. (`print`나 DLC 같은 네이티브 함수는 영향받지
않습니다.)

```cuff
set number shared_state to 0

set pure returnable func double(x) do:
    return x * 2
end

set pure returnable func quad(x) do:
    return double(double(x))   note: pure가 pure를 부르는 건 OK
end
print(quad(5))   note: 20

set func bump() do:
    change shared_state to global
    change shared_state to shared_state + 1
end

set pure func broken() do:
    bump()   note: E4029 — pure 함수가 pure 아닌 bump()를 호출
end
```

## 비동기 (async / await) {#async}

`async` 함수를 `await` 없이 호출하면 즉시 실행되지 않고 큐에 쌓이며, 최상위 스크립트의 동기 코드가 모두 끝난 뒤 쌓인 순서(FIFO)대로 실행됩니다.
`await`를 붙이면 지금 바로 실행되고 결과값(있다면)을 돌려받습니다.

```cuff
set async func notify() do:
    print("[비동기] 처리 완료")
end

set async returnable func fetch_score() do:
    return 87
end

print("[동기] 시작")
notify() note: 큐에 쌓임 — 지금 실행되지 않음
set number score to await fetch_score() note: await는 즉시 실행
print(f"[동기] 점수 = {score}")
print("[동기] 끝")
note: 이후에 큐에 있던 notify()가 실행됩니다.
```

## 스코프와 global {#scope}

함수 안에서 선언한 변수는 그 함수 안에서만 유효합니다. 함수 안에서 전역 변수를 수정하려면 먼저 `change [이름] to global`로 선언한 뒤, 다음 줄에서 실제 값을
바꿉니다.

```cuff
set number counter to 0

set func increment() do:
    change counter to global
    change counter to counter + 1
end

increment()
increment()
print(f"counter = {counter}")
```
