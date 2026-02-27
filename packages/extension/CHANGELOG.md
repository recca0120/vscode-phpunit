# Change Log

All notable changes to the "vscode-phpunit" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [3.9.28] - 2026-02-28

### Fixed
- Fix: pass duration to `testRun.passed` and fix stackTrace 0-based line conversion
- Fix: guard against undefined `result.file` in TestResultObserver
- Fix: prevent double `close` event when process spawn fails
- Fix: `XmlElement.getText()` return type now correctly reflects possible `undefined`
- Fix: `TestStore.set()` removes file from old suite when moving to new suite

### Changed
- Refactor: pass `location` and `testId` through PrinterObserver to `writer.append`
- Refactor: convert LF to CRLF in TestRunWriter for VS Code TestRun
- Refactor: replace tuple return with named methods in TestRunWriter
- Refactor: replace type assertion with type guard in PrinterObserver
- Refactor: use exact path match instead of `endsWith` in TestResultObserver
- Refactor: `ProcessBuilder.replacePath` returns new object instead of mutating input
- Refactor: clean public API — remove dead re-exports (AnsiStyle, Position, Range, resolveWasmDir, etc.)
- Refactor: extract `GROUP_TAG_PREFIX` constant in TestHierarchyBuilder
- Refactor: merge duplicate switch cases in TreeSitterAdapter

## [3.9.26] - 2026-02-27

### Added
- Printer: PHPUnit-style dot colors in progress mode — distinguish F (failure, bgRed), E (error, red+bold), S (skipped, cyan+bold)
- Printer: ANSI color output with Collision-style syntax highlighting in Test Result Panel
- Printer: configurable format-string presets (progress, collision, pretty)

### Fixed
- Fix: PHP syntax highlighter misidentifies multiplication line (`* $b`) as doc-comment
- Fix: TestRunWriter.appendLine now correctly appends trailing newline
- Fix: trim methodName in FilterStrategy to match Pest's NameFilterIterator behavior
- Fix: skip Printer output for non-class testSuite events
- Fix: Pest testSuiteStarted with file-path locationHint parsing

### Changed
- Refactor: rewrite Printer with format-string-driven presets and ANSI color support
- Refactor: extract TestStore from TestCollection for cleaner separation
- Refactor: replace base64 filter encoding with placeholder approach
- Refactor: rename OutputChannelObserver to RawOutputObserver, organize Writers
- Refactor: strip ANSI codes in RawOutputObserver and ErrorDialogObserver
- Rename: OutputChannel display name from "PHPUnit" to "PHPUnit Debug"
- Rename: `clearOutputOnRun` setting to `clearDebugOutputOnRun`

## [3.9.25] - 2026-02-24

### Changed
- Refactor: move test tree building logic (`TestHierarchyBuilder`) to phpunit package for editor-agnostic reuse
- Refactor: move VS Code icon (Codicon) logic from phpunit package to extension
- Refactor: narrow phpunit package public API — remove internal exports (TestOutputParser, TestIdentifier internals, XmlElement, unused utilities)
- Refactor: add `TestRange` type and `range` field to `TestTreeItem` interface, remove type assertion

## [3.9.24] - 2026-02-24

### Added
- Add Traditional Chinese README (`README.zh-TW.md`)

### Fixed
- Fix README links to use absolute GitHub URLs for VS Code Marketplace compatibility

## [3.9.23] - 2026-02-24

### Changed
- Rename `phpunit.saveFilesBeforeRun` setting to `phpunit.saveBeforeTest` for clarity

## [3.9.16] - 2026-02-22

### Fixed
- Fix: multiple DataProvider and Pest `->with()->with()` support (#13, #21) (#374)
- Fix: separate testIgnored handling, fix scalar diff display, remove OutputBuffer side effect
- Fix: upgrade fast-xml-parser to 5.3.7 to resolve DoS vulnerability

### Changed
- Refactor: reorganize phpunit package — group root-level files into `Configuration/` and `TestRunner/` subdirectories
- Refactor: clean up output formatter architecture

## [3.9.14] - 2026-02-21

### Changed
- Refactor: restructure project as pnpm monorepo (`packages/extension` + `packages/phpunit`)
- Refactor: extract PHPUnit core (parser, runner, test output, tree-sitter) into standalone `@vscode-phpunit/phpunit` package
- Refactor: extension now consumes `@vscode-phpunit/phpunit` as a dependency; esbuild bundles everything into a single file
- Refactor: tree-sitter WASM files are copied from `node_modules` during build
- Refactor: migrate all unit tests to Vitest across both packages
- Refactor: add per-package biome configs and lefthook integration
- Chore: update CI workflows (tests, e2e, publish) for monorepo structure

## [3.9.13] - 2026-02-21

### Added
- Feat: add `phpunit.saveFilesBeforeRun` option to automatically save all files before running tests

## [3.9.12] - 2026-02-20

### Fixed
- Fix: coverage file paths now correctly map container paths back to local workspace when using Docker/SSH/Laravel Sail path mappings (#368)

### Changed
- Refactor: share PathReplacer between command building and coverage reading so path mappings are always consistent
- Refactor: move coverage lifecycle (parse, cleanup, path mapping) into TestRunnerProcess
- Refactor: remove CoverageReader and TestRunnerBuilder classes (over-abstraction)
- Refactor: encapsulate Xdebug mode, ProcessBuilder auto-clones Xdebug

## [3.9.11] - 2026-02-20

### Fixed
- Fix: test file watcher now recreates with updated glob pattern when phpunit.xml testsuites change, so newly added testsuite directories are monitored without reloading VS Code

## [3.9.10] - 2026-02-20

### Fixed
- Fix: namespace prefix stripping now uses directory-namespace case-insensitive comparison instead of string matching, correctly handling cases where directory path and namespace differ in casing or structure
- Fix: deleting a folder now removes all tracked tests under that folder from the test explorer tree

## [3.9.9] - 2026-02-20

### Changed
- Refactor: testsuite nodes now sort alphabetically by name instead of phpunit.xml order, consistent with filesystem sorting
- Refactor: simplify TestHierarchyBuilder — `build()` returns Map directly, merge duplicated methods, store `multiSuite` boolean instead of full suite name array
- Refactor: inline single-use helpers in TestCollection (`removeTestItems`, `registerTestDefinition`, `compareFn`)
- Refactor: consolidate TestHierarchyBuilder tests into TestCollection.test.ts

## [3.9.8] - 2026-02-20

### Fixed
- Fix: running tests on a testsuite node in multi-testsuite projects could produce "no output" when another extension (e.g. Laravel) registers its own test controller (#366)
- Fix: `change` on a file in a single-file testsuite caused the testsuite tree node to be deleted and re-created at the wrong position
- Fix: testsuite node lost its TestDefinition index entry after file re-parse, breaking test execution from that node

### Changed
- Refactor: replace `TestCollectionCallbacks` with `ChangeResult` return values for clearer data flow
- Refactor: tighten BaseTestCollection API — `items()`, `initSuites()`, `getRootUri()`, `getPhpUnitXML()` now private
- Refactor: simplify `handleReset` to use index directly instead of `base.gatherFiles()`

## [3.9.7] - 2026-02-19

### Added
- Feat: auto-detect PHPUnit/Pest binary from `composer.json` — if `pestphp/pest` is a dependency, `vendor/bin/pest` is used automatically; no need to set `phpunit.phpunit` for Pest projects
- Feat: new path variables `${workspaceFolderBasename}`, `${userHome}`, `${pathSeparator}` available in `phpunit.command` and `phpunit.paths`
- Feat: auto-reload all tests when `phpunit.xml`, `phpunit.xml.dist`, `phpunit.dist.xml`, or `composer.lock` changes
- Feat: Docker Multi-Workspace support — single shared `vscode-phpunit` container serves multiple workspace folders via a unified docker-compose setup

### Changed
- Chore: testsuite icon changed to `$(symbol-namespace)` to match namespace icon style

## [3.9.6] - 2026-02-19

### Added
- Feat: add VarDumper TextMate grammar for syntax highlighting of `dd()`/`dump()` output in Test Results panel
- Feat: strip ANSI escape codes from `dd()`/`dump()` output in Output panel (fix garbled color codes)

### Changed
- Chore: update `symfony/var-dumper` constraint to `^5.4 || ^6.0 || ^7.0` to support PHP 7.4+
- Refactor: move `.code-workspace` files into `fixtures/workspaces/` directory

## [3.9.5] - 2026-02-19

### Changed
- Refactor: rename `PHPUnitFileCoverage` to `FileCoverageAdapter`, remove `src/Coverage/` directory
- Chore: fix `.vscodeignore` to exclude `vscode.d.ts` (741 KB), `__mocks__/`, `CONTRIBUTING.md`, `README.zh-TW.md` — reduces package size

## [3.9.4] - 2026-02-19

### Fixed
- Fix Coverage Panel not appearing for partial runs (selected tests): pass original `TestRunRequest` to `createTestRun` instead of creating a new one — VS Code uses object identity to link runs to the coverage profile
- Fix Docker coverage: use relative `.phpunit.cache/` path for clover files so PHPUnit can write them inside containers
- Fix Docker coverage: convert container paths to host paths via `toLocal` function when reading clover XML

### Changed
- Refactor: thread `toLocal` path converter through `CoverageCollector` → `CloverParser` for Docker path mapping
- Refactor: `Xdebug` generates relative clover paths; `ProcessBuilder` resolves them to absolute host paths via `getLocalCloverFile()`
- Test: add regression test asserting `createTestRun` receives the original `TestRunRequest` reference

## [3.9.3] - 2026-02-18

### Fixed
- Fix workspace folder ordering in Test Explorer
- Fix sortText to preserve insertion order for user-defined items
- Fix workspace folder run producing no output after reset

### Changed
- Refactor: slim down WorkspaceFolderManager by extracting responsibilities
- Refactor: reorder class members, extract shared icon(), and fix code smells

## [3.9.2] - 2026-02-18

### Changed
- Remove `yargs-parser`, `string-argv`, `semver` dependencies — replaced with lightweight custom utilities
- Remove esbuild `import.meta.url` banner workaround (no longer needed without yargs-parser)
- Rename `Transformer` folder to `TestIdentifier`

## [3.9.1] - 2026-02-18

### Fixed
- Clicking workspace folder item now runs tests for that folder in multi-workspace setups

### Changed
- Make error arrow symbol red in output channel
- Organize tmLanguage patterns by category with section comments
- Reorder TestType enum and icons to workspace, testsuite, namespace, class, method

## [3.9.0] - 2026-02-18

### Added
- Tree-sitter PHP parser using `@vscode/tree-sitter-wasm` for faster and more accurate code analysis

### Changed
- Replace `yargs-parser` with regex-based parser in TeamCity output parsing
- Restructure codebase with tree-sitter alignment and code quality improvements
- Move `@vscode/tree-sitter-wasm` to devDependencies

### Fixed
- Use classFQN lookup instead of URI comparison in classHierarchy test
- Initialize tree-sitter WASM before TestCollection tests

## [3.8.8] - 2026-02-17

### Fixed
- Support `--testsuite` filter for multi-testsuite phpunit.xml (#357)

## [3.8.7] - 2026-02-17

### Fixed
- Support PHP 8.4 `new` without parentheses syntax (#356)

## [3.8.6] - 2026-02-17

### Added
- Group tests by testsuite name when multiple testsuites defined in phpunit.xml (#136)

### Changed
- Replace `reduce-concat` with `flatMap` in `getClasses()` and `getMethods()`
- Convert `parseComments()` from `map/reduce` chain to `for` loop
- Pre-build RegExp lookup patterns in `AttributeParser` as class-level field
- Merge consecutive `if` statements in `normalizeCommentLineBreaks` into `while` loop
- Replace ternary with early return in `TestResultParser.parse()`

## [3.8.5] - 2026-02-17

### Fixed
- Handle `<exclude>` element with child `<directory>`/`<file>` nodes in phpunit.xml (#341)

## [3.8.4] - 2026-02-17

### Fixed
- Resolve flaky test caused by race condition in parallel file loading — shared namespace items were incorrectly deleted when a single file's URI was removed
- Fix paths with spaces causing "file not found" errors when running tests (#335)
- Separate stdout/stderr buffers in TestRunnerProcess to prevent stream interleaving

## [3.8.3] - 2026-02-17

### Added
- Support inherited test methods from abstract base classes (#352)
- Support trait method inheritance with `insteadof`/`as` conflict resolution
- Colored output channel via enhanced TextMate grammar
- Add lefthook pre-commit hook with biome lint
- Add issue templates, contributing guide

### Fixed
- Resolve TypeScript compilation errors from noNonNullAssertion fixes
- Resolve all biome lint warnings with recommended rules

### Changed
- Rewrite README with EN/zh-TW, update description and display name
- Update Pest version support to 1–4 in README
- Replace `TestRunnerEventProxy` boilerplate with JS Proxy pattern
- Various code quality refactorings (extract methods, `forEach` → `for...of`, early returns)

## [3.8.2] - 2026-02-16
- Extract shared methods in `OutputFormatter`, `TestDefinitionIndex`, `TraitUseParser`
- Convert `PHPUnitParser.classRegistry` to constructor injection

## [3.8.1] - 2026-02-16

### Added
- Multi-workspace support with per-folder DI containers (#347)
- Run tests by group command with interactive group selection
- Serialize test execution to prevent `RefreshDatabase` race conditions (#348)

### Changed
- Merge `testItems` Map into `TestDefinitionIndex` with URI-based grouping
- O(1) file lookup via `fileIndex` in `BaseTestCollection.findFile()`
- Extract `TestRunnerObserverFactory` for fresh observer instances per run
- Apply early return pattern in `PHPUnitXML`, `AttributeParser`, `TestCommandRegistry`

### Fixed
- Cross-folder parallel dispatch for multi-workspace runs
- Test collection cleanup, summary parser, and debug session bugs

## [3.8.0] - 2026-02-14

### Added
- Group filtering and run support (#339)

### Fixed
- Coverage parsing for namespaced projects (#337)

### Changed
- Improve code readability (#345)

## [3.7.10] - 2025-05-19

### Fixed
- Minor bug fixes

## [3.7.9] - 2025-05-14

### Fixed
- Command bug (#321)

## [3.7.8] - 2025-05-13

### Fixed
- Port configuration (#319)

## [3.7.4] - 2025-05-11

### Fixed
- Output handling (#314)
- Missing details (#315)

## [3.7.2] - 2025-05-11

### Changed
- Refactor Clover parser (#313)

## [3.7.1] - 2025-05-11

### Changed
- Refactor Xdebug integration (#312)

## [3.7.0] - 2025-05-10

### Added
- Support `phptools` command (#311)

### Fixed
- Do not replace root path (#307)
- Get root from phpUnitXML (#308)

## [3.6.5] - 2025-04-27

### Added
- Replace `-f` flag with `--functional` for ParaTest (#304)

### Changed
- Replace yargs with `parseArgsStringToArgv` (#305, #306)

## [3.6.3] - 2025-04-22

### Added
- Specify or find free Xdebug port (#303)

## [3.6.0] - 2025-04-07

### Added
- Document links support (#298)

### Fixed
- Pest link (#299)

## [3.5.34] - 2025-03-04

### Fixed
- Array const parsing (#294)

## [3.5.33] - 2025-02-24

### Added
- Group name support (#288)

### Fixed
- Test summary (#291)
- Find tests from TestCollection (#292)
- Fix #289 (#290)

## [3.5.25] - 2025-02-11

### Added
- Pest `describe` and `arch` support (#282, #283)

## [3.5.22] - 2025-01-31

### Fixed
- Nested describe tree (#276)

## [3.5.21] - 2025-01-31

### Fixed
- Named argument parsing (#274)

## [3.5.19] - 2025-01-20

### Added
- Pest `describe` as suite (#270)
- Pest with namespace (#273)

## [3.5.18] - 2025-01-13

### Added
- Allow specifying debug launch configuration (#267)

### Fixed
- Fix #268 (#269)

## [3.5.14] - 2024-12-30

### Changed
- Refactor strategy filter (#262)
- Refactor Pest support (#263)

### Fixed
- Special chars in test names (#265)
- Pest v1 compatibility (#264, #266)

## [3.5.9] - 2024-12-20

### Added
- Pest v2 support (#257)

### Fixed
- Pest v2 dataset (#259, #261)

## [3.5.7] - 2024-12-15

### Changed
- Test definition depth (#248)
- Keep test result id with dataset (#249)

### Fixed
- Numeric coverage values (#250)
- Fix #251 (#254)

## [3.5.4] - 2024-12-10

### Added
- Coverage support (#245, #246)

### Fixed
- Find files performance (#247)

## [3.5.3] - 2024-12-09

### Fixed
- Do not call `run.end()` before all tests are done (#242)

### Changed
- Process done handling (#243)
- Message observer (#244)

## [3.5.0] - 2024-12-08

### Added
- Pest test support: parse `test()`, `it()` (#232, #236)
- Debug run profile with Xdebug integration (#239)

### Fixed
- Create new CommandBuilder object for each test (#238)

## [3.4.26] - 2024-12-08

- Set environment variables
- New Result Printer

## [3.4.23] - 2024-12-05

- Fix cancel running tests

## [3.4.4] - 2024-11-20

- Minimatch

## [3.4.0] - 2024-11-16

- Group by namespace

## [3.3.8] - 2024-11-08

- Support phpunit.xml testsuite directory suffix attribute

## [3.3.4] - 2024-11-05

- Fix can not find phpunit.xml

## [3.3.0] - 2024-11-03

- Support phpunit.xml

## [3.2.2] - 2023-11-21

- Output channel preserveFocus false
- Fix path has whitespace

## [3.2.1] - 2023-11-21

- PHPUnit options before target

## [3.2.0] - 2023-08-25

- Continuous test runs

## [3.1.1] - 2023-05-04

- Fix testFailed twice

## [3.1.0] - 2023-04-14

- Parse testdox

## [3.0.34] - 2023-04-14

- Fix parse Depends, DataProvider Attribute

## [3.0.33] - 2023-04-12

- Fix test suite without namespace

## [3.0.31] - 2023-02-15

- Parse Depends, DataProvider Attribute

## [3.0.30] - 2023-02-13

- Parse Test Attribute

## [3.0.29] - 2023-02-12

- Compatible PHPUnit 10

## [3.0.27] - 2022-12-23

- Disable boolean-negation

## [3.0.26] - 2022-12-22

- Output add line break

## [3.0.25] - 2022-12-21

- Yellow square for output
- Print output before result

## [3.0.24] - 2022-12-21

- Fix output bug

## [3.0.23] - 2022-12-19

- Fix #139

## [3.0.20] - 2022-12-18

- Fix #138

## [3.0.19] - 2022-12-16

- Disable camel-case-expansion

## [3.0.17] - 2022-12-15

- Current workspace folder

## [3.0.16] - 2022-12-08

- Minify

## [3.0.15] - 2022-12-08

- clearOutputOnRun

## [3.0.14] - 2022-12-07

- Fix show output channel on failure

## [3.0.13] - 2022-12-07

- Fix ${workspaceFolder} bug

## [3.0.12] - 2022-12-07

- Show teamcity in testing api terminal

## [3.0.11] - 2022-12-07

- Parse ParaTest and PHPUnit version

## [3.0.10] - 2022-12-07

- showAfterExecution

## [3.0.9] - 2022-12-06

- [ParaTest](https://github.com/paratestphp/paratest)

## [3.0.8] - 2022-12-06

- Fix error rule

## [3.0.7] - 2022-12-06

- Auto reload configuration

## [3.0.6] - 2022-12-06

- SSH
- Fix error output

## [3.0.5] - 2022-12-05

- Fix remote command get wrong `command` argument

## [3.0.4] - 2022-12-05

- When spawn error, receive close event

## [3.0.3] - 2022-12-05

- Beautiful output channel

## [3.0.0] - 2022-12-04

- Initial release
