---
id: tour
title: 핵심 문법 한눈에
---

전체 문법은 가이드에서 차근차근 다루고, 여기서는 생김새만 빠르게 훑어봅니다.

| 개념 | 코드 | 설명 |
|---|---|---|
| 변수 | `set number x to 10` | 선언은 `set`, 재대입은 `change ... to` |
| 불변 값 | `set constant list PRIMES to [2, 3, 5]` | 이름은 ALL-CAPS, 리스트도 튜플처럼 얼릴 수 있음 |
| 조건·반복 | `if x > 0 do: ... end` | 모든 블록은 `do:` ~ `end`로 감쌈 |
| 함수 | `set pure returnable async func f() do: ... end` | `pure`/`returnable`/`async`를 자유 조합 |
| 패턴 매칭 | `find "[num]+" from text` | `\d` 대신 `[num]`처럼 읽을 수 있는 이름 |
| 에러 복구 | `risky() or_else do: ... end` | 예외를 던지는 상황만 복구 — 게임의 재시작 버튼처럼 |
| 내장 라이브러리 | `use DLC:map` | {{engine.dlcNames}} {{engine.dlcCount}}종 |
