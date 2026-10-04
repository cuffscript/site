---
group: 기본 문법
summary: 변수·상수 선언, 자료형, 콜론 규칙, 연산자, 인덱싱
---

## 변수·상수 선언 {#variables}

값을 처음 만들 때는 항상 `set [자료형] [이름] to [값]` 형태를 쓰고, 이후 값을 바꿀 때는 `change [이름] to [값]`을 씁니다.

```cuff
set number age to 25
set str name to "Alice"
set empty data to empty

change age to 26
change name to "Bob"
```

상수는 `set constant [자료형] [이름] to [값]`으로 선언합니다. 이름은 반드시 전체 대문자(`UPPER_CASE`)여야 하며, 이후 `change`로 값을 바꾸려
하면 런타임 에러가 발생합니다.

```cuff
set constant number MAX_RETRIES to 3
set constant str API_URL to "https://cufflang.dev"
```

`constant`은 `list`에도 쓸 수 있습니다. 파이썬의 튜플처럼 완전히 읽기 전용인 리스트가 되어, 추가·삭제·인덱스 대입이 전부 런타임 에러입니다 — 다른 변수에
대입하거나 함수 인자로 넘겨도 그 값 자체가 얼어붙어 있으므로 우회할 수 없습니다. 다만 *얕은* 불변성이라, 얼린 리스트 안에 들어있는 일반 리스트나 맵은 여전히 자유롭게 수정할
수 있습니다. `constant map`은 아직 지원하지 않습니다.

```cuff error=E4003
set constant list PRIMES to [2, 3, 5, 7, 11]

add 13 to PRIMES          note: 런타임 에러 — 얼려진 리스트에는 추가 불가
change PRIMES[1] to 0     note: 이것도 마찬가지로 런타임 에러
```

`add`, `count`, `find`, `split`, `replace`, `match`, `in`, `by`, `not`, `global` 같은 문법 단어도
변수·함수·매개변수·반복문 변수의 이름으로 쓸 수 있습니다 (`set number count to 3`). `find`처럼 자기만의 구문이 있는 단어는 바로 뒤에 그 구문이 이어질
때만 구문으로, 아니면 평범한 이름으로 취급됩니다.

## 자료형 {#types}

| 타입 | 설명 | 예시 |
|---|---|---|
| `number` | 정수·실수 | `5`, `3.14` |
| `str` | 문자열 | `"hello"` |
| `boolean` | 참/거짓 | `true`, `false` |
| `list` | 1-Based 순서 목록 | `["a", "b"]` |
| `map` | 문자열 키 사전 | `{"k": "v"}` |
| `empty` | 값 없음 | `empty` |

함수 매개변수는 Python처럼 타입 표기 없이 자유롭게 받습니다. f-스트링(`f"..."`)으로 문자열 안에 표현식을 끼워 넣을 수 있고, 중괄호 자체를 출력하려면 `{{`
`}}`처럼 두 번 씁니다.

```cuff
set number x to 5
print(f"x + 1 = {x + 1}")
print(f"JSON 느낌: {{\"key\": \"value\"}}")
```

## 콜론 규칙과 주석 {#colon-comments}

가독성을 언어 차원에서 강제하기 위해, 문자열을 제외한 모든 콜론(`:`)은 **앞 공백 절대 금지, 뒤 공백 권장** 규칙을 따릅니다. 어기면 렉서가 즉시 문법 에러를 냅니다.
`do:` 뒤 실행부가 한 줄에서 끝나면, 같은 줄 끝에 `end`까지 붙여 들여쓰기 없는 한 줄 축약형으로 쓸 수 있습니다.

한 줄 주석은 `note: 내용`, 여러 줄 주석은 `note:` 다음 줄부터 `endnote` 직전까지입니다.

```cuff
note: 한 줄 주석
set number x to 10
if x is 10 do: print("통과") end   note: 같은 줄에 덧붙인 주석도 가능

note:
여러 줄 주석 영역입니다.
들여쓰기와 줄바꿈은 자유롭게 구성할 수 있습니다.
endnote
```

```output
통과
```

## 비교·부정 연산자 {#operators}

`is`는 일반 동등 비교, `IS`는 **영문 대소문자를 무시하는** 비교입니다. `!`는 불리언 값을 반전시킵니다.

```cuff
set str input_text to "Apple"

if input_text is "apple" do: print("대소문자가 달라 실행되지 않음") end
if input_text IS "apple" do: print("대소문자 무시라서 실행됨") end

set boolean is_active to false
if !is_active do: print("반전되어 실행됨") end
```

## 인덱싱과 슬라이싱 {#indexing}

리스트·문자열의 첫 번째 위치는 **`1`번**입니다. `0`번 인덱스는 존재하지 않으며 접근 시 런타임 에러가 발생합니다. 음수 인덱스는 뒤에서부터 세며 맨 뒤는 `-1`입니다.
슬라이싱은 `[시작~끝]`처럼 물결(`~`)로 표현하며 양쪽 끝을 모두 포함합니다.

```cuff
set list colors to ["red", "green", "blue", "yellow"]

print(colors[1])    note: "red"
print(colors[-1])   note: "yellow"
print(colors[2~3])  note: ["green", "blue"]
```
