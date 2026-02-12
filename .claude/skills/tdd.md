# TDD Skill - Test-Driven Development

## Core Principles

1. **Never modify `expect` assertions** - Tests define the expected behavior. If a test fails, fix the production code, not the test.
2. **Write tests first, then production code** - Red -> Green -> Refactor cycle.
3. **Find the first executing code via tests** - Always use test execution (`npm run jest`) to locate the entry point of the code under change.

## TDD Cycle

### Red Phase
- Write a failing test that describes the desired behavior.
- Run the test to confirm it fails for the right reason.
- Command: `npm run jest -- --testPathPattern='<test-file>' --no-coverage`

### Green Phase
- Write the **minimum** production code to make the test pass.
- Do not over-engineer or add unnecessary logic.
- Run the test to confirm it passes.

### Refactor Phase
- **Before refactoring**: Run all related tests to confirm they pass.
- Refactor the code for clarity, removing duplication.
- **After refactoring**: Run all related tests again to confirm nothing broke.
- Command: `npm run jest -- --testPathPattern='<test-file>' --no-coverage`

## Test Double Preference Order

Use the simplest test double that satisfies the need:

1. **Fake** - A working implementation with shortcuts (e.g., in-memory repository). Preferred because it provides the most realistic behavior.
2. **Spy** - Records calls for later verification. Use when you need to verify interactions.
3. **Stub** - Returns pre-configured responses. Use when you need to control indirect inputs.
4. **Mock** - Pre-programmed expectations. Use as a last resort when the above are insufficient.

## Refactoring Rules

1. **Always run tests before refactoring** to establish a green baseline.
2. **Make small, incremental changes** - One refactoring step at a time.
3. **Run tests after each refactoring step** to verify behavior is preserved.
4. **Never refactor and change behavior simultaneously** - Separate refactoring commits from feature commits.

## Test Execution Commands

```bash
# Run all jest tests
npm run jest

# Run specific test file
npm run jest -- --testPathPattern='<pattern>' --no-coverage

# Run tests in watch mode
npm run jest:watch

# Run tests matching a name pattern
npm run jest -- --testNamePattern='<pattern>' --no-coverage
```

## Test File Conventions

- Test files are co-located with source files: `<name>.test.ts`
- Integration tests under `src/test/suite/`
- Test fixtures under `src/PHPUnit/__tests__/fixtures/`
- Mocks under `src/PHPUnit/__mocks__/`

## Workflow Summary

1. Identify the behavior to implement or change.
2. Run existing tests to understand the current state.
3. Write a failing test (Red).
4. Write minimal code to pass (Green).
5. Run tests before refactoring.
6. Refactor for readability.
7. Run tests after refactoring to confirm no regressions.
