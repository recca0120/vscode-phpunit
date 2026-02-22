# Data Provider / Dataset 支援狀態追蹤

對照 [data-provider-patterns.md](./data-provider-patterns.md) 的 21 個 pattern，追蹤 AST 靜態解析與 Teamcity 補漏的實作狀態。

---

## PHPUnit — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | — | DataProviderParser + DataProviderAttributeTest.php |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | — | |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | — | |
| 4 | `#[DataProvider]` + yield named | ✅ | ✅ | — | key 須為 string literal |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | — | DataProviderParser 有測試，Extractor 整合測試未單獨覆蓋 |
| 6 | `#[DataProvider]` + loop/動態 | N/A | N/A | ✅ | 設計上不解析，回傳 `[]`，靠 Teamcity 執行後補 |
| 7 | `#[DataProvider]` + method call | N/A | N/A | ✅ | 同上 |
| 8 | `#[DataProviderExternal]` | N/A | N/A | ✅ | 跨檔不解析，靠 Teamcity 執行後補 |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | — | AttributeParser.parseDataset |
| 10 | `#[TestWith]` named (第二參數) | ✅ | ✅ | — | AttributeParser.parseDataset |
| 11 | `#[TestWithJson]` | ✅ | ✅ | — | AttributeParser.parseDataset |
| 12 | `@dataProvider` (legacy) | ✅ | ✅ | — | 同 #1-7，差別只在 docblock vs attribute |
| 13 | 多個 DataProvider | ✅ | ✅ | ✅ | `buildMethodDefinition` 遍歷所有 provider 並串接 dataset |

## Pest — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 14 | `->with([])` no keys | ✅ | ✅ | — | DataProviderParser + DatasetTest.php |
| 15 | `->with([])` named keys | ✅ | ✅ | — | DataProviderParser + DatasetTest.php |
| 16 | `->with([[]])` tuples | ✅ | ✅ | — | DataProviderParser + PestTestExtractor + TestCollection 整合測試 |
| 17 | `->with('name')` shared dataset | ❌ | ❌ | ✅ | `extractPestDataset` 只檢查 array，string 參數直接回 `[]` |
| 18 | `->with(fn())` closure | N/A | N/A | ✅ | 設計上不解析，非 array 回 `[]`，靠 Teamcity 執行後補 |
| 19 | `->with(Generator)` | N/A | N/A | ✅ | 同上 |
| 20 | bound dataset `[fn()=>...]` | N/A | N/A | ✅ | 同上 |
| 21 | `->with()->with()` combined | ✅ | ✅ | ✅ | `extractPestDataset` 收集所有 `with()` 並計算笛卡爾積 |

## Teamcity 執行後補漏

| 功能 | 實作 | 測試 | 備註 |
|------|:----:|:----:|------|
| `resolveDatasetDefinition` | ✅ | ✅ | 支援 `#N` 和 `"name"` 格式 |
| `isDatasetResult` | ✅ | ✅ | TestResultObserver 用來分流 dataset vs 非 dataset |
| `DatasetChildObserver` 動態建立子節點 | ✅ | ✅ | 執行後從 Teamcity 輸出補上 dataset TestItem |
| `createDatasetDefinition` | ✅ | ✅ | 統一建構 dataset TestDefinition |

## 待辦

- [x] **#13 多個 DataProvider** — 已改為遍歷所有 provider 並串接 dataset
- [ ] **#17 Pest shared dataset** — 需跨檔找到 `dataset('name', ...)` 定義並解析，改動較大
- [x] **#21 Pest combined `->with()->with()`** — 已改為收集所有 `with()` 並計算笛卡爾積

---

**圖例**: ✅ 完成 | ⚠️ 部分完成 | ❌ 未實作 | N/A 設計上不解析（靠 Teamcity 補）
