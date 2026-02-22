# Data Provider / Dataset 完整指南

Issue: https://github.com/recca0120/vscode-phpunit/issues/297

本文件整合所有 PHP DataProvider / Pest Dataset 的語法對照、Teamcity 輸出格式，以及靜態解析的實際支援狀態。

策略：**AST 先行 + Teamcity 補漏** — 靜態解析能覆蓋最常見的 pattern（約 70-80%），Teamcity 輸出能覆蓋 100%，作為 fallback 在第一次執行後補上 dataset 子節點。

**圖例**: ✅ 完成 | ⚠️ 部分支援 | ❌ 未實作 | N/A 設計上不解析（靠 Teamcity 補）

---

## 總覽

| # | Pattern | AST 解析 | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:--------:|:----:|:----:|:----------:|------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | ✅ | ✅ | 最常見 |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | ✅ | ✅ | |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | ✅ | ✅ | |
| 4 | `#[DataProvider]` + yield named | ⚠️ | ✅ | ✅ | ✅ | 頂層僅支援 string literal key |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | ✅ | ✅ | |
| 6 | `#[DataProvider]` + loop/動態 | ⚠️ | ✅ | ✅ | ✅ | 支援 for/foreach/while/巢狀 |
| 7 | `#[DataProvider]` + method call | ⚠️ | ✅ | ✅ | ✅ | 僅 array_map/array_combine/range |
| 8 | `#[DataProviderExternal]` | N/A | N/A | N/A | ✅ | 跨檔不解析 |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | ✅ | ✅ | |
| 10 | `#[TestWith]` named | ✅ | ✅ | ✅ | ✅ | |
| 11 | `#[TestWithJson]` | ✅ | ✅ | ✅ | ✅ | |
| 12 | `@dataProvider` (legacy) | 同1-7 | ✅ | ✅ | ✅ | PHPUnit 12 移除 |
| 13 | 多個 DataProvider | ✅ | ✅ | ✅ | ✅ | |
| 14 | Pest `->with([])` no keys | ✅ | ✅ | ✅ | ✅ | |
| 15 | Pest `->with([])` named keys | ✅ | ✅ | ✅ | ✅ | |
| 16 | Pest `->with([[]])` tuples | ✅ | ✅ | ✅ | ✅ | |
| 17 | Pest `->with('name')` shared | ❌ | ❌ | ❌ | ✅ | 需跨檔找 dataset() |
| 18 | Pest `->with(function(){})` | ⚠️ | ✅ | ✅ | ✅ | 同 #4-7 限制 |
| 19 | Pest `->with(fn() =>)` arrow | N/A | N/A | N/A | ✅ | arrow function 無法解析 |
| 20 | Pest bound dataset `[fn()=>...]` | ✅ | ✅ | ✅ | ✅ | |
| 21 | Pest `->with()->with()` combined | ✅ | ✅ | ✅ | ✅ | 笛卡爾積 |

---

## 實作架構

靜態解析的核心元件：

| 檔案 | 職責 |
|------|------|
| `DataProviderParser.ts` | 入口，依 AST node kind 分派：`array_creation_expression` → `extractLabels()`、`method_declaration` → `evaluateMethodBody()`、`anonymous_function` → 取 compound body 後走 `evaluateMethodBody()` |
| `evaluate.ts` | 核心求值引擎，包含迴圈展開、表達式解析、字串插值等邏輯 |

`evaluate.ts` 主要函式：

| 函式 | 說明 |
|------|------|
| `evaluateMethodBody(body, classBody?)` | 入口：辨識 return array / function call / yield / loop |
| `evaluateForLoop(loop, classBody?, outerBindings?)` | 展開 C-style for 迴圈 |
| `evaluateForeachLoop(loop, classBody?, outerBindings?)` | 展開 foreach 迴圈 |
| `evaluateWhileLoop(loop, initialBindings)` | 展開 while 迴圈 |
| `evaluateInnerLoop(loop, outerBindings, classBody?)` | 巢狀迴圈委派 |
| `evaluateLoopYields(iterations, body, classBody?)` | 對每次迭代解析 yield key |
| `evaluateFunctionCallReturn(node)` | 處理 `array_map` / `array_combine` |
| `resolveExpression(node, bindings)` | 解析 yield key 表達式（string / variable / interpolated / concat / ternary） |
| `resolveIterable(source, classBody?)` | 解析迴圈的迭代源（array literal / class constant / `range()`） |
| `extractLabels(entries)` | 從 array entry 或頂層 yield 提取 label（僅 string literal key） |

Teamcity 補漏元件：

| 元件 | 說明 |
|------|------|
| `resolveDatasetDefinition` | 解析 Teamcity 輸出中的 `#N` 和 `"name"` 格式 |
| `isDatasetResult` | TestResultObserver 用來分流 dataset vs 非 dataset 結果 |
| `DatasetChildObserver` | 執行後從 Teamcity 輸出動態建立 dataset 子 TestItem |
| `createDatasetDefinition` | 統一建構 dataset TestDefinition |

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

**AST 解析：✅** — return array，key 是 string literal。

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

**AST 解析：✅** — 算 index。

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
testStarted name='addition_provider with data set #2'   ← [1,0,2] 失敗的排最前
testStarted name='addition_provider with data set #0'   ← [0,1,1]
testStarted name='addition_provider with data set #1'   ← 沒有 #1，因為 "foo-bar_%$" 佔了
```

**Teamcity (PHPUnit 10+):**
```
testStarted name='addition_provider with data set #1'
testStarted name='addition_provider with data set ""foo-bar_%$"'
testStarted name='addition_provider with data set #0'
```

**AST 解析：✅** — mixed keys，named 用 string，其餘算 index。

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

**AST 解析：⚠️** — 頂層 yield 僅支援 string literal key。

| yield key 類型 | 頂層 yield | 迴圈內 yield | 範例 |
|---------------|:----------:|:----------:|------|
| string literal | ✅ | ✅ | `yield 'foo' => [1]` |
| variable | ❌ | ✅ | `yield $v => [$v]` |
| interpolated string | ❌ | ✅ | `yield "case $i" => [$i]` |
| concatenation (`.`) | ❌ | ✅ | `yield $v . '_test' => [$v]` |
| ternary | ❌ | ✅ | `yield ($i > 0 ? "pos" : "zero") => [$i]` |
| method call | ❌ | ❌ | `yield $obj->getName() => [...]` |
| function call | ❌ | ❌ | `yield strtoupper($v) => [...]` |

> **技術原因**：頂層 yield 透過 `extractLabels()` 處理，僅檢查 `key.kind === 'string'`。迴圈內 yield 透過 `resolveExpression()` 處理，能解析 variable、interpolated string、concatenation、ternary 等表達式（需有 bindings 提供變數值）。

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

**AST 解析：✅** — 算 index。

---

### 6. `#[DataProvider]` + loop / 動態生成 ⚠️

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
... (共 100 個)
```

**支援的迴圈模式：**

```php
// ✅ for loop + yield
for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }

// ✅ foreach + array literal
foreach (['a', 'b'] as $v) { yield $v => [$v]; }

// ✅ foreach + class constant
foreach (self::CASES as $v) { yield $v => [$v]; }

// ✅ foreach + range()
foreach (range(1, 3) as $i) { yield "case $i" => [$i]; }

// ✅ while loop（僅 $i++ / $i-- 遞增遞減）
$i = 0; while ($i < 3) { yield "item $i" => [$i]; $i++; }

// ✅ 巢狀迴圈
foreach (['a', 'b'] as $x) {
    foreach ([1, 2] as $y) { yield "$x$y" => [$x, $y]; }
}
```

**不支援（靠 Teamcity 補）：**

```php
// ❌ 動態迭代源
foreach ($this->getItems() as $v) { yield $v => [$v]; }

// ❌ 複雜 while 條件
while ($iterator->hasNext()) { yield $iterator->current(); }

// ❌ break / continue 條件跳出
for ($i = 0; $i < 100; $i++) {
    if ($i % 2 === 0) continue;
    yield "odd $i" => [$i];
}

// ❌ 複合遞增（while 只支援 ++ / --）
$i = 0; while ($i < 10) { yield $i => [$i]; $i += 2; }
```

**各迴圈類型限制：**

| 迴圈 | 限制 |
|------|------|
| `for` | init 必須是 `$var = number`；condition 必須是 `$var op number`（op: `<`, `<=`, `>`, `>=`）；update 必須是 `$var++` 或 `$var--` |
| `foreach` | source 必須是 array literal、class constant（`self::CONST`）、或 `range(start, end[, step])`；其餘動態來源不支援 |
| `while` | condition 必須是 `$var op number`；body 內 update 必須是 `$var++` 或 `$var--`；不支援 `$i += N` 等複合運算 |
| 巢狀 | 支援 foreach/for 的任意組合巢狀；外層 bindings 自動傳入內層 |
| 安全上限 | MAX_ITERATIONS = 1000，超過即停止展開 |

---

### 7. `#[DataProvider]` + method call / 表達式 ⚠️

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

**Teamcity:** 取決於執行結果，可能是 named 或 indexed。

| 函式呼叫 | 支援 | 解析方式 | 範例 |
|---------|:----:|---------|------|
| `array_map(fn, array_literal)` | ✅ | 計算第二參數 array 長度，產出 `#0`, `#1`, ... | `return array_map(fn($x) => [$x], ['a', 'b'])` |
| `array_combine(keys, values)` | ✅ | 取第一參數 array 的 string entry 作為 label | `return array_combine(['foo', 'bar'], [[1], [2]])` |
| `range(start, end)` | ✅ | 作為 foreach 迭代源（見 #6） | `foreach (range(1, 3) as $i)` |
| 自定義 method call | ❌ | — | `return self::baseData() + self::extraData()` |
| 鏈式呼叫 | ❌ | — | `return collect([...])->map(...)->toArray()` |

> **注意**：`array_map` 的第二參數必須是 array literal，若是 `range()` 等動態來源則無法解析（回傳 `[]`）。`array_combine` 的第一參數（keys）必須是 string literal array。

---

### 8. `#[DataProviderExternal(Class, 'method')]` N/A

```php
#[DataProviderExternal(ExternalData::class, 'provider')]
public function testAdd(int $a, int $b, int $expected): void { ... }

// 在另一個檔案
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

**AST 解析：N/A** — 需要跨檔解析外部 class，設計上不靜態解析。靠 Teamcity 執行後補。

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

**AST 解析：✅** — 資料直接在 attribute 裡，算 index。

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

**AST 解析：✅** — 第二參數是 string literal。

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

**AST 解析：✅** — JSON string literal，算 index。

---

### 12. `@dataProvider` — legacy annotation ⚠️

```php
/**
 * @dataProvider additionProvider
 */
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:** 同 pattern 1-7，取決於 provider method 的寫法。

**AST 解析：** 同 #1-7，差別只在宣告方式（docblock vs attribute），受相同限制。PHPUnit 12 移除此 annotation。

---

### 13. 多個 DataProvider ✅

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

**AST 解析：✅** — 每個 provider 獨立解析後合併。若任一 provider 不可解析，該 provider 部分靠 Teamcity 補。

---

## Pest Patterns

### 14. `->with([...])` — no keys（string values）✅

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

注意：Pest v2+ 用 `|'` 轉義單引號，值本身成為 dataset name。

**AST 解析：✅** — literal array，算 index。

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

**AST 解析：✅** — string literal keys。

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

**AST 解析：✅** — literal arrays，算 index。

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

**Teamcity:** 取決於 dataset 定義的內容。

**AST 解析：❌** — 需要跨檔找到 `dataset('emails', ...)` 定義並解析。目前未實作，靠 Teamcity 補。

---

### 18. `->with(function(){})` — anonymous function ⚠️

```php
// ✅ 支援：compound body 走 evaluateMethodBody 邏輯
it('works', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with(function () {
    yield 'one' => [1, 0, 1];
    yield 'two' => [0, 1, 1];
});

// ✅ 支援：closure 內含迴圈
->with(function () {
    for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }
})

// ❌ 不支援：closure 內含動態邏輯
->with(function () {
    foreach (User::all() as $user) { yield $user->name => [$user]; }
})
```

**Teamcity:**
```
testStarted name='it works with data set "one"'
testStarted name='it works with data set "two"'
```

**AST 解析：⚠️** — `DataProviderParser` 檢測到 `anonymous_function` 且 body 為 `compound_statement` 時，取出 body children 走 `evaluateMethodBody()` 相同邏輯，因此受 #4-7 完全相同的限制。

---

### 19. `->with(fn() => ...)` — arrow function N/A

```php
it('works', function (int $i) {
    expect($i)->toBeInt();
})->with(fn(): array => range(1, 99));
```

**Teamcity:**
```
testStarted name='it works with data set #0'
... (共 99 個)
```

**AST 解析：N/A** — arrow function 的 body 不是 `compound_statement`（它是一個 expression），`DataProviderParser` 直接 return `[]`。靠 Teamcity 補。

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

**AST 解析：✅** — 不需要知道 Closure 回傳值，`extractLabels()` 數 array entry 數量產出 `#0`, `#1`。

---

### 21. `->with()->with()` — combined（笛卡爾積）✅

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

**AST 解析：✅** — 兩邊都是 literal array，計算笛卡爾積。若任一邊不可解析，則整個 combined dataset 靠 Teamcity 補。

---

## Teamcity 執行後補漏

所有 AST 無法靜態解析的 pattern，都能在第一次執行後透過 Teamcity 輸出動態補上 dataset 子節點。

| 元件 | 狀態 | 說明 |
|------|:----:|------|
| `resolveDatasetDefinition` | ✅ | 解析 Teamcity 輸出中的 `with data set #N` 和 `with data set "name"` 格式 |
| `isDatasetResult` | ✅ | TestResultObserver 用來分流 dataset vs 非 dataset 結果 |
| `DatasetChildObserver` | ✅ | 執行後從 Teamcity 輸出動態建立 dataset 子 TestItem 節點 |
| `createDatasetDefinition` | ✅ | 統一建構 dataset TestDefinition，確保格式一致 |

### 補漏流程

1. 使用者開啟檔案 → AST 靜態解析產出已知的 dataset 子節點
2. 使用者執行測試 → Teamcity 輸出中出現 `with data set` 的 test name
3. `isDatasetResult` 判斷為 dataset 結果 → `DatasetChildObserver` 動態建立缺少的子節點
4. 下次開啟檔案時仍走 AST 靜態解析（Teamcity 補漏不持久化，每次執行後重建）

---

## 待辦

- [ ] **#17 Pest shared dataset** — 需跨檔找到 `dataset('name', ...)` 定義並解析，改動較大
