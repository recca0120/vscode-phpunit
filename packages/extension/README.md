# PHPUnit & Pest Test Explorer for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Installs](https://img.shields.io/vscode-marketplace/i/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![License](https://img.shields.io/github/license/recca0120/vscode-phpunit.svg?style=flat-square)](LICENSE.md)

[繁體中文](https://github.com/recca0120/vscode-phpunit/blob/main/packages/extension/README.zh-TW.md)

Run [PHPUnit](https://phpunit.de/) and [Pest](https://pestphp.com/) tests directly in VS Code using the native Test Explorer UI.

![PHPUnit](https://raw.githubusercontent.com/recca0120/vscode-phpunit/main/packages/extension/img/phpunit.gif)

## Quick Start

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
2. Open a PHP project that contains a `phpunit.xml` or `phpunit.xml.dist`
3. Tests appear automatically in the Test Explorer sidebar — click to run

> PHPUnit and Pest are auto-detected from `vendor/bin`. No configuration needed in most projects.

## Features

- **Test Explorer integration** — discover, run, and debug tests from the sidebar
- **PHPUnit 7 – 12 & Pest 1 – 4** — broad version support
- **Auto-detect binary** — reads `composer.json` to use `vendor/bin/pest` for Pest projects automatically
- **Auto-reload** — reloads all tests when `phpunit.xml` or `composer.lock` changes
- **Colored output** — syntax-highlighted results with embedded PHP source snippets
- **Clickable stack traces** — jump to file:line directly from error output
- **Remote environments** — Docker, SSH, Laravel Sail, DDEV via custom commands
- **Multi-workspace Docker** — single shared container for multiple workspace folders
- **Parallel execution** — ParaTest support
- **Xdebug debugging** — step-through debugging with one click
- **Continuous runs** — auto-run tests on file changes

![Pest](https://raw.githubusercontent.com/recca0120/vscode-phpunit/main/packages/extension/img/pest.png)

## Settings

Add to `.vscode/settings.json`. All settings use the `phpunit.*` prefix.

```jsonc
{
  // Path to the PHP binary (default: "php")
  "phpunit.php": "php",

  // Path to PHPUnit or Pest binary
  // Auto-detected from composer.json: uses "vendor/bin/pest" if pestphp/pest is a dependency,
  // otherwise defaults to "vendor/bin/phpunit". Only set this if auto-detection is not sufficient.
  "phpunit.phpunit": "vendor/bin/phpunit",

  // Custom command template
  // Variables: ${php}, ${phpargs}, ${phpunit}, ${phpunitargs}, ${phpunitxml}, ${cwd}
  //   ${workspaceFolder}         — absolute path to the workspace folder
  //   ${workspaceFolderBasename} — folder name only (e.g. "myproject")
  //   ${userHome}                — user home directory
  //   ${pathSeparator}           — OS path separator ("/" or "\")
  "phpunit.command": "\"${php}\" ${phpargs} \"${phpunit}\" ${phpunitargs}",

  // Extra arguments passed to PHPUnit
  "phpunit.args": [],

  // Path mappings for remote environments { "local/path": "remote/path" }
  "phpunit.paths": {},

  // Environment variables set before running
  "phpunit.environment": {},

  // Save all open files before running tests (default: false)
  "phpunit.saveBeforeTest": false,

  // Output format preset: "collision" (detailed per-test), "progress" (dot-progress), or "pretty" (per-test without icons)
  "phpunit.output.preset": "collision",

  // Override individual format fields from the preset (see phpunit package docs)
  "phpunit.output.format": {},

  // Clear debug output channel before each run (default: true)
  "phpunit.clearDebugOutputOnRun": true,

  // When to show output: "always" | "onFailure" | "never" (default: "onFailure")
  "phpunit.showAfterExecution": "onFailure",

  // launch.json configuration name for debugging
  "phpunit.debuggerConfig": "",

  // Xdebug port, 0 = random (default: 0)
  "phpunit.xdebugPort": 0
}
```

## Configuration Examples

### Local

For most local projects, zero configuration is needed. To use a different test runner:

```jsonc
// Pest
{ "phpunit.phpunit": "vendor/bin/pest" }

// Laravel Artisan
{ "phpunit.phpunit": "artisan test" }

// ParaTest (parallel execution)
{ "phpunit.phpunit": "vendor/bin/paratest" }
```

### Docker

When running tests inside a Docker container, you need two things:

1. **`phpunit.command`** — tells the extension how to execute commands in the container
2. **`phpunit.paths`** — maps your local file paths to container paths so the extension can locate test files and parse error output

> **Important:** `${workspaceFolder}` may not resolve correctly on macOS or WSL. If you encounter path issues, replace it with the actual absolute path (e.g. `/home/user/myproject`).

**`docker exec` (existing container):**

```jsonc
{
  "phpunit.command": "docker exec -t my_container /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

**`docker run` (ephemeral container):**

```jsonc
{
  "phpunit.command": "docker run --rm -t -v ${PWD}:/app -w /app php:latest ${php} ${phpargs} ${phpunit} ${phpunitargs}",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

**Docker Compose:**

```jsonc
{
  "phpunit.command": "docker compose exec -t app /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "${workspaceFolder}": "/app"
  }
}
```

If your `docker-compose.yml` is not in the workspace root, use the `-f` flag:

```jsonc
{
  "phpunit.command": "docker compose -f /path/to/docker-compose.yml exec -t app /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\""
}
```

### Docker Multi-Workspace

When using a [multi-root workspace](https://code.visualstudio.com/docs/editor/multi-root-workspaces) with a single shared Docker container, use `${workspaceFolderBasename}` to switch directories per folder:

```jsonc
// .code-workspace settings
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

Each project folder is mounted separately in the container under its basename:

```yaml
# docker-compose.yml
services:
  vscode-phpunit:
    # ...
    volumes:
      - ./project-a:/project-a
      - ./project-b:/project-b
```

The command `cd /${workspaceFolderBasename}` switches into the correct directory before running tests. Each folder should have its own `phpunit.xml` — the extension auto-detects it. **Do not** set `--configuration` with an absolute container path at workspace level (e.g. `--configuration=/project-a/phpunit.xml`), as this causes every folder to load the same config and discover duplicate tests.

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

When using Docker from a WSL workspace, use the full WSL path as the local key:

```jsonc
{
  "phpunit.command": "docker exec -t my_container /bin/sh -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.paths": {
    "//wsl.localhost/Ubuntu/var/www/myproject": "/var/www/myproject"
  }
}
```

## Debugging with Xdebug

1. Add a launch configuration to `.vscode/launch.json`:

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

2. Set the configuration name in settings:

    ```jsonc
    {
      "phpunit.debuggerConfig": "Listen for Xdebug"
    }
    ```

3. Click the **Debug Test** button in the Test Explorer.

**Using `xdebug.start_with_request=trigger` in Docker:**

```jsonc
{
  "phpunit.command": "docker compose exec -e XDEBUG_TRIGGER=VSCODE app bash -c \"${php} ${phpargs} ${phpunit} ${phpunitargs}\"",
  "phpunit.debuggerConfig": "Listen for Xdebug"
}
```

**Breakpoints not hit?** Check that:
- Xdebug is configured with `xdebug.mode=debug` and `xdebug.start_with_request=yes` (or `trigger`)
- `phpunit.debuggerConfig` matches the **exact name** in `launch.json`
- `pathMappings` in `launch.json` correctly maps container paths to local paths
- The Xdebug port is not blocked by a firewall

## Commands

| Command | Description | Keybinding |
|---|---|---|
| `phpunit.reload` | Reload tests | — |
| `phpunit.run-all` | Run all tests | `Cmd+T Cmd+S` |
| `phpunit.run-file` | Run tests in current file | `Cmd+T Cmd+F` |
| `phpunit.run-test-at-cursor` | Run test at cursor | `Cmd+T Cmd+T` |
| `phpunit.run-by-group` | Run tests by group | — |
| `phpunit.rerun` | Repeat last test run | `Cmd+T Cmd+L` |

## Troubleshooting

<details>
<summary><code>${workspaceFolder}</code> resolves to <code>/</code></summary>

On some systems (macOS, WSL), `${workspaceFolder}` may not resolve correctly. Replace it with the actual absolute path in `phpunit.paths`:

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

Usually caused by another extension (e.g. [DEVSENSE PHP Tools](https://marketplace.visualstudio.com/items?itemName=DEVSENSE.phptools-vscode)) injecting `${php}` as a literal variable. Fix:

```jsonc
{
  "phpunit.command": ""
}
```

If that doesn't help, disable conflicting PHP extensions, then re-enable **PHPUnit Test Explorer** first.
</details>

<details>
<summary>Paths with spaces cause errors</summary>

Ensure your `phpunit.command` template quotes the variables (this is the default):

```jsonc
{
  "phpunit.command": "\"${php}\" ${phpargs} \"${phpunit}\" ${phpunitargs}"
}
```
</details>

<details>
<summary>Duplicate tests in multi-root workspace</summary>

If the same tests appear under multiple workspace folders, check your `phpunit.args` setting. A `--configuration` flag pointing to an absolute container path (e.g. `--configuration=/var/www/project-a/phpunit.xml`) at workspace level causes every folder to load the same `phpunit.xml`.

**Fix:** Remove `--configuration` from `phpunit.args` and let each folder auto-detect its own `phpunit.xml`. See the [Docker Multi-Workspace](#docker-multi-workspace) section for the correct setup.
</details>

## Contributing

Found a bug? Have an idea? We welcome contributions!

- [Report a bug](https://github.com/recca0120/vscode-phpunit/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/recca0120/vscode-phpunit/issues/new?template=feature_request.yml)
- [Development guide](https://github.com/recca0120/vscode-phpunit)

## License

[MIT](LICENSE.md)
