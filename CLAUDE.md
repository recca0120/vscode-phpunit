# CLAUDE.md - vscode-phpunit

## Project Summary

VS Code extension for PHPUnit/Pest test integration. TypeScript project with two layers:
- `src/PHPUnit/` - Pure logic (no VS Code dependency), testable with Vitest
- `src/` (top-level) - VS Code integration layer

## Quick Commands

```bash
npm run jest                                          # Run all unit tests
npm run jest -- --testPathPattern='<pattern>' --no-coverage  # Run specific test
npm run jest:watch                                    # Watch mode
npm run lint                                          # Biome lint check
npm run lint:fix                                      # Biome lint + auto-fix
npm run format                                        # Biome format
npm run typecheck                                     # Type check (tsc --noEmit)
npm run compile                                       # Type check + esbuild
```

## Code Style

- **Biome**: printWidth 100, singleQuote true, indentWidth 4, indentStyle space
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Imports**: Use named exports/imports. Barrel files (`index.ts`) for each module.
- **Tests**: Co-located with source as `<name>.test.ts`

## Architecture Rules

- `src/PHPUnit/` must NOT import from `vscode`. Keep it framework-agnostic.
- `src/TestCollection/`, `src/Observers/`, `src/Handler.ts` can import from both `vscode` and `src/PHPUnit/`.
- Observer pattern for test run events. ProcessBuilder pattern for process construction.

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
| Add PHPUnit command option | `src/PHPUnit/ProcessBuilder/ProcessBuilder.ts` |
| Parse new teamcity event | `src/PHPUnit/ProblemMatcher/` |
| New test parser feature | `src/PHPUnit/TestParser/` |
| Test Explorer UI changes | `src/TestCollection/TestHierarchyBuilder.ts` |
| Output formatting | `src/Observers/Printers/` |
| Path mapping (Docker/SSH) | `src/PHPUnit/ProcessBuilder/PathReplacer.ts` |
| Coverage support | `src/CloverParser.ts`, `src/PHPUnit/ProcessBuilder/Xdebug.ts` |
