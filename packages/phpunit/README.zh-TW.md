# @vscode-phpunit/phpunit

解析與執行 [PHPUnit](https://phpunit.de/) 和 [Pest](https://pestphp.com/) 測試的核心函式庫。

供 [PHPUnit & Pest Test Explorer](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) VS Code 擴充套件使用。

## 功能

- **測試解析** — 透過 tree-sitter（WASM）和 php-parser 靜態分析 PHPUnit/Pest 測試檔案
- **Data Provider 解析** — 從 `#[DataProvider]`、`#[TestWith]`、`->with()` 等語法萃取 dataset 名稱（[詳情](docs/data-provider-patterns.md)）
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

## 使用方式

```typescript
import { initTreeSitter, TestParser, PHPUnitXML } from '@vscode-phpunit/phpunit';

// 初始化 tree-sitter WASM（解析前需執行一次）
await initTreeSitter();

// 解析測試檔案
const parser = new TestParser();
const definitions = parser.parse(sourceCode, filePath);

// 解析 phpunit.xml
const xml = await PHPUnitXML.load(workspacePath);
const testsuites = xml.getTestSuites();
```

## 建置

```bash
pnpm build     # tsup → dist/（ESM + CJS + .d.ts）
```

建置時會複製 `tree-sitter.wasm` 和 `tree-sitter-php.wasm` 到 `dist/`，讓 `resolveWasmDir()` 在執行時能找到它們。

## 測試

```bash
pnpm test      # vitest
```

## 文件

- [Data Provider 語法與 Teamcity 輸出對照](docs/data-provider-patterns.md)
- [Data Provider 支援狀態追蹤](docs/data-provider-support-status.md)

## 授權

[MIT](LICENSE.md)
