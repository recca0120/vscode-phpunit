# @vscode-phpunit/phpunit

Core library for parsing and running [PHPUnit](https://phpunit.de/) and [Pest](https://pestphp.com/) tests.

Used by the [PHPUnit & Pest Test Explorer](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) VS Code extension.

## Features

- **Test parsing** — static analysis of PHPUnit/Pest test files via tree-sitter (WASM) and php-parser
- **Data provider resolution** — extract dataset names from `#[DataProvider]`, `#[TestWith]`, `->with()`, etc. ([details](docs/data-provider-patterns.md))
- **PHPUnit XML** — parse `phpunit.xml` / `phpunit.xml.dist` for testsuites, coverage, and configuration
- **Process builder** — construct PHPUnit/Pest command lines with filter encoding, Xdebug support, and path mapping
- **Test output parsing** — parse Teamcity-formatted output into structured test results
- **Test collection** — manage test hierarchies (suite / file / class / method / dataset)
- **Coverage** — parse Clover XML coverage reports
- **Binary detection** — auto-detect `vendor/bin/phpunit` or `vendor/bin/pest` from `composer.json`

## Install

```bash
npm install @vscode-phpunit/phpunit
# or
pnpm add @vscode-phpunit/phpunit
```

## Usage

```typescript
import { initTreeSitter, TestParser, PHPUnitXML } from '@vscode-phpunit/phpunit';

// Initialize tree-sitter WASM (required once before parsing)
await initTreeSitter();

// Parse a test file
const parser = new TestParser();
const definitions = parser.parse(sourceCode, filePath);

// Parse phpunit.xml
const xml = await PHPUnitXML.load(workspacePath);
const testsuites = xml.getTestSuites();
```

## Build

```bash
pnpm build     # tsup → dist/ (ESM + CJS + .d.ts)
```

Build copies `tree-sitter.wasm` and `tree-sitter-php.wasm` into `dist/` so that `resolveWasmDir()` can locate them at runtime.

## Test

```bash
pnpm test      # vitest
```

## Docs

- [Data Provider patterns and Teamcity output mapping](docs/data-provider-patterns.md)
- [Data Provider support status](docs/data-provider-support-status.md)

## License

[MIT](LICENSE.md)
