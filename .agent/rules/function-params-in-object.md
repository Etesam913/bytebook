---
trigger: glob
globs: *.ts
---

When there are >=3 function params put the params in an object so that calling the function is more readable.

As an example:

Instead of having

function test(a: string, b:int, c:string)

have:

function test({a, b, c}: {a: string, b:int, c:string})
