# Format Variables Reference

Each format field in `PrinterFormat` supports template variables enclosed in `{braces}`. Variables that resolve to empty are omitted from output.

## Icons

| Key | Description | `progress` | `pretty` | `collision` |
|---|---|---|---|---|
| `version` | Version info icon | `🚀` / `STARTED` | _(empty)_ / `STARTED` | `🚀` / `STARTED` |
| `passed` | Test passed | _(empty)_ / `PASSED` | _(empty)_ / `PASSED` | `✅` / `PASSED` |
| `failed` | Test failed | _(empty)_ / `FAILED` | _(empty)_ / `FAILED` | `❌` / `FAILED` |
| `ignored` | Test skipped | _(empty)_ / `IGNORED` | _(empty)_ / `IGNORED` | `➖` / `IGNORED` |

## Format Fields and Available Variables

### Header

| Field | Type | Available Variables | Description |
|---|---|---|---|
| `version` | `string \| false` | `{icon}`, `{label}`, `{text}`, `{phpunit}`, `{paratest}` | Version line (e.g. `PHPUnit 11.0`) |
| `runtime` | `string \| false` | `{text}`, `{runtime}` | Runtime line (e.g. `Runtime: PHP 8.3`) |
| `configuration` | `string \| false` | `{text}`, `{configuration}` | Configuration path |
| `processes` | `string \| false` | `{text}`, `{processes}` | Number of parallel processes |

### Test Lifecycle

| Field | Type | Available Variables | Description |
|---|---|---|---|
| `suiteStarted` | `string \| false` | `{id}`, `{name}` | Suite header (FQCN) |
| `suiteFinished` | `string \| false` | _(none)_ | Suite footer |
| `started` | `string \| false` | `{name}`, `{id}` | Individual test started |
| `finished` | `string` | `{status_dot}`, `{icon}`, `{label}`, `{name}`, `{id}`, `{duration}` | Test passed result |
| `failed` | `string` | `{status_dot}`, `{icon}`, `{label}`, `{name}`, `{id}`, `{duration}` | Test failed result |
| `ignored` | `string` | `{status_dot}`, `{icon}`, `{label}`, `{name}`, `{id}`, `{message}`, `{duration}` | Test skipped result |

### Summary

| Field | Type | Available Variables | Description |
|---|---|---|---|
| `duration` | `string \| false` | `{text}`, `{time}`, `{memory}` | Time and memory (e.g. `Time: 00:00.123, Memory: 10.00 MB`) |
| `resultSummary` | `string \| false` | `{text}`, `{tests}`, `{assertions}`, `{errors}`, `{failures}`, `{warnings}`, `{skipped}`, `{incomplete}`, `{risky}` | Final summary (e.g. `OK (5 tests, 10 assertions)`) |

### Error Block (`error`)

| Field | Type | Available Variables | Description |
|---|---|---|---|
| `error.template` | `string` | `{index}`, `{icon}`, `{label}`, `{name}`, `{class}`, `{fqcn}`, `{id}`, `{duration}`, `{message}`, `{diff}`, `{snippet}`, `{details}` | Error block template, lines separated by `\n`. Lines with unresolved variables are omitted. |
| `error.diff.header` | `string \| false` | _(plain text)_ | Diff header lines separated by `\n` (e.g. `--- Expected\n+++ Actual\n@@ @@`). Set `false` to hide. |
| `error.detail.line` | `string` | `{index}`, `{file}` | Stack trace line format. `{file}` includes `file:line`. |

## Variable Descriptions

| Variable | Description | Example |
|---|---|---|
| `{icon}` | Emoji icon from `icons` config | `✅`, `❌`, `🚀` |
| `{label}` | Text label from `icons` config | `PASSED`, `FAILED` |
| `{text}` | Raw text from PHPUnit output | `PHPUnit 11.0`, `Runtime: PHP 8.3` |
| `{phpunit}` | PHPUnit version number | `11.0` |
| `{paratest}` | ParaTest version number (optional) | `7.0` |
| `{runtime}` | PHP runtime version | `8.3.1` |
| `{configuration}` | Configuration file path | `/app/phpunit.xml` |
| `{processes}` | Number of parallel processes | `4` |
| `{id}` | Fully qualified test ID | `Namespace\Class::method` |
| `{name}` | Test method name (without `test_` prefix) | `is_not_same` |
| `{class}` | Short class name | `AssertionsTest` |
| `{fqcn}` | Fully qualified class name | `Namespace\Class` |
| `{status_dot}` | Single character status | `.`, `F`, `S` |
| `{duration}` | Test duration in milliseconds | `5` |
| `{message}` | Failure or skip message | `Failed asserting that...` |
| `{time}` | Execution time | `00:00.123` |
| `{memory}` | Memory usage | `10.00 MB` |
| `{tests}` | Total test count | `5` |
| `{assertions}` | Total assertion count | `10` |
| `{errors}` | Error count | `0` |
| `{failures}` | Failure count | `1` |
| `{warnings}` | Warning count | `0` |
| `{skipped}` | Skipped count | `2` |
| `{incomplete}` | Incomplete count | `0` |
| `{risky}` | Risky test count | `0` |
| `{index}` | 1-based index number | `1`, `2`, `3` |
| `{file}` | File path with line number | `/path/to/Test.php:27` |
| `{diff}` | Formatted diff output | _(multi-line)_ |
| `{snippet}` | Source code snippet at failure location | _(multi-line)_ |
| `{details}` | Stack trace | _(multi-line)_ |
