# Data Provider / Dataset 支援狀態追蹤

對照 [data-provider-patterns.md](./data-provider-patterns.md) 的 21 個 pattern，追蹤 AST 靜態解析與 Teamcity 補漏的實作狀態。

---

## PHPUnit — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | ✅ | |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | ✅ | |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | ✅ | |
| 4 | `#[DataProvider]` + yield named | ⚠️ | ✅ | ✅ | [詳見 #4](#4-yield-named-key-支援範圍) |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | ✅ | |
| 6 | `#[DataProvider]` + loop/動態 | ⚠️ | ✅ | ✅ | [詳見 #6](#6-loop動態-支援範圍) |
| 7 | `#[DataProvider]` + method call | ⚠️ | ✅ | ✅ | [詳見 #7](#7-method-call-支援範圍) |
| 8 | `#[DataProviderExternal]` | N/A | N/A | ✅ | 跨檔不解析，靠 Teamcity 執行後補 |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | ✅ | |
| 10 | `#[TestWith]` named (第二參數) | ✅ | ✅ | ✅ | |
| 11 | `#[TestWithJson]` | ✅ | ✅ | ✅ | |
| 12 | `@dataProvider` (legacy) | ⚠️ | ✅ | ✅ | 同 #1-7，受相同限制 |
| 13 | 多個 DataProvider | ✅ | ✅ | ✅ | |

## Pest — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 14 | `->with([])` no keys | ✅ | ✅ | ✅ | |
| 15 | `->with([])` named keys | ✅ | ✅ | ✅ | |
| 16 | `->with([[]])` tuples | ✅ | ✅ | ✅ | |
| 17 | `->with('name')` shared dataset | ❌ | ❌ | ✅ | 需跨檔找 `dataset()` 定義 |
| 18 | `->with(fn())` closure | ⚠️ | ✅ | ✅ | [詳見 #18](#1819-pest-closuregenerator-支援範圍) |
| 19 | `->with(Generator)` | ⚠️ | ✅ | ✅ | [詳見 #18](#1819-pest-closuregenerator-支援範圍) |
| 20 | bound dataset `[fn()=>...]` | ✅ | ✅ | ✅ | 數 array entry 產出 `#N` |
| 21 | `->with()->with()` combined | ✅ | ✅ | ✅ | |

---

## 部分支援詳細說明

### #4 yield named key 支援範圍

| yield key 類型 | 支援 | 範例 |
|---------------|:----:|------|
| string literal | ✅ | `yield 'foo' => [1]` |
| variable | ✅ | `yield $v => [$v]` |
| interpolated string | ✅ | `yield "case $i" => [$i]` |
| concatenation (`.`) | ✅ | `yield $v . '_test' => [$v]` |
| ternary | ✅ | `yield ($i > 0 ? "pos" : "zero") => [$i]` |
| method call | ❌ | `yield $obj->getName() => [...]` |
| function call (非內建) | ❌ | `yield strtoupper($v) => [...]` |

### #6 loop/動態 支援範圍

**支援：**
```php
// for loop + yield
for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }

// foreach + array literal
foreach (['a', 'b'] as $v) { yield $v => [$v]; }

// foreach + class constant
foreach (self::CASES as $v) { yield $v => [$v]; }

// foreach + range()
foreach (range(1, 3) as $i) { yield "case $i" => [$i]; }

// while loop (簡單 increment/decrement)
$i = 0; while ($i < 3) { yield "item $i" => [$i]; $i++; }

// 巢狀迴圈
foreach (['a', 'b'] as $x) {
    foreach ([1, 2] as $y) { yield "$x$y" => [$x, $y]; }
}
```

**不支援（靠 Teamcity 補）：**
```php
// 動態迭代源
foreach ($this->getItems() as $v) { yield $v => [$v]; }

// 複雜條件
while ($iterator->hasNext()) { yield $iterator->current(); }

// break/continue 條件跳出
for ($i = 0; $i < 100; $i++) {
    if ($i % 2 === 0) continue;
    yield "odd $i" => [$i];
}

// 多重 assignment / 複合運算
$i = 0; while ($i < 10) { yield $i => [$i]; $i += 2; }
```

### #7 method call 支援範圍

| 函式呼叫 | 支援 | 範例 |
|---------|:----:|------|
| `array_map(fn, array_literal)` | ✅ | `return array_map(fn($x) => [$x], ['a', 'b'])` |
| `array_combine(keys, values)` | ✅ | `return array_combine(['foo', 'bar'], [[1], [2]])` |
| `range(start, end)` | ✅ | `foreach (range(1, 3) as $i)` |
| 自定義 method call | ❌ | `return self::baseData() + self::extraData()` |
| 鏈式呼叫 | ❌ | `return collect([...])->map(...)→toArray()` |

### #18/19 Pest closure/Generator 支援範圍

`DataProviderParser` 能解析 `anonymous_function` 的 body，走 `evaluateMethodBody` 相同邏輯，因此受 #4-7 相同限制。

**支援：**
```php
// closure + yield literal
->with(function () {
    yield 'one' => [1];
    yield 'two' => [2];
})

// closure + loop
->with(function () {
    for ($i = 0; $i < 3; $i++) { yield "case $i" => [$i]; }
})
```

**不支援（靠 Teamcity 補）：**
```php
// arrow function（body 非 compound_statement，直接返回 []）
->with(fn(): array => range(1, 99))

// closure 內含動態邏輯
->with(function () {
    foreach (User::all() as $user) { yield $user->name => [$user]; }
})
```

---

## Teamcity 執行後補漏

| 功能 | 實作 | 測試 | 備註 |
|------|:----:|:----:|------|
| `resolveDatasetDefinition` | ✅ | ✅ | 支援 `#N` 和 `"name"` 格式 |
| `isDatasetResult` | ✅ | ✅ | TestResultObserver 用來分流 dataset vs 非 dataset |
| `DatasetChildObserver` 動態建立子節點 | ✅ | ✅ | 執行後從 Teamcity 輸出補上 dataset TestItem |
| `createDatasetDefinition` | ✅ | ✅ | 統一建構 dataset TestDefinition |

## 待辦

- [ ] **#17 Pest shared dataset** — 需跨檔找到 `dataset('name', ...)` 定義並解析，改動較大

---

**圖例**: ✅ 完成 | ⚠️ 部分完成 | ❌ 未實作 | N/A 設計上不解析（靠 Teamcity 補）
