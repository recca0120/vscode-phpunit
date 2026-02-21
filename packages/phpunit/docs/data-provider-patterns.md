# Data Provider / Dataset：PHP 語法 ↔ Teamcity 輸出對照

Issue: https://github.com/recca0120/vscode-phpunit/issues/297

目標：整理所有 PHP 寫法和對應的 Teamcity 輸出，評估靜態解析可行性。
靜態解析不出來的，至少 Teamcity 輸出可以在執行後補上 dataset 子節點。

---

## PHPUnit

### 1. `#[DataProvider]` + return array + named keys

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

**AST 可解析：O** — return array，key 是 string literal。

---

### 2. `#[DataProvider]` + return array + numeric keys

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

**AST 可解析：O** — 算 index。

---

### 3. `#[DataProvider]` + return array + mixed keys

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

**AST 可解析：O** — mixed keys，named 用 string，其餘算 index。

---

### 4. `#[DataProvider]` + Generator yield + named keys

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

**AST 可解析：△** — yield key 必須是 string literal 才能解析。如果是變數 `yield $key => [...]` 則不行。

---

### 5. `#[DataProvider]` + Generator yield + no keys

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

**AST 可解析：O** — 算 index。

---

### 6. `#[DataProvider]` + loop / 動態生成

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

**AST 可解析：X** — 需要執行 PHP。Teamcity 輸出可補。

---

### 7. `#[DataProvider]` + method call / constant / 表達式

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

**AST 可解析：X** — 依賴 runtime。Teamcity 輸出可補。

---

### 8. `#[DataProviderExternal(Class, 'method')]`

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

**AST 可解析：X** — 需要跨檔解析外部 class。Teamcity 輸出可補。

---

### 9. `#[TestWith]` — inline attribute

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

**AST 可解析：O** — 資料直接在 attribute 裡。算 index。

---

### 10. `#[TestWith]` — with dataset name (第二參數)

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

**AST 可解析：O** — 第二參數是 string literal。

---

### 11. `#[TestWithJson]` — JSON inline

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

**AST 可解析：O** — JSON string literal。

---

### 12. `@dataProvider` — legacy annotation (PHPUnit 9-11, PHPUnit 12 移除)

```php
/**
 * @dataProvider additionProvider
 */
public function testAdd(int $a, int $b, int $expected): void { ... }
```

**Teamcity:** 同 pattern 1-7，取決於 provider method 的寫法。

**AST 可解析：** 同 pattern 1-7。差別只在宣告方式（docblock vs attribute）。

---

### 13. 多個 DataProvider

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

**AST 可解析：△** — 每個 provider 都要可解析。

---

## Pest

### 14. `->with([...])` — inline array, string values (no keys)

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

**AST 可解析：O** — literal array。

---

### 15. `->with([...])` — inline array, named keys

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

**AST 可解析：O** — string literal keys。

---

### 16. `->with([...])` — inline tuples

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

**AST 可解析：O** — literal arrays。

---

### 17. `->with('name')` — shared dataset by name

```php
// tests/Datasets/Emails.php
dataset('emails', ['a@b.com', 'b@b.com']);

// tests/Unit/ExampleTest.php
it('has emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with('emails');
```

**Teamcity:** 取決於 dataset 定義的內容。

**AST 可解析：△** — 需要找到 `dataset('emails', ...)` 的定義並解析其 array。如果是 literal array 就可以。

---

### 18. `->with(fn() => ...)` — lazy closure

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

**AST 可解析：X** — 需要執行 PHP。Teamcity 輸出可補。

---

### 19. `->with(function(): Generator { ... })` — Generator closure

```php
it('works', function (int $i) {
    expect($i)->toBeInt();
})->with(function (): Generator {
    for ($i = 1; $i < 100; $i++) {
        yield "item $i" => $i;
    }
});
```

**Teamcity:**
```
testStarted name='it works with data set "item 1"'
... (共 99 個)
```

**AST 可解析：X** — 需要執行 PHP。Teamcity 輸出可補。

---

### 20. `->with([fn() => ...])` — bound dataset (closure 延遲執行)

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

**AST 可解析：X** — Closure 需要執行。Teamcity 輸出可補。

---

### 21. `->with()->with()` — combined (笛卡爾積)

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
... (共 6 個)
```

**AST 可解析：△** — 兩邊都是 literal array 就可以算笛卡爾積。含變數/closure 則不行。

---

## 總結

| # | PHP 語法 | AST | Teamcity 可補 | 備註 |
|---|----------|:---:|:-------------:|------|
| 1 | `#[DataProvider]` + named array | O | O | 最常見 |
| 2 | `#[DataProvider]` + numeric array | O | O | |
| 3 | `#[DataProvider]` + mixed keys | O | O | |
| 4 | `#[DataProvider]` + yield named | △ | O | key 須為 literal |
| 5 | `#[DataProvider]` + yield no key | O | O | |
| 6 | `#[DataProvider]` + loop/動態 | X | O | 常見於大量 dataset |
| 7 | `#[DataProvider]` + method call | X | O | |
| 8 | `#[DataProviderExternal]` | X | O | 跨檔 |
| 9 | `#[TestWith]` numeric | O | O | inline，好解析 |
| 10 | `#[TestWith]` named | O | O | 第二參數 |
| 11 | `#[TestWithJson]` | O | O | JSON string |
| 12 | `@dataProvider` (legacy) | 同1-7 | O | PHPUnit 12 移除 |
| 13 | 多個 DataProvider | △ | O | |
| 14 | Pest `->with([])` no keys | O | O | |
| 15 | Pest `->with([])` named keys | O | O | |
| 16 | Pest `->with([[]])` tuples | O | O | |
| 17 | Pest `->with('name')` shared | △ | O | 需找 dataset() |
| 18 | Pest `->with(fn())` closure | X | O | |
| 19 | Pest `->with(Generator)` | X | O | |
| 20 | Pest bound dataset | X | O | |
| 21 | Pest `->with()->with()` combined | △ | O | |

**O = 可解析, △ = 部分可解析, X = 不可解析**

### 結論

- **AST 靜態解析** 能覆蓋最常見的 pattern（1-5, 9-11, 14-16），大約佔實際使用的 70-80%
- **Teamcity 輸出** 能覆蓋 100%，作為 fallback 在第一次執行後補上 dataset 子節點
- 建議策略：**AST 先行 + Teamcity 補漏**
