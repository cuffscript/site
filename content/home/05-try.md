---
type: playground
id: try
title: Try it now
---

Edit the code and press **Run**. It runs the real CuffScript engine right here in your browser, and nothing is installed or sent anywhere.

```cuff
note: Edit me and press Run!
func describe(name) do:
    if name matches p"[up][low]+" do:
        return f"{name} looks like a proper name"
    end
    return f"{name} does not"
end

loop each name in ["Ada", "grace", "Linus"] do:
    print(describe(name))
end

set map scores to {"Ada": 95, "Linus": 88}
set number total to 0
loop each who in scores do:
    change total to total + scores[who]
end
print(f"Total score: {total}")
```

```output
Ada looks like a proper name
grace does not
Linus looks like a proper name
Total score: 183
```
