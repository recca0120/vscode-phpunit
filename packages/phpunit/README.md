# @vscode-phpunit/phpunit

Core library for parsing and running [PHPUnit](https://phpunit.de/) and [Pest](https://pestphp.com/) tests.

Used by the [PHPUnit & Pest Test Explorer](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) VS Code extension.

## Features

- **Test parsing** — static analysis of PHPUnit/Pest test files via tree-sitter (WASM) and php-parser
- **Data provider resolution** — extract dataset names from `#[DataProvider]`, `#[TestWith]`, `->with()`, etc. ([details](docs/data-provider-guide.md)); datasets that cannot be resolved statically are discovered at runtime from `testStarted` events
- **PHPUnit XML** — parse `phpunit.xml` / `phpunit.xml.dist` for testsuites, coverage, and configuration
- **Process builder** — construct PHPUnit/Pest command lines with filter encoding, Xdebug support, and path mapping
- **Test output parsing** — parse Teamcity-formatted output into structured test results
- **Formatted output** — configurable Printer with format-string presets (`progress`, `collision`, `pretty`) and ANSI color support
- **Test collection** — manage test hierarchies (suite / file / class / method / dataset)
- **Coverage** — parse Clover XML coverage reports
- **Binary detection** — auto-detect `vendor/bin/phpunit` or `vendor/bin/pest` from `composer.json`

## Install

```bash
npm install @vscode-phpunit/phpunit
# or
pnpm add @vscode-phpunit/phpunit
```

## Architecture

```
                        ┌──────────────┐
                        │  PHP Source   │
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
        │ → TestDef[]   │         │ (file change │
        └──────┬───────┘         │  tracking +  │
               │                 │  inheritance)│
               │                 └──────────────┘
        ┌──────▼──────────────────┐
        │    TestDefinition[]    │
        │  (tree: namespace →    │
        │   class → method →     │
        │   dataset)             │
        └────────────┬───────────┘
                     │
          ┌──────────┼──────────┐
          │                     │
   ┌──────▼───────┐     ┌──────▼───────┐
   │ ProcessBuilder│     │ TestHierarchy│
   │ + FilterStrat.│     │ Builder<T>   │
   │ → command line│     │ → UI tree    │
   └──────┬───────┘     └──────────────┘
          │
   ┌──────▼───────┐
   │  TestRunner   │──── events ────┐
   │  (spawn proc) │                │
   └──────┬───────┘         ┌──────▼───────┐
          │ stdout          │  Observers   │
   ┌──────▼───────┐         └──────┬───────┘
   │ TestOutput   │                │
   │ Parser       │         ┌──────▼───────┐
   │ (Teamcity)   │         │   Printer    │
   └──────────────┘         │ (format +    │
                            │  ANSI color) │
                            └──────┬───────┘
                            ┌──────▼───────┐
                            │ OutputWriter │
                            │ (destination)│
                            └──────────────┘
```

## Usage

### 1. Parse & track test files

`TestCollection` is the main entry point. It parses PHP test files into `TestDefinition` trees, resolves class inheritance and traits internally, and maintains a persistent registry grouped by testsuite.

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

// 1. Initialize tree-sitter WASM (once)
await initTreeSitter();

// 2. Load configuration
const phpUnitXML = new PHPUnitXML();
await phpUnitXML.loadFile('/path/to/phpunit.xml');

// 3. Create parser with AST chain (tree-sitter → php-parser fallback)
const astParser = new ChainAstParser([
  new TreeSitterAstParser(),
  new PhpParserAstParser(),
]);
const testParser = new TestParser(phpUnitXML, astParser);

// 4. Create collection (handles inheritance resolution internally)
const testCollection = new TestCollection(phpUnitXML, testParser);

// 5. When a file changes:
const result = await testCollection.change(URI.file('/path/to/tests/ExampleTest.php'));
// result.parsed — [{uri, tests: TestDefinition[]}]  (new/updated)
// result.deleted — [File]                             (removed)

// Query existing tests
testCollection.has(uri);        // check if file is tracked
testCollection.get(uri);        // get tests for a file
testCollection.gatherFiles();   // iterate all tracked files
testCollection.reset();         // clear everything
```

**Output structure:**

```
TestDefinition[]
├─ { type: namespace, label: "App\\Tests", children: [...] }
│  ├─ { type: class, label: "ExampleTest", children: [...] }
│  │  ├─ { type: method, label: "test_add", annotations: { dataset: [...] } }
│  │  └─ { type: method, label: "test_subtract" }
```

### 2. Run tests & parse output

Build a command line from a `TestDefinition`, execute PHPUnit/Pest, and receive structured results via the observer pattern.

```typescript
import {
  ProcessBuilder,
  FilterStrategyFactory,
  TestRunner,
  TestRunnerEvent,
  TeamcityEvent,
} from '@vscode-phpunit/phpunit';

// 1. Build command
const builder = new ProcessBuilder(configuration, { cwd: projectRoot }, pathReplacer);
const filter = FilterStrategyFactory.create(testDefinition);
builder.setArguments(filter.getFilter());
// → php vendor/bin/phpunit --filter="^ExampleTest::test_add" --teamcity --colors=never

// 2. Create runner and listen to events
const runner = new TestRunner();

// Teamcity events — structured test results
runner.on(TeamcityEvent.testStarted, (result) => {
  console.log('Started:', result.name, result.id);
});
runner.on(TeamcityEvent.testFailed, (result) => {
  console.log('Failed:', result.name, result.message);
  // result.details — [{file, line}] stack trace
  // result.actual / result.expected — for comparison failures
});
runner.on(TeamcityEvent.testFinished, (result) => {
  console.log('Passed:', result.name, `${result.duration}ms`);
});
runner.on(TeamcityEvent.testResultSummary, (result) => {
  console.log(`Tests: ${result.tests}, Failures: ${result.failures}`);
});

// Runner lifecycle events
runner.on(TestRunnerEvent.run, (builder) => {
  console.log('Command:', builder.toString());
});
runner.on(TestRunnerEvent.close, (code) => {
  console.log('Exit code:', code);
});

// 3. Execute
const process = runner.run(builder);
await process.run();
```

**Event flow:**

```
spawn process
  │
  ├─ TestRunnerEvent.run          (command started)
  │
  ├─ TeamcityEvent.testVersion    (PHPUnit 11.5.0)
  ├─ TeamcityEvent.testRuntime    (PHP 8.3.0)
  ├─ TeamcityEvent.testCount      (total: 42)
  │
  ├─ TeamcityEvent.testSuiteStarted
  │  ├─ TeamcityEvent.testStarted
  │  ├─ TeamcityEvent.testFinished   (or testFailed / testIgnored)
  │  └─ ...
  ├─ TeamcityEvent.testSuiteFinished
  │
  ├─ TeamcityEvent.testDuration      (Time: 0.123s, Memory: 24MB)
  ├─ TeamcityEvent.testResultSummary (Tests: 42, Failures: 1)
  │
  └─ TestRunnerEvent.close           (exit code)
```

**Filter strategies by test type:**

| TestDefinition type | Generated filter |
|---|---|
| `workspace` | *(run all)* |
| `testsuite` | `--testsuite=Unit` |
| `namespace` | `--filter="^(App\\Tests\\Unit.*)"` |
| `class` | `tests/ExampleTest.php` |
| `method` | `--filter="^ExampleTest::test_add"` |
| `dataset` | `--filter="^...with data set \"one\""` |

### 3. Build UI trees (generic)

`TestHierarchyBuilder<T>` transforms flat `TestDefinition[]` into a nested tree for display. It handles namespace splitting, dataset expansion, and multi-suite grouping — all editor-agnostic.

```typescript
import {
  TestHierarchyBuilder,
  type ItemCollection,
  type TestRange,
  type TestTreeItem,
} from '@vscode-phpunit/phpunit';

// Implement the interfaces for your UI framework
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

// Extend the abstract builder
class MyBuilder extends TestHierarchyBuilder<MyItem> {
  protected createItem(id: string, label: string, uri?: string): MyItem {
    return new MyItem(id, label);
  }
  protected createTag(id: string) { return { id }; }
  protected createRange(def: TestDefinition) { /* ... */ }
}

// Build the tree
const builder = new MyBuilder(rootCollection, phpUnitXML);
const itemMap = builder.build(tests);
// itemMap: Map<MyItem, TestDefinition>
```

**Tree transformation:**

```
Input (flat):                        Output (nested):
─────────────────                    ─────────────────
namespace: App\Tests\Unit            App
  class: ExampleTest                   └─ Tests
    method: test_add                       └─ Unit
      dataset: ["one","two"]                   └─ ExampleTest
                                                   └─ test_add
                                                       ├─ with data set "one"
                                                       └─ with data set "two"
```

### 4. Resolve test items by ID at runtime (`AliasMap`)

When test results arrive via Teamcity events, you need to look up the corresponding UI item by its ID. `AliasMap<T>` is a drop-in replacement for `Map<string, T>` that handles a Pest v3 bug automatically.

**The problem**: Pest v3's `Str::beforeLast()` mixes `mb_strrpos` (char offset) with `substr` (byte offset). The `→` character (U+2192) is 3 UTF-8 bytes but 1 char, so `testSuiteStarted` / `testSuiteFinished` event IDs are truncated by 2 bytes per `→` — making a direct `Map.get()` miss the item.

**The solution**: Use `AliasMap` instead of a plain `Map`. Every `set()` call automatically registers the truncated alias alongside the real ID, so `get()` finds the item regardless of which variant the event carries.

```typescript
import { AliasMap } from '@vscode-phpunit/phpunit';

// Build from your test items — truncated aliases registered automatically
const testItemById = new AliasMap<MyItem>(
    items.map((item) => [item.id, item]),
);

// Lookup works for both the full and the Pest v3 truncated ID
const fullId      = 'tests/Unit/Foo.php::`something` → it passes';
const truncatedId = 'tests/Unit/Foo.php::`something` → it pass';  // truncated by Pest v3

testItemById.get(fullId);      // → MyItem  ✓
testItemById.get(truncatedId); // → MyItem  ✓  (alias registered automatically)
```

`AliasMap` is framework-agnostic — it works with VS Code `TestItem`, plain objects, or any other type.

### 5. Format test output (Printer)

`Printer` transforms structured test events into human-readable output with configurable templates and ANSI colors. Output is written through the `OutputWriter` interface, keeping the printer decoupled from any specific output target.

```typescript
import {
  Printer,
  PHPUnitXML,
  PRESET_PROGRESS,
  PRESET_COLLISION,
  PRESET_PRETTY,
  resolveFormat,
  type OutputWriter,
} from '@vscode-phpunit/phpunit';

// 1. Choose a preset
const phpUnitXML = new PHPUnitXML();
const printer = new Printer(phpUnitXML, PRESET_COLLISION);

// 2. Implement OutputWriter for your output target
class ConsoleWriter implements OutputWriter {
  append(text: string) { process.stdout.write(text); }
  appendLine(text: string) { process.stdout.write(text + '\n'); }
}
const writer = new ConsoleWriter();

// 3. Wire into TestRunner observer events
printer.start(command);               // → "php vendor/bin/phpunit ..."
printer.testVersion(result);          // → "🚀 PHPUnit 11.5.0"
printer.testSuiteStarted(result);     // → "PASS  App\Tests\ExampleTest"
printer.testFinished(result);         // → "  ✓ test_add  3 ms" (or "  ⨯ test_sub  5 ms" for failures)
printer.testResultSummary(result);    // → "Tests:  1 failed, 3 passed (12 assertions)"
printer.timeAndMemory(result);        // → "Duration: 0.05s"
printer.close();                      // flush deferred error details
```

**Built-in presets:**

| Preset | Style | Example output |
|---|---|---|
| `PRESET_PROGRESS` | PHPUnit default dot mode | `...F..S.` |
| `PRESET_COLLISION` | [Collision](https://github.com/nunomaduro/collision) style | `✓ test_name  3 ms` |
| `PRESET_PRETTY` | Collision without icons | `test_name  3 ms` |

**Customize with `resolveFormat`:**

```typescript
const format = resolveFormat('collision', {
  colors: false,                    // disable ANSI colors
  icons: { passed: ['✔', 'OK'] },  // override specific icons
  duration: false,                  // hide duration line
});
const printer = new Printer(phpUnitXML, format);
```

**Format template variables:**

Templates use `{variable}` placeholders. For example, `finished: '  {icon} {name} {duration} ms'` produces `  ✓ test_add 3 ms`. Available variables depend on the event type — see `PrinterFormat` for the full list.

## Build

```bash
pnpm build     # tsup → dist/ (ESM + CJS + .d.ts)
```

Build copies `tree-sitter.wasm` and `tree-sitter-php.wasm` into `dist/` so that tree-sitter can locate them at runtime.

## Test

```bash
pnpm test      # vitest
```

## Docs

- [Data Provider Complete Guide](docs/data-provider-guide.md)

## License

[MIT](LICENSE.md)
