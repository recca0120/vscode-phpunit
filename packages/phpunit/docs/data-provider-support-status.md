# Data Provider / Dataset 支援狀態追蹤

對照 [data-provider-patterns.md](./data-provider-patterns.md) 的 21 個 pattern，追蹤 AST 靜態解析與 Teamcity 補漏的實作狀態。

---

## PHPUnit — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 1 | `#[DataProvider]` + named array | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 2 | `#[DataProvider]` + numeric array | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 3 | `#[DataProvider]` + mixed keys | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 4 | `#[DataProvider]` + yield named | ✅ | ✅ | ✅ | AST 已覆蓋（key 須為 string literal），不需靠 Teamcity 補 |
| 5 | `#[DataProvider]` + yield no key | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 6 | `#[DataProvider]` + loop/動態 | N/A | N/A | ✅ | 設計上不解析，回傳 `[]`，靠 Teamcity 執行後補 |
| 7 | `#[DataProvider]` + method call | N/A | N/A | ✅ | 同上 |
| 8 | `#[DataProviderExternal]` | N/A | N/A | ✅ | 跨檔不解析，靠 Teamcity 執行後補 |
| 9 | `#[TestWith]` numeric | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 10 | `#[TestWith]` named (第二參數) | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 11 | `#[TestWithJson]` | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 12 | `@dataProvider` (legacy) | ✅ | ✅ | ✅ | AST 已覆蓋（同 #1-7），不需靠 Teamcity 補 |
| 13 | 多個 DataProvider | ✅ | ✅ | ✅ | AST 已覆蓋，Teamcity 亦可補漏 |

## Pest — AST 靜態解析

| # | Pattern | 實作 | 測試 | Teamcity 補 | 備註 |
|---|---------|:----:|:----:|:----------:|------|
| 14 | `->with([])` no keys | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 15 | `->with([])` named keys | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 16 | `->with([[]])` tuples | ✅ | ✅ | ✅ | AST 已覆蓋，不需靠 Teamcity 補 |
| 17 | `->with('name')` shared dataset | ❌ | ❌ | ✅ | AST 未實作，靠 Teamcity 執行後補 |
| 18 | `->with(fn())` closure | ✅ | ✅ | ✅ | AST 已覆蓋（yield literal 可解析），不需靠 Teamcity 補 |
| 19 | `->with(Generator)` | ✅ | ✅ | ✅ | AST 已覆蓋（同 #18），不需靠 Teamcity 補 |
| 20 | bound dataset `[fn()=>...]` | ✅ | ✅ | ✅ | AST 已覆蓋（數 array entry 產出 `#N`），不需靠 Teamcity 補 |
| 21 | `->with()->with()` combined | ✅ | ✅ | ✅ | AST 已覆蓋，Teamcity 亦可補漏 |

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
- [x] **重構 DataProviderParser 為 mini PHP interpreter** — 已完成：建立 Interpreter 層（`interpret.ts` + `evaluate.ts`），將 AST 遍歷與 TestParser 分離

---

**圖例**: ✅ 完成 | ⚠️ 部分完成 | ❌ 未實作 | N/A 設計上不解析（靠 Teamcity 補）
