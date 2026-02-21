# Data Provider / Dataset 支援狀態追蹤

對照 [data-provider-patterns.md](./data-provider-patterns.md) 的 21 個 pattern，追蹤 AST 靜態解析與 Teamcity 補漏的實作狀態。

---

## PHPUnit — AST 靜態解析

| # | Pattern | 實作 | 測試 | 備註 |
|---|---------|:----:|:----:|------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | DataProviderParser + DataProviderAttributeTest.php |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | |
| 4 | `#[DataProvider]` + yield named | ✅ | ✅ | key 須為 string literal |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | DataProviderParser 有測試，Extractor 整合測試未單獨覆蓋 |
| 6 | `#[DataProvider]` + loop/動態 | N/A | ✅ | 設計上不解析，回傳 `[]`，靠 Teamcity 補 |
| 7 | `#[DataProvider]` + method call | N/A | ✅ | 同上 |
| 8 | `#[DataProviderExternal]` | N/A | — | 跨檔不解析，靠 Teamcity 補 |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | AttributeParser.parseDataset |
| 10 | `#[TestWith]` named (第二參數) | ✅ | ✅ | AttributeParser.parseDataset |
| 11 | `#[TestWithJson]` | ✅ | ✅ | AttributeParser.parseDataset |
| 12 | `@dataProvider` (legacy) | ✅ | ✅ | 同 #1-7，差別只在 docblock vs attribute |
| 13 | 多個 DataProvider | ⚠️ | ❌ | `buildMethodDefinition` 只取 `providers[0]`，忽略後續 provider |

## Pest — AST 靜態解析

| # | Pattern | 實作 | 測試 | 備註 |
|---|---------|:----:|:----:|------|
| 14 | `->with([])` no keys | ✅ | ✅ | DataProviderParser + DatasetTest.php |
| 15 | `->with([])` named keys | ✅ | ✅ | DataProviderParser + DatasetTest.php |
| 16 | `->with([[]])` tuples | ✅ | ⚠️ | DataProviderParser 能解析，但 PestTestExtractor 缺整合測試 |
| 17 | `->with('name')` shared dataset | ❌ | ❌ | `extractPestDataset` 只檢查 array，string 參數直接回 `[]` |
| 18 | `->with(fn())` closure | N/A | — | 設計上不解析，非 array 回 `[]`，靠 Teamcity 補 |
| 19 | `->with(Generator)` | N/A | — | 同上 |
| 20 | bound dataset `[fn()=>...]` | N/A | — | 同上 |
| 21 | `->with()->with()` combined | ❌ | ❌ | `extractPestDataset` 只找第一個 `with()` 就 return，不處理笛卡爾積 |

## Teamcity 執行後補漏

| 功能 | 實作 | 測試 | 備註 |
|------|:----:|:----:|------|
| `resolveDatasetDefinition` | ✅ | ✅ | 支援 `#N` 和 `"name"` 格式 |
| `isDatasetResult` | ✅ | ✅ | TestResultObserver 用來分流 dataset vs 非 dataset |
| `DatasetChildObserver` 動態建立子節點 | ✅ | ✅ | 執行後從 Teamcity 輸出補上 dataset TestItem |
| `createDatasetDefinition` | ✅ | ✅ | 統一建構 dataset TestDefinition |

## 待辦

- [ ] **#13 多個 DataProvider** — `PHPUnitTestExtractor.buildMethodDefinition` 只取第一個 provider，需改為合併所有 provider 的 dataset
- [ ] **#16 Pest tuples 整合測試** — DataProviderParser 已能解析，補 PestTestExtractor 整合測試即可
- [ ] **#17 Pest shared dataset** — 需跨檔找到 `dataset('name', ...)` 定義並解析，改動較大
- [ ] **#21 Pest combined `->with()->with()`** — 需處理多個 `with()` 並計算笛卡爾積，改動較大

---

**圖例**: ✅ 完成 | ⚠️ 部分完成 | ❌ 未實作 | N/A 設計上不解析（靠 Teamcity 補）
