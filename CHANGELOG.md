# Change Log

All notable changes to the "vscode-phpunit" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
