# Pest v1 / v2 / v3 ID Format Comparison

以 `it adds numbers` (named dataset) 和 `it validates emails` (inline dataset) 為例。

## 1. --list-tests (v2 和 v3 完全相同)

```
Class::__pest_evaluable_it_adds_numbers"dataset "one plus one""
Class::__pest_evaluable_it_validates_emails"('alice@example.com')"
Class::__pest_evaluable_it_multiplies_numbers"(2, 3, 6)"
Class::__pest_evaluable_it_business_closed"('Office') / ('Saturday')"
```

## 2. --teamcity testSuiteStarted (dataset parent)

### v2 — evaluable name + `file://` locationHint
```
testSuiteStarted
  name='...DatasetTest::__pest_evaluable_it_adds_numbers'
  locationHint='file:///path/DatasetTest.php'
```

### v3 — human-readable name + `pest_qn://` locationHint with method
```
testSuiteStarted
  name='it adds numbers'
  locationHint='pest_qn:///path/DatasetTest.php::it adds numbers'
```

## 3. --teamcity testStarted (dataset child)

### v2 — human-readable name + `pest_qn://` locationHint
```
testStarted
  name='it adds numbers with data set "dataset "one plus one""'
  locationHint='pest_qn:///path/DatasetTest.php::it adds numbers with data set "dataset "one plus one""'
```

### v3 — 完全相同
```
testStarted
  name='it adds numbers with data set "dataset "one plus one""'
  locationHint='pest_qn:///path/DatasetTest.php::it adds numbers with data set "dataset "one plus one""'
```

## 4. --teamcity testSuiteStarted (non-dataset, class level)

### v2 — evaluable FQN + `file://`
```
testSuiteStarted
  name='Users\...\DatasetTest'
  locationHint='file:///path/DatasetTest.php'
```

### v3 — evaluable FQN + `pest_qn://`
```
testSuiteStarted
  name='Users\...\DatasetTest'
  locationHint='pest_qn:///path/DatasetTest.php'
```

## 5. --teamcity testStarted (non-dataset, e.g. ExampleTest)

### v2 — human-readable name + `pest_qn://`
```
testStarted
  name='test description'
  locationHint='pest_qn:///path/ExampleTest.php::test description'
```

### v3 — 完全相同
```
testStarted
  name='test description'
  locationHint='pest_qn:///path/ExampleTest.php::test description'
```

## 6. TestParser (AST) 產生的 id 格式

```
tests/Unit/DatasetTest.php::it adds numbers
tests/Unit/ExampleTest.php::test description
```

## Summary: 差異只在 testSuiteStarted

| 事件 | v2 | v3 |
|---|---|---|
| **testSuiteStarted (class)** | `file://` hint | `pest_qn://` hint |
| **testSuiteStarted (dataset parent)** | evaluable `name` + `file://` hint | human-readable `name` + `pest_qn://` hint with method |
| **testStarted** | human-readable `name` + `pest_qn://` hint | **相同** |
| **testFinished/testFailed** | human-readable `name` | **相同** |

**結論**: `testStarted` / `testFinished` / `testFailed` 在 v2 和 v3 **完全相同**，都用 human-readable name。差異**只在 `testSuiteStarted`**：v2 的 dataset parent suite 用 evaluable name + `file://`，v3 用 human-readable name + `pest_qn://`。

## Pest v1 (Pest 1.23.1 / PHPUnit 9.6.34)

### --list-tests
```
P\Tests\Unit\DatasetTest::it adds numbers"one plus one"
P\Tests\Unit\DatasetTest::it adds numbers"two plus three"
P\Tests\Unit\DatasetTest::it validates emails with ('alice@example.com')
P\Tests\Unit\DatasetTest::it multiplies numbers with (2, 3, 6)
P\Tests\Unit\DatasetTest::it business closed with ('Office') / ('Saturday')
P\Tests\Unit\DatasetTest::it generates numbers"gen one"
```

### --teamcity testSuiteStarted (class level)
```
testSuiteStarted
  name='Tests\Unit\DatasetTest'
  locationHint='pest_qn:///path/tests/Unit/DatasetTest.php'
```

### --teamcity testStarted (dataset child)
```
testStarted
  name='it adds numbers with data set "one plus one"'
  locationHint='pest_qn:///path/tests/Unit/DatasetTest.php::it adds numbers with data set "one plus one"'
```

### --teamcity (no testSuiteStarted for dataset parent)
v1 does NOT emit `testSuiteStarted` for dataset parent methods — only class-level `testSuiteStarted`.

### Summary v1 vs v2 vs v3

| 事件 | v1 | v2 | v3 |
|---|---|---|---|
| **testSuiteStarted (class)** | `pest_qn://` hint | `file://` hint | `pest_qn://` hint |
| **testSuiteStarted (dataset parent)** | **不存在** | evaluable `name` + `file://` | human-readable `name` + `pest_qn://` |
| **testStarted** | human-readable + `pest_qn://` | **相同** | **相同** |
| **testFinished/testFailed** | human-readable | **相同** | **相同** |

**v1 結論**: v1 和 v3 格式幾乎相同（都用 `pest_qn://` + human-readable name），唯一差異是 v1 不會對 dataset parent 發送 `testSuiteStarted`。evaluable 格式是 v2 獨有的。
