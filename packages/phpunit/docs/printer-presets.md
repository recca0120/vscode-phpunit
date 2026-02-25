# Printer Presets

This extension supports three output presets that control how test results are displayed in the Output Channel.

| Preset | Source | Style |
|---|---|---|
| `progress` | [PHPUnit ProgressPrinter](https://github.com/sebastianbergmann/phpunit/blob/main/src/TextUI/Output/Default/ProgressPrinter/ProgressPrinter.php) | Dot progress (`.F.S`) |
| `pretty` | PHPUnit 10+ verbose style | Per-line without icons |
| `collision` | [Pest/Collision](https://github.com/nunomaduro/collision) | Per-line with emoji icons |

## Test Progress

| Item | `progress` | `pretty` | `collision` |
|---|---|---|---|
| isInline | `true` | `false` | `false` |
| Suite header | _(hidden)_ | `Namespace\ClassName` | `Namespace\ClassName` |
| Test passed | `.` | `  passed 5 ms` | `  ✅ passed 5 ms` |
| Test failed | `F` | `  failed 5 ms` | `  ❌ failed 5 ms` |
| Test skipped | `S` | `  skipped ➜ reason 0 ms` | `  ➖ skipped ➜ reason 0 ms` |
| Suite footer | _(hidden)_ | _(empty line)_ | _(empty line)_ |

### Example: `progress`

```
..F.S.                                               6 / 6 (100%)
```

### Example: `pretty`

```
Recca0120\VSCode\Tests\AssertionsTest
  passed 5 ms
  failed 3 ms
  skipped ➜ The MySQLi extension is not available. 0 ms
```

### Example: `collision`

```
Recca0120\VSCode\Tests\AssertionsTest
  ✅ passed 5 ms
  ❌ failed 3 ms
  ➖ skipped ➜ The MySQLi extension is not available. 0 ms
```

## Error Block

| Item | `progress` | `pretty` | `collision` |
|---|---|---|---|
| Title format | `1) FQCN::method` | `FAILED  FQCN > method` | `❌ FAILED  FQCN > method` |
| Message | Plain text | Plain text | Plain text |
| Diff header | `--- Expected` / `+++ Actual` / `@@ @@` | _(none)_ | _(none)_ |
| Diff body | Context lines + `-`/`+` | Context lines + `-`/`+` | Context lines + `-`/`+` |
| Source snippet | _(none)_ | `➜ 27 ▕ code` | `➜ 27 ▕ code` |
| Stack trace | `file:line` list | Numbered `1. file:line` | Numbered `1. file:line` |

All three presets share the same diff body format. The only difference is that `progress` prepends a unified diff header (`--- Expected` / `+++ Actual` / `@@ @@`), controlled by the `diffHeader` field.

### Diff: `progress` (with header)

```
--- Expected
+++ Actual
@@ @@
 Array &0 [
-    'a' => 'b',
+    'e' => 'f',
 ]
```

### Diff: `pretty` / `collision` (without header)

```
 Array &0 [
-    'a' => 'b',
+    'e' => 'f',
 ]
```

For scalar values:

```
- true
+ false
```

## Header (Version / Runtime / Configuration)

| Item | `progress` | `pretty` | `collision` |
|---|---|---|---|
| Version | `🚀 PHPUnit 11.0` | `PHPUnit 11.0` | `🚀 PHPUnit 11.0` |
| Runtime | `Runtime: PHP 8.3` | `Runtime: PHP 8.3` | `Runtime: PHP 8.3` |
| Configuration | `Configuration: phpunit.xml` | `Configuration: phpunit.xml` | `Configuration: phpunit.xml` |

These can be individually hidden by setting the format value to `false`.

## Configuration

In `settings.json`:

```jsonc
{
    // Preset: "progress" | "collision" | "pretty"
    "phpunit.output.preset": "collision",

    // Override individual format fields
    "phpunit.output.format": {
        "progress": "{status_dot}",
        "suiteStarted": false
    }
}
```
