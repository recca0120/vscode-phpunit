# Project Overview - vscode-phpunit

## What is this project?

**PHPUnit Test Explorer** is a VS Code extension that integrates PHPUnit and Pest test frameworks into VS Code's native Test Explorer. It supports running tests in Docker/SSH environments and integrates with xdebug for debugging.

## Architecture Overview

```
src/
├── extension.ts              # VS Code extension entry point (activate function)
├── Handler.ts                # Orchestrates test runs (creates Builder, TestRunner, Observers)
├── CommandHandler.ts         # Registers VS Code commands (run-all, run-file, run-test-at-cursor, rerun)
├── Configuration.ts          # VS Code workspace configuration wrapper (extends BaseConfiguration)
├── CloverParser.ts           # Parses Clover XML coverage reports
├── PHPUnitLinkProvider.ts    # Document link provider for PHPUnit output
├── uri.test.ts               # URI utility tests
│
├── TestCollection/           # VS Code Test Explorer integration layer
│   ├── TestCollection.ts     # Maps PHPUnit test definitions to VS Code TestItems
│   ├── TestHierarchyBuilder.ts # Builds namespace > class > method tree for Test Explorer
│   └── TestCase.ts           # Wraps TestDefinition, handles filter strategy for running individual tests
│
├── Observers/                # Observer pattern for test run events
│   ├── TestResultObserver.ts # Updates VS Code TestRun with pass/fail/skip results
│   ├── OutputChannelObserver.ts # Writes formatted output to VS Code output channel
│   ├── MessageObserver.ts    # Shows VS Code information/error messages based on configuration
│   └── Printers/             # Output formatting
│       ├── Printer.ts        # Abstract base printer with OutputBuffer
│       ├── PrettyPrinter.ts  # Formats test results with icons and details
│       └── CollisionPrinter.ts # Handles collision detection in output
│
├── PHPUnit/                  # Core logic (framework-agnostic, no VS Code dependency)
│   ├── Configuration.ts      # Base configuration interface (IConfiguration) and default implementation
│   ├── PHPUnitXML.ts         # Parses phpunit.xml to determine test directories and patterns
│   ├── Element.ts            # XML element wrapper using fast-xml-parser
│   ├── TestRunner.ts         # Spawns PHPUnit process, emits events (TestRunner + TestRunnerProcess)
│   ├── TestRunnerObserver.ts # Event types, observer interface, and TestRunnerEventProxy
│   ├── types.ts              # Core types: TestType, TestDefinition, Position, Annotations
│   ├── utils.ts              # Utility functions (cloneInstance, CustomWeakMap, EOL, etc.)
│   │
│   ├── CommandBuilder/       # Builds the shell command to run PHPUnit
│   │   ├── Builder.ts        # Main builder: composes php + phpunit + args + path replacement
│   │   ├── PathReplacer.ts   # Translates local <-> remote paths (Docker/SSH support)
│   │   ├── FilterStrategy.ts # Generates --filter regex for specific test methods
│   │   └── Xdebug.ts         # Xdebug/coverage configuration (mode, environment, clover file)
│   │
│   ├── TestParser/           # Parses PHP files to discover test definitions
│   │   ├── TestParser.ts     # Base parser with event emitter pattern
│   │   ├── PHPUnitParser.ts  # Parses PHPUnit test classes using php-parser AST
│   │   ├── PestParser.ts     # Parses Pest test files (test(), it(), describe())
│   │   ├── AnnotationParser.ts # Parses PHPDoc annotations (@test, @depends, @dataProvider)
│   │   ├── PHPDefinition.ts  # Represents PHP class/method definitions from AST
│   │   └── Parser.ts         # php-parser wrapper
│   │
│   ├── TestCollection/       # Base test collection (no VS Code dependency)
│   │   ├── TestCollection.ts # File tracking, workspace management, test suite resolution
│   │   └── TestDefinitionBuilder.ts # Builds TestDefinition objects from parsed results
│   │
│   ├── ProblemMatcher/       # Parses PHPUnit teamcity output format
│   │   ├── ProblemMatcher.ts # Main matcher: caches events, handles start/fault/finish lifecycle
│   │   ├── TestResultParser.ts # Parses teamcity event strings into typed objects
│   │   ├── TestResultSummaryParser.ts # Parses summary lines (OK, FAILURES, etc.)
│   │   └── Various parsers   # TestVersionParser, TestRuntimeParser, etc.
│   │
│   └── Transformer/          # Normalizes test IDs and labels across PHPUnit/Pest
│       ├── TransformerFactory.ts # Factory for PHPUnit vs Pest transformers
│       ├── PHPUnitTransformer.ts # PHPUnit-specific ID/label generation
│       ├── PestTransformer.ts    # Pest-specific ID/label generation
│       ├── PHPUnitFixer.ts       # Fixes PHPUnit edge cases in teamcity output
│       └── PestFixer.ts          # Fixes Pest edge cases in teamcity output
│
└── test/                     # VS Code integration tests (mocha)
    ├── runTest.ts            # Test runner entry point
    └── suite/
        ├── index.ts          # Mocha test suite setup
        └── extension.test.ts # Extension integration tests
```

## Key Design Patterns

### Observer Pattern
`TestRunner` emits events (`TestRunnerEvent` + `TeamcityEvent`). Multiple observers subscribe:
- `TestResultObserver` - updates VS Code test states
- `OutputChannelObserver` - formats and writes output
- `MessageObserver` - shows VS Code messages

### Builder Pattern
`Builder` constructs the PHPUnit command with fluent API: configuration -> path replacement -> xdebug -> filter arguments.

### Strategy Pattern
`FilterStrategy` / `FilterStrategyFactory` generates different `--filter` regex patterns based on test type (PHPUnit class, method, Pest test/describe).

### Event Emitter Pattern
`TestParser` emits events per test type (namespace, class, describe, method) during parsing. `TestHierarchyBuilder` subscribes to build the VS Code test tree.

### Transformer Pattern
`TransformerFactory` creates the appropriate transformer (PHPUnit vs Pest) for generating unique test IDs and labels. Fixers handle edge cases in teamcity output.

## Two-Layer Architecture

1. **`src/PHPUnit/`** - Pure logic layer. No VS Code dependency. Can be tested with Jest alone.
2. **`src/`** (top-level) - VS Code integration layer. Depends on `vscode` API. Integration tests require VS Code test electron.

## Testing Strategy

- **Unit tests (Jest)**: Co-located `*.test.ts` files. Run with `npm run jest`.
- **Integration tests (Mocha)**: Under `src/test/suite/`. Run with `npm test` (requires VS Code).
- **Test fixtures**: PHP project stubs under `src/PHPUnit/__tests__/fixtures/` (phpunit-stub, pest-stub).
- **Mocks**: `src/PHPUnit/__mocks__/child_process.ts` for mocking spawn.

## Configuration

The extension reads `phpunit.*` settings from VS Code workspace configuration:
- `phpunit.php` - PHP binary path
- `phpunit.phpunit` - PHPUnit binary path
- `phpunit.command` - Custom command template with variables
- `phpunit.args` - Additional PHPUnit arguments
- `phpunit.paths` - Local <-> remote path mappings
- `phpunit.environment` - Environment variables
- `phpunit.clearOutputOnRun` - Clear output on new test run
- `phpunit.showAfterExecution` - When to show test report
- `phpunit.debuggerConfig` - Xdebug launch configuration name

## Build & Development

- **Language**: TypeScript
- **Bundler**: Webpack (production builds)
- **Test runner (unit)**: Jest with ts-jest
- **Test runner (integration)**: Mocha with @vscode/test-electron
- **Linter**: ESLint
- **Formatter**: Prettier (printWidth: 100, singleQuote: true, tabWidth: 4)

### Key Commands
```bash
npm run jest              # Run unit tests
npm run jest:watch        # Watch mode
npm run compile           # Webpack build
npm run lint              # ESLint
npm test                  # Integration tests (requires VS Code)
```
