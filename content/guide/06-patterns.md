---
group: 패턴 매칭
summary: match / find / replace / split / count, 퀵 레퍼런스
---

## 패턴 매칭 — 기본 사용법과 토큰 {#pattern-basics toc="기본 사용법과 토큰"}

CuffScript는 `\d`, `\w`, `^`, `$` 같은 전통적인 정규식 기호 대신 `[num]`처럼 읽을 수 있는 대괄호 토큰을 씁니다. `is` / `IS`로 검사하면
기본적으로 **문자열 전체 일치**를 검증합니다.

| 토큰 | 의미 |
|---|---|
| `[num]` | 숫자 1개 |
| `[let]` | 영문 알파벳 1개 |
| `[low]` / `[up]` | 영문 소문자 / 대문자 1개 |
| `[str]` | 영문자 또는 숫자 1개 |
| `[word]` | 영문자·숫자·언더바 1개(식별자용) |
| `[sp]` | 공백 문자 1개 |
| `[nl]` | 줄바꿈 문자 |
| `[any]` | 임의의 문자 1개 |
| `[int]` / `[float]` / `[hex]` | 부호 있는 정수 / 실수 / 16진수 문자 |
| `[email]` / `[phone]` / `[url]` | 이메일 / 대한민국 전화번호 / URL 프리셋 |
| `[edge]` | 단어 경계 |
| `[start]` / `[end]` | 문자열 시작 / 끝 앵커 |
| `[one:a\|b]` | 후보 중 하나 선택 |
| `[abc]` / `[!abc]` | 문자 세트 / 부정 문자 세트 |
| `N` / `+` / `*` / `?` / `N~M` | 정확히 N개 / 1개 이상 / 0개 이상 / 0~1개 / N~M개 |
| `(...)` | 캡처 그룹 (1-Based 접근) |
| `<name:...>` | 이름 지정 캡처 |

`[` `]` `(` `)` `+` `*` `?` `~` `|` `.` `\` `:` 같은 특수기호 자체를 글자로 검사하려면 `\`로 이스케이프합니다. 정규식 안의 콜론도 언어
전체 규칙과 동일하게 앞 공백이 금지됩니다 (`[one:a|b]`는 되지만 `[one :a|b]`는 문법 에러).

```cuff
set str phone to "010-1234-5678"
set str filename to "photo.png"

if phone is "[num]3-[num]4-[num]4" do: print("올바른 번호") end
if filename is "[str]+\.[one:jpg|png|gif]" do: print("이미지 파일") end
```

```output
올바른 번호
이미지 파일
```

몇 가지 예시를 더 보면 토큰이 손에 익습니다:

```cuff
set str color to "#ff00aa"
set str sentence to "my cat sat on the mat"
set str code to "xyz"

note: 16진수 색상 코드 (# 뒤에 hex 문자 6개)
if color is "#[hex]6" do: print("올바른 색상 코드") end

note: [edge]로 단어 경계를 표시 — "cat"은 통과하지만 "category"는 통과하지 않음
if find "[edge]cat[edge]" from sentence is not empty do: print("고양이 언급됨") end

note: [!abc] — 모음이 아닌 문자만 3개 연속
if code is "[!aeiou]3" do: print("모음 없는 3글자") end
```

```output
올바른 색상 코드
고양이 언급됨
모음 없는 3글자
```

::: warn ReDoS 방어
`([any]+)+`처럼 초보자가 실수하기 쉬운 수량자 중첩으로 인한 파국적 백트래킹을 막기 위해, 엔진은 최대 매칭 스텝 수와 시간 제한을 두고 있습니다. 한도를 넘으면
`Regex Runtime Error`로 안전하게 중단됩니다.
:::

## match / find / replace / split / count {#pattern-commands}

`match`는 캡처 그룹 값을 꺼낼 때 씁니다. 실패하면 `empty`가 됩니다.

```cuff
set str serial to "SN-2026-998"
set match result to match serial from "SN-([num]4)-([num]+)"
if result is not empty do:
    print(f"연도: {result[1]}") note: "2026"
end

note: 이름 지정 캡처는 맵처럼 키로 조회
set match res to match "2026-12-25" from "<year:[num]4>-<month:[num]2>-<day:[num]2>"
print(res["year"])
```

`find`는 본문 속 부분 검색입니다. 단독으로는 첫 매칭 문자열 하나를, `g` 플래그를 붙이면 모든 매칭을 1-Based 리스트로 반환합니다. 매칭이 없으면
`empty`입니다.

```cuff
set str article to "접수 번호: T-123, T-456"
set list tickets to find "T-[num]3" from article g
print(tickets[1])
```

```output
T-123
```

`replace`는 패턴에 맞는 부분을 다른 문자열로 바꿉니다. `g`를 붙이면 전체 치환입니다.

```cuff
set str phone_log to "통화 기록: 010-1234-5678"
set str masked to replace "[num]4-[num]4" in phone_log to "****-****"
print(masked)
```

```output
통화 기록: 010-****-****
```

`split`은 패턴을 기준으로 문자열을 나눕니다.

```cuff
set list parts to split "apple, banana,cherry" by ",[sp]*"
```

`count`는 패턴이 등장한 횟수를 셉니다. 없으면 `0`입니다.

```cuff
set str article to "접수 번호 12번과 34번"
print(count "[num]+" in article)
```

```output
2
```

`find`, `match`, `count`, `replace` 뒤에는 플래그를 붙일 수 있습니다: `i`(대소문자 무시), `g`(전체 탐색), `m`(멀티라인). 여러 개를
붙일 땐 `gi`처럼 이어 씁니다.

## 퀵 레퍼런스 {#pattern-reference}

```text
[문자 토큰]
  [num] [let] [low] [up] [str] [word] [sp] [nl] [any]

[프리셋 토큰]
  [int] [float] [hex] [email] [phone] [url] [edge] [start] [end]

[수량자]
  N   +   *   ?   N~M   N~   ~M   (뒤에 ? 붙이면 Lazy)

[선택·세트]
  [one:a|b]   [abc]   [!abc]

[그룹]
  (...)             캡처 그룹, 1-Based 인덱스
  <name:...>   이름 지정 캡처

[명령어]
  is / IS    match    find (g)    replace ... to ... (g)    split ... by ...    count ... in ...
  플래그: i(무시) g(전체) m(멀티라인)
```
