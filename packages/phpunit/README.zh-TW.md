# @vscode-phpunit/phpunit

解析與執行 [PHPUnit](https://phpunit.de/) 和 [Pest](https://pestphp.com/) 測試的核心函式庫。

供 [PHPUnit & Pest Test Explorer](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) VS Code 擴充套件使用。

## 功能

- **測試解析** — 透過 tree-sitter（WASM）和 php-parser 靜態分析 PHPUnit/Pest 測試檔案
- **Data Provider 解析** — 從 `#[DataProvider]`、`#[TestWith]`、`->with()` 等語法萃取 dataset 名稱（[詳情](docs/data-provider-guide.zh-TW.md)）
- **PHPUnit XML** — 解析 `phpunit.xml` / `phpunit.xml.dist` 的 testsuite、coverage 與設定
- **指令建構** — 建構 PHPUnit/Pest 命令列，支援 filter encoding、Xdebug、路徑映射
- **測試輸出解析** — 將 Teamcity 格式輸出解析為結構化測試結果
- **測試集合** — 管理測試階層（suite / file / class / method / dataset）
- **Coverage** — 解析 Clover XML 覆蓋率報告
- **執行檔偵測** — 從 `composer.json` 自動偵測 `vendor/bin/phpunit` 或 `vendor/bin/pest`

## 安裝

```bash
npm install @vscode-phpunit/phpunit
# 或
pnpm add @vscode-phpunit/phpunit
```

## 架構

```
                        ┌──────────────┐
                        │  PHP 原始碼   │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │  AstParser   │
                        │ (TreeSitter  │
                        │  / PhpParser)│
                        └──────┬───────┘
                               │ AstNode
                        ┌──────▼───────┐
                        │  Interpreter │
                        │  (Visitors + │
                        │   Resolvers) │
                        └──────┬───────┘
                               │ FileInfo
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────▼───────┐         ┌──────▼───────┐
        │ TestExtractor │         │ TestCollection│
        │ → TestDef[]   │         │ (檔案變更追蹤 │
        └──────┬───────┘         │  + 繼承解析)  │
               │                 └──────────────┘
        ┌──────▼──────────────────┐
        │    TestDefinition[]    │
        │  (樹狀結構: namespace → │
        │   class → method →     │
        │   dataset)             │
        └────────────┬───────────┘
                     │
          ┌──────────┼──────────┐
          │                     │
   ┌──────▼───────┐     ┌──────▼───────┐
   │ ProcessBuilder│     │ TestHierarchy│
   │ + FilterStrat.│     │ Builder<T>   │
   │ → 命令列      │     │ → UI 樹      │
   └──────┬───────┘     └──────────────┘
          │
   ┌──────▼───────┐
   │  TestRunner   │──── 事件 ─────┐
   │  (子程序執行)  │                │
   └──────┬───────┘         ┌──────▼───────┐
          │ stdout          │  Observers   │
   ┌──────▼───────┐         │ (UI 更新)    │
   │ TestOutput   │         └──────────────┘
   │ Parser       │
   │ (Teamcity)   │
   └──────────────┘
```

## 使用方式

### 1. 解析與追蹤測試檔案

`TestCollection` 是主要進入點。它將 PHP 測試檔案解析為 `TestDefinition` 樹、內部處理類別繼承與 trait 解析，並維護依 testsuite 分組的持久化註冊表。

```typescript
import {
  initTreeSitter,
  ChainAstParser,
  TreeSitterAstParser,
  PhpParserAstParser,
  PHPUnitXML,
  TestParser,
  TestCollection,
} from '@vscode-phpunit/phpunit';
import { URI } from 'vscode-uri';

// 1. 初始化 tree-sitter WASM（只需一次）
await initTreeSitter();

// 2. 載入設定
const phpUnitXML = new PHPUnitXML();
phpUnitXML.loadFile('/path/to/phpunit.xml');

// 3. 建立解析器，使用 AST 鏈（tree-sitter → php-parser 備援）
const astParser = new ChainAstParser([
  new TreeSitterAstParser(),
  new PhpParserAstParser(),
]);
const testParser = new TestParser(phpUnitXML, astParser);

// 4. 建立集合（內部處理繼承解析）
const testCollection = new TestCollection(phpUnitXML, testParser);

// 5. 檔案變更時：
const result = await testCollection.change(URI.file('/path/to/tests/ExampleTest.php'));
// result.parsed — [{uri, tests: TestDefinition[]}]  (新增/更新)
// result.deleted — [File]                             (已移除)

// 查詢既有測試
testCollection.has(uri);        // 檢查檔案是否被追蹤
testCollection.get(uri);        // 取得檔案的測試
testCollection.gatherFiles();   // 遍歷所有追蹤的檔案
testCollection.reset();         // 清除全部
```

**輸出結構：**

```
TestDefinition[]
├─ { type: namespace, label: "App\\Tests", children: [...] }
│  ├─ { type: class, label: "ExampleTest", children: [...] }
│  │  ├─ { type: method, label: "test_add", annotations: { dataset: [...] } }
│  │  └─ { type: method, label: "test_subtract" }
```

### 2. 執行測試與解析輸出

從 `TestDefinition` 建構命令列，執行 PHPUnit/Pest，透過 observer 模式接收結構化結果。

```typescript
import {
  ProcessBuilder,
  FilterStrategyFactory,
  TestRunner,
  TestRunnerEvent,
  TeamcityEvent,
} from '@vscode-phpunit/phpunit';

// 1. 建構命令
const builder = new ProcessBuilder(configuration, { cwd: projectRoot }, pathReplacer);
const filter = FilterStrategyFactory.create(testDefinition);
builder.setArguments(filter.getFilter());
// → php vendor/bin/phpunit --filter="^ExampleTest::test_add" --teamcity --colors=never

// 2. 建立 runner 並監聽事件
const runner = new TestRunner();

// Teamcity 事件 — 結構化測試結果
runner.on(TeamcityEvent.testStarted, (result) => {
  console.log('開始:', result.name, result.id);
});
runner.on(TeamcityEvent.testFailed, (result) => {
  console.log('失敗:', result.name, result.message);
  // result.details — [{file, line}] 堆疊追蹤
  // result.actual / result.expected — 比較失敗時
});
runner.on(TeamcityEvent.testFinished, (result) => {
  console.log('通過:', result.name, `${result.duration}ms`);
});
runner.on(TeamcityEvent.testResultSummary, (result) => {
  console.log(`測試: ${result.tests}, 失敗: ${result.failures}`);
});

// Runner 生命週期事件
runner.on(TestRunnerEvent.run, (builder) => {
  console.log('命令:', builder.getRuntime(), builder.getArguments());
});
runner.on(TestRunnerEvent.close, (code) => {
  console.log('結束代碼:', code);
});

// 3. 執行
const process = runner.run(builder);
await process.run();
```

**事件流程：**

```
啟動子程序
  │
  ├─ TestRunnerEvent.run          (命令已啟動)
  │
  ├─ TeamcityEvent.testVersion    (PHPUnit 11.5.0)
  ├─ TeamcityEvent.testRuntime    (PHP 8.3.0)
  ├─ TeamcityEvent.testCount      (總計: 42)
  │
  ├─ TeamcityEvent.testSuiteStarted
  │  ├─ TeamcityEvent.testStarted
  │  ├─ TeamcityEvent.testFinished   (或 testFailed / testIgnored)
  │  └─ ...
  ├─ TeamcityEvent.testSuiteFinished
  │
  ├─ TeamcityEvent.testDuration      (時間: 0.123s, 記憶體: 24MB)
  ├─ TeamcityEvent.testResultSummary (測試: 42, 失敗: 1)
  │
  └─ TestRunnerEvent.close           (結束代碼)
```

**各測試類型的 filter 策略：**

| TestDefinition type | 產生的 filter |
|---|---|
| `workspace` | *（執行全部）* |
| `testsuite` | `--testsuite=Unit` |
| `namespace` | `--filter="^(App\\Tests\\Unit.*)"` |
| `class` | `tests/ExampleTest.php` |
| `method` | `--filter="^ExampleTest::test_add"` |
| `dataset` | `--filter="^...with data set \"one\""` |

### 3. 建構 UI 樹（泛型）

`TestHierarchyBuilder<T>` 將扁平的 `TestDefinition[]` 轉換為巢狀樹以供顯示。處理 namespace 拆分、dataset 展開、多 suite 分組 — 全部與編輯器無關。

```typescript
import {
  TestHierarchyBuilder,
  type ItemCollection,
  type TestRange,
  type TestTreeItem,
} from '@vscode-phpunit/phpunit';

// 為你的 UI 框架實作介面
class MyItem implements TestTreeItem<MyItem> {
  id: string;
  children: ItemCollection<MyItem>;
  canResolveChildren = false;
  sortText?: string;
  range?: TestRange;
  tags: Array<{ id: string }> = [];
  constructor(id: string, public label: string) {
    this.id = id;
    this.children = new MyCollection();
  }
}

// 繼承抽象 builder
class MyBuilder extends TestHierarchyBuilder<MyItem> {
  protected createItem(id: string, label: string, uri?: string): MyItem {
    return new MyItem(id, label);
  }
  protected createTag(id: string) { return { id }; }
  protected createRange(def: TestDefinition) { /* ... */ }
}

// 建構樹
const builder = new MyBuilder(rootCollection, phpUnitXML);
const itemMap = builder.build(tests);
// itemMap: Map<MyItem, TestDefinition>
```

**樹轉換：**

```
輸入（扁平）：                       輸出（巢狀）：
─────────────────                    ─────────────────
namespace: App\Tests\Unit            App
  class: ExampleTest                   └─ Tests
    method: test_add                       └─ Unit
      dataset: ["one","two"]                   └─ ExampleTest
                                                   └─ test_add
                                                       ├─ with data set "one"
                                                       └─ with data set "two"
```

## 建置

```bash
pnpm build     # tsup → dist/（ESM + CJS + .d.ts）
```

建置時會複製 `tree-sitter.wasm` 和 `tree-sitter-php.wasm` 到 `dist/`，讓 tree-sitter 在執行時能找到它們。

## 測試

```bash
pnpm test      # vitest
```

## 文件

- [Data Provider 完整指南](docs/data-provider-guide.zh-TW.md)

## 授權

[MIT](LICENSE.md)
