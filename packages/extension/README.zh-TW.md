# PHPUnit & Pest Test Explorer for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Installs](https://img.shields.io/vscode-marketplace/i/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![License](https://img.shields.io/github/license/recca0120/vscode-phpunit.svg?style=flat-square)](LICENSE.md)

[English](https://github.com/recca0120/vscode-phpunit/blob/main/packages/extension/README.md)

在 VS Code 中使用原生 Test Explorer UI 直接執行 [PHPUnit](https://phpunit.de/) 和 [Pest](https://pestphp.com/) 測試。

![PHPUnit](https://raw.githubusercontent.com/recca0120/vscode-phpunit/main/packages/extension/img/phpunit.gif)

## 快速開始

1. 從 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit) 安裝擴充套件
2. 開啟包含 `phpunit.xml` 或 `phpunit.xml.dist` 的 PHP 專案
3. 測試會自動出現在 Test Explorer 側邊欄 — 點擊即可執行

> PHPUnit 和 Pest 會從 `vendor/bin` 自動偵測，大多數專案不需要任何設定。

## 功能

- **Test Explorer 整合** — 從側邊欄探索、執行和除錯測試
- **PHPUnit 7 – 12 & Pest 1 – 4** — 廣泛的版本支援
- **自動偵測執行檔** — 讀取 `composer.json`，Pest 專案自動使用 `vendor/bin/pest`
- **自動重新載入** — `phpunit.xml` 或 `composer.lock` 變更時自動重新載入所有測試
- **彩色輸出** — 語法高亮的結果，內嵌 PHP 原始碼片段
- **可點擊的堆疊追蹤** — 從錯誤輸出直接跳到對應的檔案和行號
- **遠端環境** — 透過自訂命令支援 Docker、SSH、Laravel Sail、DDEV
- **多工作區 Docker** — 多個工作區資料夾共用單一容器
- **平行執行** — 支援 ParaTest
- **Xdebug 除錯** — 一鍵啟動逐步除錯
- **持續執行** — 檔案變更時自動執行測試

![Pest](https://raw.githubusercontent.com/recca0120/vscode-phpunit/main/packages/extension/img/pest.png)

## 設定

加入 `.vscode/settings.json`。所有設定使用 `phpunit.*` 前綴。

```jsonc
{
  // PHP 執行檔路徑（預設："php"）
  "phpunit.php": "php",

  // PHPUnit 或 Pest 執行檔路徑
  // 從 composer.json 自動偵測：如果 pestphp/pest 是依賴則使用 "vendor/bin/pest"，
  // 否則預設為 "vendor/bin/phpunit"。僅在自動偵測不足時才需設定。
  "phpunit.phpunit": "vendor/bin/phpunit",

  // 自訂命令範本
  // 變數：${php}, ${phpargs}, ${phpunit}, ${phpunitargs}, ${phpunitxml}, ${cwd}
  //   ${workspaceFolder}         — 工作區資料夾的絕對路徑
  //   ${workspaceFolderBasename} — 僅資料夾名稱（例如 "myproject"）
  //   ${userHome}                — 使用者家目錄
  //   ${pathSeparator}           — 作業系統路徑分隔符號（"/" 或 "\"）
  "phpunit.command": "\"${php}\" ${phpargs} \"${phpunit}\" ${phpunitargs}",

  // 傳遞給 PHPUnit 的額外參數
  "phpunit.args": [],

  // 遠端環境的路徑對應 { "本地路徑": "遠端路徑" }
  "phpunit.paths": {},

  // 執行前設定的環境變數
  "phpunit.environment": {},

  // 執行測試前儲存所有開啟的檔案（預設：false）
  "phpunit.saveBeforeTest": false,

  // 輸出格式預設："collision"（逐條詳細顯示）、"progress"（點進度模式）或 "pretty"（逐條無圖示）
  "phpunit.output.preset": "collision",

  // 覆寫預設的個別格式欄位（詳見 phpunit 套件文件）
  "phpunit.output.format": {},

  // 每次執行前清除除錯輸出頻道（預設：true）
  "phpunit.clearDebugOutputOnRun": true,

  // 何時顯示輸出："always" | "onFailure" | "never"（預設："onFailure"）
  "phpunit.showAfterExecution": "onFailure",

  // 除錯用的 launch.json 設定名稱
  "phpunit.debuggerConfig": "",

  // Xdebug 連接埠，0 = 隨機（預設：0）
  "phpunit.xdebugPort": 0
}
```

## 設定範例

### 本機

大多數本機專案不需要任何設定。若要使用不同的測試執行器：

```jsonc
// Pest
{ "phpunit.phpunit": "vendor/bin/pest" }

// Laravel Artisan
{ "phpunit.phpunit": "artisan test" }

// ParaTest（平行執行）
{ "phpunit.phpunit": "vendor/bin/paratest" }
```

### Docker

在 Docker 容器內執行測試時，需要設定兩項：

1. **`phpunit.command`** — 告訴擴充套件如何在容器內執行命令
2. **`phpunit.paths`** — 將本機檔案路徑對應到容器路徑，讓擴充套件能定位測試檔案和解析錯誤輸出

> **重要：** `${workspaceFolder}` 在 macOS 或 WSL 上可能無法正確解析。如果遇到路徑問題，請替換為實際的絕對路徑（例如 `/home/user/myproject`）。

**`docker exec`（既有容器）：**

```jsonc
{
  "phpunit.command": "docker exec -t my_container /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

**`docker run`（暫時容器）：**

```jsonc
{
  "phpunit.command": "docker run --rm -t -v ${PWD}:/app -w /app php:latest ${php} ${phpargs} ${phpunit} ${phpunitargs}",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

**Docker Compose：**

```jsonc
{
  "phpunit.command": "docker compose exec -t app /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

如果 `docker-compose.yml` 不在工作區根目錄，使用 `-f` 旗標：

```jsonc
{
  "phpunit.command": "docker compose -f /path/to/docker-compose.yml exec -t app /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\""
}
```

### Docker 多工作區

在[多根工作區](https://code.visualstudio.com/docs/editor/multi-root-workspaces)中使用單一共用 Docker 容器時，使用 `${workspaceFolderBasename}` 為每個資料夾切換目錄：

```jsonc
// .code-workspace 設定
{
  "folders": [
    { "path": "./project-a" },
    { "path": "./project-b" }
  ],
  "settings": {
    "phpunit.command": "docker exec -t vscode-phpunit /bin/sh -c \"cd /${workspaceFolderBasename} && ${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
    "phpunit.paths": {
      "${workspaceFolder}": "/${workspaceFolderBasename}"
    }
  }
}
```

每個專案資料夾在容器中以其基本名稱分別掛載：

```yaml
# docker-compose.yml
services:
  vscode-phpunit:
    # ...
    volumes:
      - ./project-a:/project-a
      - ./project-b:/project-b
```

命令 `cd /${workspaceFolderBasename}` 會在執行測試前切換到正確的目錄。每個資料夾應有自己的 `phpunit.xml` — 擴充套件會自動偵測。**請勿**在工作區層級設定 `--configuration` 搭配容器內的絕對路徑（例如 `--configuration=/project-a/phpunit.xml`），這會導致每個資料夾載入相同的設定並出現重複的測試。

### Laravel Sail

```jsonc
{
  "phpunit.command": "docker compose exec -u sail laravel.test ${php} ${phpargs} ${phpunit} ${phpunitargs}",
  "phpunit.phpunit": "artisan test",
  "phpunit.paths": {
    "${workspaceFolder}": "/var/www/html"
  }
}
```

### SSH

```jsonc
{
  "phpunit.command": "ssh user@host \"cd /app; ${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

### DDEV

```jsonc
{
  "phpunit.command": "ddev exec ${php} ${phpargs} ${phpunit} ${phpunitargs}"
}
```

### WSL + Docker

從 WSL 工作區使用 Docker 時，使用完整的 WSL 路徑作為本機金鑰：

```jsonc
{
  "phpunit.command": "docker exec -t my_container /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "//wsl.localhost/Ubuntu/var/www/myproject": "/var/www/myproject"
  }
}
```

## 使用 Xdebug 除錯

1. 在 `.vscode/launch.json` 加入啟動設定：

    ```jsonc
    {
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/app": "${workspaceFolder}"
      }
    }
    ```

2. 在設定中指定設定名稱：

    ```jsonc
    {
      "phpunit.debuggerConfig": "Listen for Xdebug"
    }
    ```

3. 在 Test Explorer 中點擊 **Debug Test** 按鈕。

**在 Docker 中使用 `xdebug.start_with_request=trigger`：**

```jsonc
{
  "phpunit.command": "docker compose exec -e XDEBUG_TRIGGER=VSCODE app bash -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

**中斷點沒有觸發？** 請檢查：
- Xdebug 已設定 `xdebug.mode=debug` 和 `xdebug.start_with_request=yes`（或 `trigger`）
- `phpunit.debuggerConfig` 與 `launch.json` 中的**名稱完全一致**
- `launch.json` 中的 `pathMappings` 正確對應容器路徑到本機路徑
- Xdebug 連接埠未被防火牆阻擋

## 命令

| 命令 | 說明 | 快捷鍵 |
|---|---|---|
| `phpunit.reload` | 重新載入測試 | — |
| `phpunit.run-all` | 執行所有測試 | `Cmd+T Cmd+S` |
| `phpunit.run-file` | 執行目前檔案的測試 | `Cmd+T Cmd+F` |
| `phpunit.run-test-at-cursor` | 執行游標所在的測試 | `Cmd+T Cmd+T` |
| `phpunit.run-by-group` | 依群組執行測試 | — |
| `phpunit.rerun` | 重新執行上次的測試 | `Cmd+T Cmd+L` |

## 疑難排解

<details>
<summary><code>${workspaceFolder}</code> 解析為 <code>/</code></summary>

在某些系統（macOS、WSL）上，`${workspaceFolder}` 可能無法正確解析。在 `phpunit.paths` 中使用實際的絕對路徑替代：

```jsonc
{
  "phpunit.paths": {
    "/home/user/myproject": "/app"
  }
}
```
</details>

<details>
<summary><code>spawn ${php} ENOENT</code></summary>

通常是其他擴充套件（例如 [DEVSENSE PHP Tools](https://marketplace.visualstudio.com/items?itemName=DEVSENSE.phptools-vscode)）將 `${php}` 作為字面變數注入。修正方式：

```jsonc
{
  "phpunit.command": ""
}
```

如果問題仍存在，先停用衝突的 PHP 擴充套件，再重新啟用 **PHPUnit Test Explorer**。
</details>

<details>
<summary>包含空格的路徑導致錯誤</summary>

確保 `phpunit.command` 範本中的變數有加引號（這是預設值）：

```jsonc
{
  "phpunit.command": "\"${php}\" ${phpargs} \"${phpunit}\" ${phpunitargs}"
}
```
</details>

<details>
<summary>多根工作區中出現重複的測試</summary>

如果相同的測試出現在多個工作區資料夾下，請檢查 `phpunit.args` 設定。在工作區層級使用指向容器絕對路徑的 `--configuration` 旗標（例如 `--configuration=/var/www/project-a/phpunit.xml`）會導致每個資料夾載入相同的 `phpunit.xml`。

**修正：** 從 `phpunit.args` 移除 `--configuration`，讓每個資料夾自動偵測自己的 `phpunit.xml`。參見 [Docker 多工作區](#docker-多工作區) 章節了解正確設定。
</details>

## 貢獻

發現 bug？有想法？歡迎貢獻！

- [回報 bug](https://github.com/recca0120/vscode-phpunit/issues/new?template=bug_report.yml)
- [功能請求](https://github.com/recca0120/vscode-phpunit/issues/new?template=feature_request.yml)
- [開發指南](https://github.com/recca0120/vscode-phpunit)

## 授權

[MIT](LICENSE.md)
