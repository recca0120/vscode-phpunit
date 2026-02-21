# vscode-phpunit

**PHPUnit & Pest Test Explorer** VS Code 擴充套件的 Monorepo。

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Installs](https://img.shields.io/vscode-marketplace/i/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![License](https://img.shields.io/github/license/recca0120/vscode-phpunit.svg?style=flat-square)](LICENSE.md)

## 套件

| 套件 | 說明 |
|---|---|
| [`packages/phpunit`](packages/phpunit) | `@vscode-phpunit/phpunit` — PHPUnit/Pest 解析器、執行工具與 tree-sitter 工具。使用 **tsup** 建置（ESM + CJS）。 |
| [`packages/extension`](packages/extension) | VS Code 擴充套件 — PHPUnit & Pest 的 Test Explorer 整合。使用 **esbuild** 打包。依賴 `@vscode-phpunit/phpunit`。 |

### packages/phpunit

核心函式庫，負責解析 PHPUnit/Pest 測試檔案（透過 tree-sitter WASM）、建構命令列、處理測試輸出。以 `@vscode-phpunit/phpunit` 發佈。

- **建置**：`tsup` 輸出 ESM/CJS 到 `dist/`，並複製 `tree-sitter.wasm` / `tree-sitter-php.wasm` 到 `dist/`。
- **測試**：Vitest

### packages/extension

VS Code 擴充套件，整合原生 Test Explorer UI。以 dev dependency 方式引用 `@vscode-phpunit/phpunit`；esbuild 將所有程式碼打包為單一 `dist/extension.js`。

- **建置**：`esbuild` 打包至 `dist/extension.js`，並從 `node_modules/@vscode/tree-sitter-wasm/wasm/` 複製 WASM 檔到 `dist/`。
- **測試**：Vitest（單元測試）+ `@vscode/test-electron`（e2e）
- **打包**：`@vscode/vsce` 產出 `.vsix`

## 開發

### 前置需求

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/)

### 安裝

```bash
pnpm install
```

### 常用指令

```bash
# 編譯所有套件（phpunit tsup + extension esbuild）
pnpm compile

# 執行所有單元測試
pnpm test

# 執行 e2e 測試（僅 extension）
pnpm test:e2e

# Lint
pnpm lint

# 型別檢查
pnpm typecheck

# Extension 正式建置（壓縮）
pnpm package

# 產出 .vsix 檔案
cd packages/extension && pnpm exec vsce package --no-dependencies
```

### 偵錯擴充套件

專案在 `.vscode/launch.json` 中提供啟動設定：

| 設定 | 說明 |
|---|---|
| **Run Extension** | 以本地 `phpunit-stub` 專案開啟 |
| **Run Extension (Multi-Workspace)** | 開啟多資料夾工作區（本地） |
| **Run Extension (Docker Multi-Workspace)** | 開啟在 Docker 中執行的多資料夾工作區 |

#### Docker Multi-Workspace 設定

1. 啟動共用容器：

    ```bash
    cd packages/phpunit/tests/fixtures/workspaces
    docker compose up -d --build
    ```

2. 在偵錯面板選擇 **Run Extension (Docker Multi-Workspace)** 並按 `F5`。

3. 停止容器：

    ```bash
    docker compose down
    ```

## 貢獻

- [回報問題](https://github.com/recca0120/vscode-phpunit/issues/new?template=bug_report.yml)
- [功能建議](https://github.com/recca0120/vscode-phpunit/issues/new?template=feature_request.yml)
- [貢獻指南](CONTRIBUTING.md)

## 授權

[MIT](LICENSE.md)
