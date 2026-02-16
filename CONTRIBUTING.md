# Contributing

Thanks for your interest in improving PHPUnit & Pest Test Explorer!

## Reporting Bugs

Please use the [Bug Report](https://github.com/recca0120/vscode-phpunit/issues/new?template=bug_report.yml) template. The most helpful reports include:

- Your `phpunit.*` settings from `.vscode/settings.json`
- The output from the **PHPUnit** output channel (View → Output → "PHPUnit")
- Your PHP and PHPUnit/Pest versions

These details help us reproduce the issue quickly. Without them, we may need to go back and forth asking for more info, which slows things down for everyone.

## Suggesting Features

Open a [Feature Request](https://github.com/recca0120/vscode-phpunit/issues/new?template=feature_request.yml) to discuss the idea before writing code. This saves effort in case the feature doesn't fit the project direction or there's an existing way to achieve what you need.

## Submitting Pull Requests

1. **Open an issue first** — this helps us discuss the approach before you invest time coding
2. **Keep PRs focused** — one bug fix or feature per PR
3. **Include tests** — make sure all tests pass before submitting
4. **Follow existing code style** — the project uses [Biome](https://biomejs.dev/) for linting (`pnpm lint`)

### Development Setup

```bash
git clone https://github.com/recca0120/vscode-phpunit.git
cd vscode-phpunit
pnpm install
```

### Running Tests

```bash
pnpm vitest run       # unit tests (fast, no VS Code needed)
pnpm vitest:watch     # unit tests in watch mode
pnpm test:e2e         # end-to-end tests (launches VS Code)
pnpm lint             # lint with Biome
```

To manually test the extension, press `F5` in VS Code to launch the Extension Development Host.

### Code Style

- Prefer **early returns** (guard clauses) over nested `if-else`
- Keep changes minimal — don't refactor surrounding code in a bug fix PR
- Run `pnpm lint` before committing

## Questions?

If you have questions that aren't bugs or feature requests, please use [GitHub Discussions](https://github.com/recca0120/vscode-phpunit/discussions).
