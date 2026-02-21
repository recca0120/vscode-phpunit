# vscode-phpunit

Monorepo for the **PHPUnit & Pest Test Explorer** VS Code extension.

[![Version](https://img.shields.io/vscode-marketplace/v/recca0120.vscode-phpunit.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![Installs](https://img.shields.io/vscode-marketplace/i/recca0120.vscode-phpunit.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=recca0120.vscode-phpunit)
[![License](https://img.shields.io/github/license/recca0120/vscode-phpunit.svg?style=flat-square)](LICENSE.md)

## Packages

| Package | Description |
|---|---|
| [`packages/phpunit`](packages/phpunit) | `@vscode-phpunit/phpunit` — PHPUnit/Pest parser, runner, and tree-sitter utilities. Built with **tsup** (ESM + CJS). |
| [`packages/extension`](packages/extension) | VS Code extension — Test Explorer integration for PHPUnit & Pest. Bundled with **esbuild**. Depends on `@vscode-phpunit/phpunit`. |

### packages/phpunit

Core library that parses PHPUnit/Pest test files (via tree-sitter WASM), builds command lines, and processes test output. Published as `@vscode-phpunit/phpunit`.

- **Build**: `tsup` outputs ESM/CJS to `dist/`, and copies `tree-sitter.wasm` / `tree-sitter-php.wasm` into `dist/`.
- **Test**: Vitest

### packages/extension

VS Code extension that integrates with the native Test Explorer UI. Consumes `@vscode-phpunit/phpunit` as a dev dependency; esbuild bundles everything into a single `dist/extension.js`.

- **Build**: `esbuild` bundles to `dist/extension.js`, and copies WASM files from `node_modules/@vscode/tree-sitter-wasm/wasm/` to `dist/`.
- **Test**: Vitest (unit) + `@vscode/test-electron` (e2e)
- **Package**: `@vscode/vsce` produces `.vsix`

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Common Commands

```bash
# Compile all packages (phpunit tsup + extension esbuild)
pnpm compile

# Run all unit tests
pnpm test

# Run e2e tests (extension only)
pnpm test:e2e

# Lint
pnpm lint

# Type check
pnpm typecheck

# Production build for extension (minified)
pnpm package

# Produce .vsix file
cd packages/extension && pnpm exec vsce package --no-dependencies
```

### Debugging the Extension

The repository includes launch configurations in `.vscode/launch.json`:

| Configuration | Description |
|---|---|
| **Run Extension** | Opens with a local `phpunit-stub` project |
| **Run Extension (Multi-Workspace)** | Opens a multi-folder workspace (local) |
| **Run Extension (Docker Multi-Workspace)** | Opens a multi-folder workspace running inside Docker |

#### Docker Multi-Workspace Setup

1. Start the shared container:

    ```bash
    cd packages/phpunit/tests/fixtures/workspaces
    docker compose up -d --build
    ```

2. Select **Run Extension (Docker Multi-Workspace)** from the debug panel and press `F5`.

3. Stop the container:

    ```bash
    docker compose down
    ```

## Contributing

- [Report a bug](https://github.com/recca0120/vscode-phpunit/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/recca0120/vscode-phpunit/issues/new?template=feature_request.yml)
- [Contributing guide](CONTRIBUTING.md)

## License

[MIT](LICENSE.md)
