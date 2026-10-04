---
group: 에러 처리
summary: `or_else`와 에러 코드 체계
---

## or_else {#or-else}

try-catch 대신, 실패할 수 있는 구문 뒤에 `or_else do: ... end`를 붙여 에러를 처리합니다. 블록 안에서는 `change`로 기존 변수를 채우거나 새
변수를 선언할 수 있습니다.

```cuff
set number a to 10
set number b to 0
set number result to a / b or_else do:
    print("0으로 나누기 실패, 기본값으로 대체")
    change result to -1
end
print(f"result = {result}")
```

## 에러 코드 체계 {#error-codes}

모든 에러는 고유한 숫자 코드(예: `E4006`)와 하나의 범주를 가집니다. 코드의 앞자리만 봐도 어느 단계에서 발생했는지 알 수 있습니다.

| 범위 | 범주 | or_else로 복구 가능? |
|---|---|---|
| `1000~1999` | Lexical (토크나이저) | 불가능 |
| `2000~2999` | Syntax (파서) | 불가능 |
| `3000~3099` | Regex Syntax (패턴 컴파일) | 불가능 |
| `3100~3999` | Regex Runtime (스텝/시간 제한 등) | 가능 |
| `4000~4999` | Runtime (인터프리터) | 가능 |
| `5000~5999` | Module (use/from) | 가능 |
| `6000~6999` | Resource (실행 예산 초과) | 불가능 |
| `9000~9999` | Internal (엔진 내부 버그) | 불가능 |

프로그램 자체가 잘못된 경우(문법 오류 등)는 이미 실행 중인 코드 안에서 나타날 수 없으므로 `or_else`가 잡지 않으며, "정상적인 코드가 나쁜 상황(0으로 나누기, 없는
파일 등)을 만난 경우"만 `or_else`로 복구할 수 있습니다. 6000번대는 CLI의 `--max-steps`/`--timeout` 실행 예산을 넘었을 때만 발생하며 (기본은
꺼져 있음), "프로그램이 통제를 벗어났다"는 신호이기 때문에 `or_else`가 일부러 잡지 않도록 설계되어 있습니다.

{{engine:error-codes}}

실제 에러는 아래 코드를 실행하면 이런 형태로 출력됩니다. 에러가 난 소스 줄이 함께 나오고, `^`가 정확한 열을 가리킵니다 (앞에 한글이나 이모지 같은 여러 바이트 문자가
있어도 열이 어긋나지 않습니다).

```cuff error=E4006
set number a to 10
set number b to 0
print(a / b)   note: or_else가 없으므로 여기서 프로그램이 멈추고 아래 메시지가 출력됨
```

```text
ERROR: [E4006] Runtime Error at line 3, column 9: division by zero
    print(a / b)
            ^
```

`or_else`로 감싸지 않은 런타임 에러는 프로그램을 그 자리에서 멈춥니다. 이 IDE에서는 출력 패널에 위와 같은 메시지가 빨간 글씨로 표시되고, 실행 상태가 "오류"로
바뀝니다.
