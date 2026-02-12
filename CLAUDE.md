# CLAUDE.md - vscode-phpunit

## Project Summary

VS Code extension for PHPUnit/Pest test integration. TypeScript project with two layers:
- `src/PHPUnit/` - Pure logic (no VS Code dependency), testable with Jest
- `src/` (top-level) - VS Code integration layer

## Quick Commands

```bash
npm run jest                                          # Run all unit tests
npm run jest -- --testPathPattern='<pattern>' --no-coverage  # Run specific test
npm run jest:watch                                    # Watch mode
npm run lint                                          # ESLint check
npm run compile                                       # Webpack build
```

## Code Style

- **Prettier**: printWidth 100, singleQuote true, tabWidth 4, useTabs false
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Imports**: Use named exports/imports. Barrel files (`index.ts`) for each module.
- **Tests**: Co-located with source as `<name>.test.ts`

## Architecture Rules

- `src/PHPUnit/` must NOT import from `vscode`. Keep it framework-agnostic.
- `src/TestCollection/`, `src/Observers/`, `src/Handler.ts` can import from both `vscode` and `src/PHPUnit/`.
- Observer pattern for test run events. Builder pattern for command construction.

## TDD Workflow

1. **Never modify `expect` assertions** - Fix production code, not tests.
2. **Write tests first** - Red -> Green -> Refactor.
3. **Use tests to find entry points** - Run tests to locate the first executing code.
4. **Test double preference**: Fake > Spy > Stub > Mock.
5. **Refactoring discipline**:
   - Run tests BEFORE refactoring (establish green baseline).
   - Make small incremental changes.
   - Run tests AFTER each refactoring step.
   - Never refactor and change behavior in the same step.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add PHPUnit command option | `src/PHPUnit/CommandBuilder/Builder.ts` |
| Parse new teamcity event | `src/PHPUnit/ProblemMatcher/` |
| New test parser feature | `src/PHPUnit/TestParser/` |
| Test Explorer UI changes | `src/TestCollection/TestHierarchyBuilder.ts` |
| Output formatting | `src/Observers/Printers/` |
| Path mapping (Docker/SSH) | `src/PHPUnit/CommandBuilder/PathReplacer.ts` |
| Coverage support | `src/CloverParser.ts`, `src/PHPUnit/CommandBuilder/Xdebug.ts` |
