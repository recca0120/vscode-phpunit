# Data Provider / Dataset Complete Guide

Issue: https://github.com/recca0120/vscode-phpunit/issues/297

This document consolidates all PHP DataProvider / Pest Dataset syntax references, Teamcity output formats, and the actual static analysis support status.

Strategy: **AST first + Teamcity fallback** — Static analysis covers the most common patterns (~70-80%). Teamcity output covers 100% as a fallback, dynamically adding dataset child nodes after the first test run.

**Legend**: ✅ Done | ⚠️ Partial | ❌ Not implemented | N/A Not analyzed by design (Teamcity fallback)

---

## Overview

| # | Pattern | AST Analysis | Impl | Test | Teamcity | Notes |
|---|---------|:------------:|:----:|:----:|:--------:|-------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | ✅ | ✅ | Most common |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | ✅ | ✅ | |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | ✅ | ✅ | |
| 4 | `#[DataProvider]` + yield named | ✅ | ✅ | ✅ | ✅ | Supports variable/interpolated/concat/ternary keys |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | ✅ | ✅ | |
| 6 | `#[DataProvider]` + loop/dynamic | ⚠️ | ✅ | ✅ | ✅ | Supports for/foreach/while/nested |
| 7 | `#[DataProvider]` + method call | ⚠️ | ✅ | ✅ | ✅ | array_map/array_combine support range()/array/const |
| 8 | `#[DataProviderExternal]` | N/A | N/A | N/A | ✅ | Cross-file, not analyzed |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | ✅ | ✅ | |
| 10 | `#[TestWith]` named | ✅ | ✅ | ✅ | ✅ | |
| 11 | `#[TestWithJson]` | ✅ | ✅ | ✅ | ✅ | |
| 12 | `@dataProvider` (legacy) | Same as 1-7 | ✅ | ✅ | ✅ | Removed in PHPUnit 12 |
| 13 | Multiple DataProviders | ✅ | ✅ | ✅ | ✅ | |
| 14 | Pest `->with([])` no keys | ✅ | ✅ | ✅ | ✅ | |
| 15 | Pest `->with([])` named keys | ✅ | ✅ | ✅ | ✅ | |
| 16 | Pest `->with([[]])` tuples | ✅ | ✅ | ✅ | ✅ | |
| 17 | Pest `->with('name')` shared | ❌ | ❌ | ❌ | ✅ | Requires cross-file dataset() lookup |
| 18 | Pest `->with(function(){})` | ⚠️ | ✅ | ✅ | ✅ | Same limitations as #4-7 |
| 19 | Pest `->with(fn() =>)` arrow | ⚠️ | ✅ | ✅ | ✅ | Supports range()/array literal body |
| 20 | Pest bound dataset `[fn()=>...]` | ✅ | ✅ | ✅ | ✅ | |
| 21 | Pest `->with()->with()` combined | ✅ | ✅ | ✅ | ✅ | Cartesian product |

---

## Implementation Architecture

Core static analysis components:

| File | Responsibility |
|------|---------------|
| `DataProviderParser.ts` | Entry point, dispatches by AST node kind: `array_creation_expression` → `extractLabels()`, `method_declaration` → `evaluateMethodBody()`, `anonymous_function` → extracts compound body then calls `evaluateMethodBody()` |
| `evaluate.ts` | Core evaluation engine: loop unrolling, expression resolution, string interpolation |

Key functions in `evaluate.ts`:

| Function | Description |
|----------|------------|
| `evaluateMethodBody(body, classBody?)` | Entry: identifies return array / function call / yield / loop |
| `evaluateForLoop(loop, classBody?, outerBindings?)` | Unrolls C-style for loops |
| `evaluateForeachLoop(loop, classBody?, outerBindings?)` | Unrolls foreach loops |
| `evaluateWhileLoop(loop, initialBindings)` | Unrolls while loops |
| `evaluateInnerLoop(loop, outerBindings, classBody?)` | Delegates nested loops |
| `evaluateLoopYields(iterations, body, classBody?)` | Resolves yield keys for each iteration |
| `evaluateArrowBody(body, classBody?)` | Resolves arrow function body expression (array literal / `range()` / class constant) |
| `evaluateFunctionCallReturn(node)` | Handles `array_map` / `array_combine` (arguments resolved via `resolveIterable`) |
| `resolveExpression(node, bindings)` | Resolves yield key expressions (string / variable / interpolated / concat / ternary / PHP string functions / arithmetic) |
| `resolveIterable(source, classBody?)` | Resolves iterable sources (array literal / class constant / `range()` / `array_map` / `array_combine`) |
| `extractLabels(entries)` | Extracts labels from array entries or top-level yields (string literal keys only) |

Teamcity fallback components:

| Component | Description |
|-----------|------------|
| `DatasetExpander.fromTestOutput` | Parses `#N` and `"name"` formats from Teamcity output |
| `DatasetExpander.fromAnnotations` | Creates dataset children from static analysis labels |
| `isDatasetResult` | Used by TestResultObserver to distinguish dataset vs non-dataset results |
| `DatasetObserver` | Dynamically creates dataset child TestItem nodes from Teamcity output after execution |

---

## PHPUnit Patterns

### 1. `#[DataProvider]` + return array + named keys ✅

```php
#[DataProvider('additionProvider')]
public function testAdd(int $a, int $b, int $expected): void {
    $this->assertSame($expected, $a + $b);
}

public static function additionProvider(): array {
    return [
        'adding zeros'  => [0, 0, 0],
        'zero plus one' => [0, 1, 1],
    ];
}
```

**Teamcity:**
```
testSuiteStarted name='testAdd'
testStarted name='testAdd with data set "adding zeros"'
testStarted name='testAdd with data set "zero plus one"'
testSuiteFinished name='testAdd'
```

**AST analysis: ✅** — return array with string literal keys.

---

### 2. `#[DataProvider]` + return array + numeric keys ✅

```php
public static function additionProvider(): array {
    return [
        [0, 0, 0],
        [0, 1, 1],
    ];
}
```

**Teamcity:**
```
testStarted name='testAdd with data set #0'
testStarted name='testAdd with data set #1'
```

**AST analysis: ✅** — counts indices.

---

### 3. `#[DataProvider]` + return array + mixed keys ✅

```php
public static function additionProvider(): array {
    return [
        '"foo-bar_%$' => [0, 0, 0],
        [0, 1, 1],
        [1, 0, 2],
    ];
}
```

**Teamcity (PHPUnit 9):**
```
testStarted name='addition_provider with data set #2'   ← [1,0,2] failed, listed first
testStarted name='addition_provider with data set #0'   ← [0,1,1]
testStarted name='addition_provider with data set #1'   ← no #1, occupied by "foo-bar_%$"
```

**Teamcity (PHPUnit 10+):**
```
testStarted name='addition_provider with data set #1'
testStarted name='addition_provider with data set ""foo-bar_%$"'
testStarted name='addition_provider with data set #0'
```

**AST analysis: ✅** — mixed keys: named entries use string key, others get numeric index.

---

### 4. `#[DataProvider]` + Generator yield + named keys ⚠️

```php
public static function additionProvider(): Generator {
    yield 'first'  => [1];
    yield 'second' => [2];
}
```

**Teamcity:**
```
testStarted name='testAdd with data set "first"'
testStarted name='testAdd with data set "second"'
```

**AST analysis: ✅** — top-level yields use `resolveExpression()` with body-level bindings.

| yield key type | Top-level yield | In-loop yield | Example |
|---------------|:--------------:|:------------:|---------|
| string literal | ✅ | ✅ | `yield 'foo' => [1]` |
| variable | ✅ | ✅ | `yield $v => [$v]` (requires assignment in body) |
| interpolated string | ✅ | ✅ | `yield "case $i" => [$i]` |
| concatenation (`.`) | ✅ | ✅ | `yield $v . '_test' => [$v]` |
| ternary | ✅ | ✅ | `yield ($i > 0 ? "pos" : "zero") => [$i]` |
| `strtoupper` / `strtolower` / `ucfirst` / `lcfirst` | ✅ | ✅ | `yield strtoupper($v) => [...]` |
| `sprintf` | ✅ | ✅ | `yield sprintf('case_%d', $i) => [...]` |
| `implode` / `join` | ✅ | ✅ | `yield implode('-', [$a, $b]) => [...]` |
| `str_repeat` / `substr` | ✅ | ✅ | `yield str_repeat('ab', 3) => [...]` |
| `trim` / `ltrim` / `rtrim` | ✅ | ✅ | `yield trim(' hello ') => [...]` |
| `str_replace` | ✅ | ✅ | `yield str_replace('_', '-', 'foo_bar') => [...]` |
| method call | ❌ | ❌ | `yield $obj->getName() => [...]` |

> **Technical note**: Both top-level and in-loop yields are processed by `resolveExpression()`. Top-level yields collect bindings from assignments in the method body. PHP string functions (`strtoupper`, `strtolower`, `ucfirst`, `lcfirst`, `sprintf`, `implode`, `join`, `str_repeat`, `substr`, `trim`, `ltrim`, `rtrim`, `str_replace`) are resolved as pure functions via a dispatch table.

---

### 5. `#[DataProvider]` + Generator yield + no keys ✅

```php
public static function additionProvider(): Generator {
    yield [0, 0, 0];
    yield [0, 1, 1];
}
```

**Teamcity:**
```
testStarted name='testAdd with data set #0'
testStarted name='testAdd with data set #1'
```

**AST analysis: ✅** — counts indices.

---

### 6. `#[DataProvider]` + loop / dynamic generation ⚠️

```php
public static function rangeProvider(): Generator {
    for ($i = 0; $i < 100; $i++) {
        yield "case $i" => [$i];
    }
}
```

**Teamcity:**
```
testStarted name='testRange with data set "case 0"'
testStarted name='testRange with data set "case 1"'
... (100 total)
```

**Supported loop patterns:**

```php
// ✅ for loop + yield
for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }

// ✅ foreach + array literal
foreach (['a', 'b'] as $v) { yield $v => [$v]; }

// ✅ foreach + class constant
foreach (self::CASES as $v) { yield $v => [$v]; }

// ✅ foreach + range()
foreach (range(1, 3) as $i) { yield "case $i" => [$i]; }

// ✅ while loop ($i++ / $i-- only)
$i = 0; while ($i < 3) { yield "item $i" => [$i]; $i++; }

// ✅ while loop with break
$i = 0; while ($i < 10) { if ($i >= 3) { break; } yield "item $i" => [$i]; $i++; }

// ✅ while loop with continue
$i = 0; while ($i < 5) { $i++; if ($i % 2 === 0) { continue; } yield "item $i" => [$i]; }

// ✅ nested loops
foreach (['a', 'b'] as $x) {
    foreach ([1, 2] as $y) { yield "$x$y" => [$x, $y]; }
}
```

**Not supported (Teamcity fallback):**

```php
// ❌ dynamic iterable source
foreach ($this->getItems() as $v) { yield $v => [$v]; }

// ❌ complex while condition
while ($iterator->hasNext()) { yield $iterator->current(); }

// ✅ compound increment ($i += N, $i -= N, including variable step)
$i = 0; while ($i < 10) { yield "item $i" => [$i]; $i += 2; }
$step = 3; $i = 0; while ($i < 9) { yield "item $i" => [$i]; $i += $step; }
```

**Loop type constraints:**

| Loop | Constraints |
|------|------------|
| `for` | init must be `$var = number`; condition must be `$var op number` (op: `<`, `<=`, `>`, `>=`); update must be `$var++` or `$var--` |
| `foreach` | source must be array literal, class constant (`self::CONST`), or `range(start, end[, step])`; other dynamic sources not supported |
| `while` | condition must be `$var op number`; body update supports `$var++`, `$var--`, `$var += N`, `$var -= N` (N can be literal or variable from bindings); supports `if` with `break`/`continue` |
| nested | supports any combination of foreach/for nesting; outer bindings automatically passed to inner loops |
| safety limit | MAX_ITERATIONS = 1000, stops unrolling when exceeded |

---

### 7. `#[DataProvider]` + method call / expression ⚠️

```php
public static function provider(): array {
    return array_map(fn($v) => [$v], self::VALUES);
}
```

```php
public static function provider(): array {
    return self::baseData() + self::extraData();
}
```

**Teamcity:** depends on runtime result, may be named or indexed.

| Function call | Supported | Resolution method | Example |
|--------------|:---------:|------------------|---------|
| `array_map(fn, source)` | ✅ | Counts second argument length, produces `#0`, `#1`, ...; source can be array literal, `range()`, or class constant | `return array_map(fn($x) => [$x], range(0, 2))` |
| `array_combine(keys, values)` | ✅ | Uses first argument as labels; keys can be array literal, `range()`, or class constant | `return array_combine(['foo', 'bar'], [[1], [2]])` |
| `range(start, end)` | ✅ | As foreach iterable source (see #6) | `foreach (range(1, 3) as $i)` |
| Custom method call | ❌ | — | `return self::baseData() + self::extraData()` |
| Chained calls | ❌ | — | `return collect([...])->map(...)->toArray()` |

> **Note**: `array_map` and `array_combine` arguments can be array literals, `range()` calls, or class constants (`self::CONST`). Dynamic sources like method calls or chained expressions cannot be resolved.

---

### 8. `#[DataProviderExternal(Class, 'method')]` N/A

```php
#[DataProviderExternal(ExternalData::class, 'provider')]
public function testAdd(int $a, int $b, int $expected): void { ... }

// In another file
final class ExternalData {
    public static function provider(): array {
        return ['adding zeros' => [0, 0, 0]];
    }
}
```

**Teamcity:**
```
testStarted name='testAdd with data set "adding zeros"'
```

**AST analysis: N/A** — requires cross-file resolution of external class. Not statically analyzed by design. Teamcity fallback.

---

### 9. `#[TestWith]` — numeric ✅

```php
#[TestWith([0, 0, 0])]
#[TestWith([0, 1, 1])]
#[TestWith([1, 0, 1])]
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:**
```
testStarted name='testAdd with data set #0'
testStarted name='testAdd with data set #1'
testStarted name='testAdd with data set #2'
```

**AST analysis: ✅** — data is directly in the attribute, counts indices.

---

### 10. `#[TestWith]` — with dataset name ✅

```php
#[TestWith([0, 0, 0], 'adding zeros')]
#[TestWith([0, 1, 1], 'zero plus one')]
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:**
```
testStarted name='testAdd with data set "adding zeros"'
testStarted name='testAdd with data set "zero plus one"'
```

**AST analysis: ✅** — second argument is a string literal.

---

### 11. `#[TestWithJson]` ✅

```php
#[TestWithJson('[0, 0, 0]')]
#[TestWithJson('[0, 1, 1]')]
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:**
```
testStarted name='testAdd with data set #0'
testStarted name='testAdd with data set #1'
```

**AST analysis: ✅** — JSON string literal, counts indices.

---

### 12. `@dataProvider` — legacy annotation ⚠️

```php
/**
 * @dataProvider additionProvider
 */
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:** same as patterns 1-7, depends on provider method implementation.

**AST analysis:** same as #1-7, the only difference is declaration method (docblock vs attribute), subject to the same limitations. Removed in PHPUnit 12.

---

### 13. Multiple DataProviders ✅

```php
#[DataProvider('providerA')]
#[DataProvider('providerB')]
public function testAdd(int $a, int $b, int $expected): void { ... }

public static function providerA(): array {
    return ['a1' => [0, 0, 0]];
}
public static function providerB(): array {
    return ['b1' => [1, 1, 2]];
}
```

**Teamcity:**
```
testStarted name='testAdd with data set "a1"'
testStarted name='testAdd with data set "b1"'
```

**AST analysis: ✅** — each provider is analyzed independently and results are merged. If any provider is unresolvable, that provider's portion falls back to Teamcity.

---

## Pest Patterns

### 14. `->with([...])` — no keys (string values) ✅

```php
it('has emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with(['enunomaduro@gmail.com', 'other@example.com']);
```

**Teamcity (Pest v1):**
```
testStarted name='it has emails with data set #0'
testStarted name='it has emails with data set #1'
```

**Teamcity (Pest v2+):**
```
testStarted name='it has emails with data set "(|'enunomaduro@gmail.com|')"'
testStarted name='it has emails with data set "(|'other@example.com|')"'
```

Note: Pest v2+ uses `|'` to escape single quotes; the value itself becomes the dataset name.

**AST analysis: ✅** — literal array, counts indices.

---

### 15. `->with([...])` — named keys ✅

```php
it('has emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with([
    'james'  => 'james@laravel.com',
    'taylor' => 'taylor@laravel.com',
]);
```

**Teamcity:**
```
testStarted name='it has emails with data set "james"'
testStarted name='it has emails with data set "taylor"'
```

**AST analysis: ✅** — string literal keys.

---

### 16. `->with([...])` — tuples ✅

```php
it('has users', function (string $name, string $email) {
    // ...
})->with([
    ['Nuno', 'enunomaduro@gmail.com'],
    ['Other', 'other@example.com'],
]);
```

**Teamcity (Pest v1):**
```
testStarted name='it has users with data set #0'
testStarted name='it has users with data set #1'
```

**Teamcity (Pest v2+):**
```
testStarted name='it has users with data set "(|'Nuno|', |'enunomaduro@gmail.com|')"'
testStarted name='it has users with data set "(|'Other|', |'other@example.com|')"'
```

**AST analysis: ✅** — literal arrays, counts indices.

---

### 17. `->with('name')` — shared dataset ❌

```php
// tests/Datasets/Emails.php
dataset('emails', ['a@b.com', 'b@b.com']);

// tests/Unit/ExampleTest.php
it('has emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with('emails');
```

**Teamcity:** depends on dataset definition content.

**AST analysis: ❌** — requires cross-file lookup of `dataset('emails', ...)` definition. Not yet implemented, Teamcity fallback.

---

### 18. `->with(function(){})` — anonymous function ⚠️

```php
// ✅ Supported: compound body uses evaluateMethodBody logic
it('works', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(function () {
    yield 'one' => [1, 0, 1];
    yield 'two' => [0, 1, 1];
});

// ✅ Supported: closure with loop
->with(function () {
    for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }
})

// ❌ Not supported: closure with dynamic logic
->with(function () {
    foreach (User::all() as $user) { yield $user->name => [$user]; }
})
```

**Teamcity:**
```
testStarted name='it works with data set "one"'
testStarted name='it works with data set "two"'
```

**AST analysis: ⚠️** — when `DataProviderParser` detects an `anonymous_function` with a `compound_statement` body, it extracts the body children and runs `evaluateMethodBody()`, subject to exactly the same limitations as #4-7.

---

### 19. `->with(fn() => ...)` — arrow function ⚠️

```php
// ✅ Supported: arrow function returning range()
it('works', function (int $i) {
    expect($i)->toBeInt();
})->with(fn(): array => range(1, 99));

// ✅ Supported: arrow function returning array literal
it('works', function (string $v) {
    expect($v)->not->toBeEmpty();
})->with(fn() => ['a', 'b', 'c']);

// ❌ Not supported: dynamic expression
it('works', function ($user) {
    // ...
})->with(fn() => User::all());
```

**Teamcity:**
```
testStarted name='it works with data set #0'
... (99 total)
```

**AST analysis: ⚠️** — arrow function body is an expression (not a `compound_statement`). `DataProviderParser` attempts to resolve it via `evaluateArrowBody()`, which supports array literals, `range()` calls, and class constants. Dynamic expressions fall back to Teamcity.

---

### 20. `->with([fn() => ...])` — bound dataset ✅

```php
it('generates name', function (User $user) {
    expect($user->full_name)->toBe("{$user->first_name} {$user->last_name}");
})->with([
    fn() => User::factory()->create(['first_name' => 'Nuno']),
    fn() => User::factory()->create(['first_name' => 'Luke']),
]);
```

**Teamcity:**
```
testStarted name='it generates name with data set #0'
testStarted name='it generates name with data set #1'
```

**AST analysis: ✅** — no need to know the Closure return value; `extractLabels()` counts array entries to produce `#0`, `#1`.

---

### 21. `->with()->with()` — combined (Cartesian product) ✅

```php
it('business closed', function (string $business, string $day) {
    // ...
})->with(['Office', 'Bank', 'School'])
  ->with(['Saturday', 'Sunday']);
```

**Teamcity (Pest v2+):**
```
testStarted name='it business closed with data set "(|'Office|', |'Saturday|')"'
testStarted name='it business closed with data set "(|'Office|', |'Sunday|')"'
testStarted name='it business closed with data set "(|'Bank|', |'Saturday|')"'
testStarted name='it business closed with data set "(|'Bank|', |'Sunday|')"'
testStarted name='it business closed with data set "(|'School|', |'Saturday|')"'
testStarted name='it business closed with data set "(|'School|', |'Sunday|')"'
```

**AST analysis: ✅** — both sides are literal arrays, computes Cartesian product. If either side is unresolvable, the entire combined dataset falls back to Teamcity.

---

## Teamcity Post-Execution Fallback

All patterns that AST cannot statically resolve are dynamically populated with dataset child nodes from Teamcity output after the first test run.

| Component | Status | Description |
|-----------|:------:|------------|
| `DatasetExpander.fromTestOutput` | ✅ | Parses `with data set #N` and `with data set "name"` formats from Teamcity output |
| `DatasetExpander.fromAnnotations` | ✅ | Creates dataset children from static analysis labels, ensures consistent format |
| `isDatasetResult` | ✅ | Used by TestResultObserver to distinguish dataset vs non-dataset results |
| `DatasetObserver` | ✅ | Dynamically creates dataset child TestItem nodes from Teamcity output after execution |

### Fallback Flow

1. User opens file → AST static analysis produces known dataset child nodes
2. User runs tests → Teamcity output contains test names with `with data set`
3. `isDatasetResult` identifies dataset results → `DatasetObserver` dynamically creates missing child nodes
4. Next time the file is opened, AST static analysis runs again (Teamcity fallback is not persisted, rebuilt after each execution)

---

## Backlog

- [ ] **#17 Pest shared dataset** — requires cross-file lookup of `dataset('name', ...)` definitions, significant implementation effort
