# PHPUnit & Pest Test Explorer for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Downloads](https://img.shields.io/vscode-marketplace/d/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)

[English](README.md)

在 VS Code 中使用原生 Test Explorer 執行 PHPUnit 和 Pest 測試。支援 Docker、SSH 等遠端環境，並可搭配 Xdebug 進行逐步偵錯。

![PHPUnit](img/phpunit.gif)

![Pest](img/pest.png)

## 功能特色

- 在側邊欄 Test Explorer 中自動偵測並顯示所有 PHPUnit / Pest 測試
- 執行或偵錯單一測試、檔案、測試套件或整個專案
- 彩色輸出面板，包含語法高亮的測試結果與嵌入式 PHP 原始碼片段
- 錯誤堆疊追蹤中的檔案路徑可直接點擊跳轉
- 支援 PHPUnit 7 – 12 及 Pest 2 – 3
- 支援 ParaTest 平行執行
- 透過自訂命令支援 Docker、SSH 等遠端環境
- 整合 Xdebug 進行逐步偵錯
- 檔案變更時自動持續執行測試

## 指令

| 指令 | 說明 | 預設快捷鍵 |
|---|---|---|
| `phpunit.reload` | 重新載入測試 | — |
| `phpunit.run-all` | 執行所有測試 | `Cmd+T Cmd+S` |
| `phpunit.run-file` | 執行目前檔案的測試 | `Cmd+T Cmd+F` |
| `phpunit.run-test-at-cursor` | 執行游標位置的測試 | `Cmd+T Cmd+T` |
| `phpunit.run-by-group` | 依群組執行測試 | — |
| `phpunit.rerun` | 重複上次測試 | `Cmd+T Cmd+L` |

## 設定

所有設定皆在 `phpunit.*` 命名空間下，可加入 `.vscode/settings.json`。

| 設定 | 類型 | 預設值 | 說明 |
|---|---|---|---|
| `phpunit.php` | `string` | `"php"` | PHP 執行檔路徑。未設定時使用系統 PATH 中的 `php`。 |
| `phpunit.phpunit` | `string` | `"vendor/bin/phpunit"` | PHPUnit 或 Pest 執行檔路徑。自動從 `vendor/bin`、專案根目錄或系統 PATH 偵測。 |
| `phpunit.command` | `string` | `"${php}" ${phpargs} "${phpunit}" ${phpunitargs}` | 自訂命令範本。可用變數：`${php}`、`${phpargs}`、`${phpunit}`、`${phpunitargs}`、`${phpunitxml}`、`${cwd}`。 |
| `phpunit.args` | `string[]` | `[]` | 傳遞給 PHPUnit 的額外參數（如 `["-c", "phpunit.xml.dist"]`）。 |
| `phpunit.paths` | `object` | — | 遠端環境的路徑對應（如 `{ "${workspaceFolder}": "/app" }`）。 |
| `phpunit.environment` | `object` | — | 執行前設定的環境變數（如 `{ "XDEBUG_MODE": "coverage" }`）。 |
| `phpunit.clearOutputOnRun` | `boolean` | `true` | 每次執行前清除輸出面板。 |
| `phpunit.showAfterExecution` | `string` | `"onFailure"` | 何時顯示輸出面板：`"always"`、`"onFailure"` 或 `"never"`。 |
| `phpunit.debuggerConfig` | `string` | — | 偵錯測試時使用的 `launch.json` 設定名稱。 |
| `phpunit.xdebugPort` | `integer` | `0` | Xdebug 通訊埠。`0` 表示使用隨機埠。 |

## 設定範例

### 基本使用

PHPUnit 和 Pest 會自動偵測，大部分情況不需要任何設定。

若要明確指定 Pest：

```jsonc
{
  "phpunit.phpunit": "vendor/bin/pest"
}
```

### Laravel Artisan

```jsonc
{
  "phpunit.phpunit": "artisan test"
}
```

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

### ParaTest

```jsonc
{
  "phpunit.phpunit": "vendor/bin/paratest"
}
```

### Docker

```jsonc
{
  "phpunit.command": "docker exec -t [container_id] /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

或使用 `docker run`：

```jsonc
{
  "phpunit.command": "docker run --rm -t -v ${PWD}:/app -w /app php:latest ${php} ${phpargs} ${phpunit} ${phpunitargs}",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
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

## Xdebug 偵錯

1. 在 `.vscode/launch.json` 建立偵錯設定：

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/var/www": "${workspaceRoot}"
      }
    }
  ]
}
```

2. 在擴充設定中指定該設定名稱：

```jsonc
{
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

若 Xdebug 設定為 `xdebug.start_with_request=trigger`，需加入觸發變數：

```jsonc
{
  "phpunit.command": "docker compose exec -e XDEBUG_TRIGGER=VSCODE app bash -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

然後在 Test Explorer 中點擊 **Debug Test** 按鈕即可。

## 疑難排解

### `${workspaceFolder}` 在路徑對應中無法正確解析

請將 `${workspaceFolder}` 替換為實際的絕對路徑：

```jsonc
{
  "phpunit.paths": {
    "/home/user/myproject": "/app"
  }
}
```

## 授權

[MIT](LICENSE.md)
