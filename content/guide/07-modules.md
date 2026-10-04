---
group: 모듈과 라이브러리
summary: `use ... from ...`, 내장 DLC {{engine.dlcCount}}종
---

## use ... from ... {#modules}

같은 프로젝트 안의 다른 `.cuff` 파일을 불러올 때는 `use [파일명] from [상대경로]`를 씁니다. 이 IDE에서는 파일 탭을 여러 개 만들어 이 문법을 그대로 시험해
볼 수 있습니다. 모듈 관련 구문은 반드시 한 줄로만 작성해야 합니다.

```cuff
note: lib/greetings.cuff
set constant str DEFAULT_GREETING to "Hello"
set returnable func greet(name) do:
    return DEFAULT_GREETING + ", " + name + "!"
end
```

```cuff fragment
note: main.cuff
use greetings from ./lib
print(greet("CuffScript"))
print(DEFAULT_GREETING)
```

## 내장 DLC 목록 {#dlc}

공식 내장 라이브러리는 `use DLC:이름` 한 줄로 불러옵니다. 함수는 모두 전역 이름으로 등록되어, `DLC:` 접두사 없이 바로 호출합니다.

::: callout 함수 이름은 전부 "라이브러리_동사" 형태입니다
`sqrt` → `math_sqrt`, `upper` → `str_upper`, `get` → `network_get`처럼, 어느 `use` 줄에서 왔는지 이름만 보고 알 수
있도록 라이브러리 접두어가 붙습니다. 예외는 `length`/`contains`/`index_of` (str/list/map에 걸쳐 의도적으로 동일하게 동작) 와
`to_json`/`from_json`/`to_number`/`to_str`/`to_boolean` (이미 이름 자체에 방향이 드러남) 뿐입니다.
:::

### 전체 함수 목록

엔진에 등록된 모든 내장 함수입니다. 아래 소개에서는 대표적인 것만 예제로 다룹니다.

{{engine:dlc-reference}}

### `DLC:math`

```cuff
use DLC:math

print(math_sqrt(16))       note: 4
print(math_abs(-5))        note: 5
print(math_pow(2, 10))     note: 1024
print(math_round(3.6))     note: 4
print(math_floor(3.9))     note: 3
print(math_ceil(3.1))      note: 4
print(math_min(4, 1, 9))   note: 1 — 인자를 몇 개든 받을 수 있음
print(math_max(4, 1, 9))   note: 9
```

### `DLC:string`

```cuff
use DLC:string

print(str_upper("hello"))              note: "HELLO"
print(str_lower("HELLO"))              note: "hello"
print(str_trim("  padded  "))          note: "padded"
print(length("hello"))                 note: 5 — 접두어 없는 예외
print(contains("hello world", "world"))   note: true — 마찬가지
print(str_starts_with("hello", "he"))  note: true
print(str_ends_with("hello", "lo"))    note: true
```

### `DLC:time` / `DLC:random`

```cuff
use DLC:time
use DLC:random

print(time_now())               note: 유닉스 타임스탬프(초, 실수) — time_timestamp()도 완전히 동일한 함수
set number roll to random_int(1, 6)
print(f"주사위: {roll}")        note: 1~6 사이의 정수, 양 끝 포함
print(random_float())           note: 0.0 이상 1.0 미만의 실수 — 예전 이름은 그냥 random()이었음
```

### `DLC:list`

원본 리스트를 바꾸지 않고 **새 리스트를 반환**하는 함수형 스타일입니다. `list_sort`는 리스트가 전부 숫자이거나 전부 문자열일 때만 동작합니다.

```cuff
use DLC:list
use DLC:convert

set list scores to [5, 2, 8, 1, 9, 2]
print(list_sort(scores))      note: [1, 2, 2, 5, 8, 9] — scores 자체는 그대로
print(list_reverse(scores))   note: [2, 9, 1, 8, 2, 5]
print(list_unique(scores))    note: [5, 2, 8, 1, 9]

note: list_join()은 문자열 리스트만 받으므로, 숫자는 to_str()로 먼저 변환
set list score_strs to []
loop repeat i to 1 ~ 5 do:
    add to_str(scores[i]) to score_strs
end
print(list_join(score_strs, ", "))   note: "5, 2, 8, 1, 9"
```

### `DLC:map`

맵은 기본적으로 키를 나열할 방법이 없으므로, 순회가 필요하면 이 라이브러리를 불러옵니다. `map_keys`/`map_values`는 맵의 삽입 순서를 그대로 따르는 리스트를
반환합니다.

```cuff
use DLC:map

set map profile to {"name": "Bob", "level": 12}

print(map_keys(profile))          note: ["name", "level"]
print(map_values(profile))        note: ["Bob", 12]
print(map_has_key(profile, "level"))   note: true

note: loop repeat는 항상 숫자 범위(start ~ end)만 돕니다 — 리스트를 돌 땐
note: 인덱스로 순회합니다. map_entries()는 [키, 값] 쌍의 리스트를 반환합니다.
set list pairs to map_entries(profile)
loop repeat i to 1 ~ length(pairs) do:
    set list entry to pairs[i]
    print(f"{entry[1]} = {entry[2]}")
end

note: map_merge()는 새 맵을 반환 — 키가 겹치면 두 번째 인자가 이깁니다
set map defaults to {"volume": 50, "difficulty": "normal"}
set map overrides to {"difficulty": "hard"}
print(map_merge(defaults, overrides))   note: {"volume": 50, "difficulty": "hard"}
```

### `DLC:convert`

```cuff
use DLC:convert

set number n to to_number("42.5")
print(n + 1)              note: 43.5
print(to_str(123) + "!")  note: "123!"
print(to_boolean(""))     note: false — 빈 문자열/0/empty는 false, 그 외 문자열은 true
```

`to_number`/`to_str`/`to_boolean`은 사실 항상 쓸 수 있는 코어 내장 함수라 `use DLC:convert` 없이도 바로 호출됩니다. 선언 자체는
문제없이 되고(같은 함수를 다시 등록할 뿐), 어디서 왔는지 코드에 드러내고 싶을 때 명시적으로 씁니다.

### `DLC:json`

```cuff
use DLC:json

set map user to {"name": "Alice", "level": 7, "active": true}
set str packed to to_json(user)
print(packed)                 note: {"name":"Alice","level":7,"active":true}
print(to_json(user, 2))       note: 들여쓰기 2칸으로 예쁘게 출력

set map parsed to from_json(packed)
print(parsed["name"])         note: "Alice"
```

JSON의 object/array/string/number/true/false/null은 각각 CuffScript의
`map`/`list`/`str`/`number`/`boolean`/`empty`로 대응됩니다. `from_json`은 RFC 8259를 엄격히 따르므로 트레일링 콤마, 홑따옴표,
따옴표 없는 키처럼 흔한 변형은 `ValueError`로 거부됩니다.

### `DLC:network`

`network_get(url)`과 `network_post(url, body[, content_type])`이 실제로 동작하는 HTTP/1.1 클라이언트로 연결되어
`{"status", "ok", "body"}` 형태의 맵을 반환합니다. 평문 HTTP만 지원하며 `https://`는 조용히 평문으로 격하되지 않고 바로 에러가 됩니다. 접속
실패·DNS 실패·타임아웃은 `NetworkRequestFailed (E4028)` 런타임 에러로, `or_else`로 잡을 수 있습니다. 루프백·사설 대역(클라우드 메타데이터
주소 포함)으로의 요청은 SSRF 방지를 위해 기본적으로 차단됩니다. 신뢰할 수 없는 코드를 실행하는 호스트라면
`CuffEngine::Options::networkEnabled = false`(또는 `cuffc --no-network`)로 아예 꺼둘 수 있습니다.

```cuff
use DLC:network

set map res to network_get("http://example.com") or_else do:
    print("요청 실패 — 네트워크가 막혀 있거나 이 IDE 환경의 제약일 수 있음")
    change res to {"status": 0, "ok": false, "body": ""}
end
if res["ok"] do:
    print(res["body"])
end
```

::: warn 이 브라우저 IDE에서는?
위 동작은 네이티브 `cuffc` 기준입니다. 이 페이지의 IDE는 CuffScript를 WebAssembly로 컴파일해 브라우저 탭 안에서 실행하는데, 브라우저는 스크립트가
임의의 TCP 소켓을 직접 여는 것을 애초에 허용하지 않습니다. 그래서 `network_get`/`network_post` 호출은 이 IDE에서 대체로 `or_else`가 잡아야
하는 실패로 끝난다고 보는 게 안전합니다 — 실제 네트워크 요청을 확인하려면 로컬에 빌드한 `cuffc`로 실행해 보세요.
:::

### `DLC:filesystem`

`file_exist`, `file_size`, `file_read`, `file_readlines`, `file_write`, `file_add`, `file_remove`로
스크립트 파일 옆의 실제 로컬 파일을 읽고 씁니다. 모든 경로는 `use ... from`이 모듈을 찾을 때 쓰는 것과 **똑같은 샌드박스 루트**(스크립트가 있는 폴더, 또는
호스트가 설정한 `--root`) 안으로 강제되어, 절대 경로나 `../`로 벗어나려는 시도는 건드리기도 전에 `FilesystemAccessDenied (E5008)`로
거부됩니다. 루트 밖을 가리키는 심링크도 거부됩니다. 존재하지 않는 파일을 `file_read`/`file_readlines`하면 에러 대신 `empty`가 돌아옵니다.

```cuff
use DLC:filesystem

set str path to "notes.txt"

print(file_exist(path))                        note: false
print(file_write(path, "첫째 줄\n둘째 줄"))    note: true
print(file_add(path, "\n셋째 줄"))              note: true — 이어붙이기
print(file_size(path))                          note: 바이트 수
print(file_readlines(path))                     note: ["첫째 줄", "둘째 줄", "셋째 줄"]

print(file_read("no_such_file.txt"))            note: empty — 에러 아님

print(file_remove(path))                        note: true
print(file_exist(path))                         note: false
```

::: warn 이 브라우저 IDE에서는 아예 막혀 있습니다
`DLC:network`와 달리 이건 "대체로 실패"가 아니라 확실한 차단입니다. 이 IDE는 파일 하나하나를 `or_else`가 잡아야 하는 실패로 두는 대신,
`use DLC:filesystem`이 코드 어디에 있든 실행 자체를 거부하고 바로 에러를 보여줍니다 — 이 페이지의 샌드박스 "파일시스템"은 지금 이 IDE 프로젝트의 다른
탭들이 들어 있는 가상 저장소라서, 실제로 뭔가를 읽고 쓸 수 있게 두면 오히려 혼란스러울 뿐이기 때문입니다. 로컬에 설치한 `cuffc`에서는 `--no-filesystem`을
주지 않는 한 정상적으로 동작합니다.
:::

::: callout 라이브러리 이름이 겹치면?
`use DLC:list`와 `use DLC:convert`처럼 여러 DLC를 동시에 불러와도 함수 이름이 겹치지 않는 한 문제없이 함께 쓸 수 있습니다. 위 `DLC:list`
예제에서도 `to_str`를 쓰기 위해 `DLC:convert`를 함께 불러왔습니다.
:::
