---
group: 제어 흐름
summary: 조건문·반복문, 리스트·맵 조작
---

## 조건문과 반복문 {#conditionals-loops}

조건 분기는 `if ... do: ... else if ... do: ... else do: ... end` 형태입니다. 반복문은 두 가지입니다: 범위를 도는
`loop repeat`, 조건이 참인 동안 도는 `loop while`. `stop`은 가장 가까운 반복문 하나만 즉시 종료합니다. 블록형 구문은 들여쓰기가 필수이며, 여는 만큼
`end`도 정확히 있어야 합니다.

```cuff
set number score to 85

if score >= 90 do:
    print("우수")
else if score >= 80 do:
    print("장려")
else do:
    print("노력")
end

loop repeat i to 1 ~ 10 do:
    if i is 4 do:
        stop
    end
    print(f"회전 라운드: {i}")
end
```

```output
장려
회전 라운드: 1
회전 라운드: 2
회전 라운드: 3
```

## 리스트·맵 조작 {#collections}

메서드 대신 자연어 구문으로 컬렉션을 다룹니다: 리스트 끝에 추가는 `add ... to ...`, 인덱스/키 값 변경은 `change ... to ...`, 제거는
`remove ... from ...`. 맵에 없는 키에 값을 대입하면 새 키가 생깁니다.

```cuff
set list inventory to ["sword", "shield"]
add "potion" to inventory
change inventory[1] to "magic_staff"
remove 2 from inventory

set map profile to {"name": "Bob"}
change profile["level"] to 50
remove "level" from profile
```
