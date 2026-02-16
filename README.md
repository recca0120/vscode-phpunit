# PHPUnit & Pest Test Explorer for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Downloads](https://img.shields.io/vscode-marketplace/d/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)

[繁體中文](README.zh-TW.md)

Run PHPUnit and Pest tests directly in VS Code with the native Test Explorer UI. Supports Docker, SSH, and remote environments with Xdebug step-debugging.

![PHPUnit](img/phpunit.gif)

![Pest](img/pest.png)

## Features

- Discovers and displays all PHPUnit / Pest tests in the Test Explorer sidebar
- Run or debug individual tests, files, suites, or the entire project
- Colored output channel with syntax-highlighted results and embedded PHP source snippets
- Clickable file links in error stack traces
- Supports PHPUnit 7 – 12 and Pest 2 – 3
- Supports ParaTest for parallel execution
- Works in Docker, SSH, and other remote environments via custom commands
- Xdebug integration for step-by-step debugging
- Continuous test runs on file changes

## Commands

| Command | Title | Default Keybinding |
|---|---|---|
| `phpunit.reload` | Reload tests | — |
| `phpunit.run-all` | Run all tests | `Cmd+T Cmd+S` |
| `phpunit.run-file` | Run tests in current file | `Cmd+T Cmd+F` |
| `phpunit.run-test-at-cursor` | Run test at cursor | `Cmd+T Cmd+T` |
| `phpunit.run-by-group` | Run tests by group | — |
| `phpunit.rerun` | Repeat last test run | `Cmd+T Cmd+L` |

## Settings

All settings are under the `phpunit.*` namespace. Add them to `.vscode/settings.json`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `phpunit.php` | `string` | `"php"` | Path to the PHP binary. Falls back to the global `php` on PATH. |
| `phpunit.phpunit` | `string` | `"vendor/bin/phpunit"` | Path to PHPUnit or Pest binary. Auto-detected from `vendor/bin`, project root, or global PATH. |
| `phpunit.command` | `string` | `"${php}" ${phpargs} "${phpunit}" ${phpunitargs}` | Custom command template. Available variables: `${php}`, `${phpargs}`, `${phpunit}`, `${phpunitargs}`, `${phpunitxml}`, `${cwd}`. |
| `phpunit.args` | `string[]` | `[]` | Extra arguments passed to PHPUnit (e.g. `["-c", "phpunit.xml.dist"]`). |
| `phpunit.paths` | `object` | — | Path mappings for remote environments (e.g. `{ "${workspaceFolder}": "/app" }`). |
| `phpunit.environment` | `object` | — | Environment variables set before running (e.g. `{ "XDEBUG_MODE": "coverage" }`). |
| `phpunit.clearOutputOnRun` | `boolean` | `true` | Clear the output channel before each run. |
| `phpunit.showAfterExecution` | `string` | `"onFailure"` | When to show the output channel: `"always"`, `"onFailure"`, or `"never"`. |
| `phpunit.debuggerConfig` | `string` | — | Name of a `launch.json` configuration to use when debugging tests. |
| `phpunit.xdebugPort` | `integer` | `0` | Port for Xdebug communication. `0` uses a random port. |

## Configuration Examples

### Basic

PHPUnit and Pest are auto-detected. No configuration needed in most cases.

To use Pest explicitly:

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

Or with `docker run`:

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

## Debugging with Xdebug

1. Create a launch configuration in `.vscode/launch.json`:

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

2. Point the extension to that configuration:

```jsonc
{
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

If your Xdebug is configured with `xdebug.start_with_request=trigger`, add the trigger variable:

```jsonc
{
  "phpunit.command": "docker compose exec -e XDEBUG_TRIGGER=VSCODE app bash -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

Then use the **Debug Test** button in the Test Explorer.

## Troubleshooting

### `${workspaceFolder}` not resolving in path mappings

Replace `${workspaceFolder}` with the actual absolute path:

```jsonc
{
  "phpunit.paths": {
    "/home/user/myproject": "/app"
  }
}
```

## License

[MIT](LICENSE.md)
