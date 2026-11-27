import type { ColorTheme } from './AnsiStyle';
import type { PresetName, PrinterFormat } from './PrinterFormat';

export const PRESET_PROGRESS: PrinterFormat = {
    icons: {
        version: ['🚀', 'STARTED'],
        passed: ['', 'PASSED'],
        failed: ['', 'FAILED'],
        ignored: ['', 'IGNORED'],
    },
    colors: {},
    version: '{icon} {text}',
    runtime: '{text}',
    configuration: '{text}',
    processes: '{text}',
    suiteStarted: false,
    suiteFinished: false,
    started: false,
    finished: '{status_dot}',
    failed: '{status_dot}',
    ignored: '{status_dot}',
    duration: '{text}',
    resultSummary: '{text}',
    error: {
        display: 'deferred',
        template: '{index}) {id}\n{message}\n{diff}\n{details}',
        diff: { header: '--- Expected\n+++ Actual\n@@ @@' },
        detail: { line: '{file}' },
        groups: {
            separator: '--',
            categories: [
                {
                    type: 'error',
                    singular: 'There was {count} error:',
                    plural: 'There were {count} errors:',
                },
                {
                    type: 'failure',
                    singular: 'There was {count} failure:',
                    plural: 'There were {count} failures:',
                },
                {
                    type: 'risky',
                    singular: 'There was {count} risky test:',
                    plural: 'There were {count} risky tests:',
                },
            ],
        },
    },
};

export const PRESET_COLLISION: PrinterFormat = {
    icons: {
        version: ['🚀', 'STARTED'],
        passed: ['✓', 'PASS'],
        failed: ['⨯', 'FAILED'],
        ignored: ['-', 'WARN'],
    },
    colors: {},
    version: '{icon} {text}',
    runtime: '{text}',
    configuration: '{text}',
    processes: '{text}',
    suiteStarted: '{label} {id}',
    suiteFinished: '',
    started: false,
    finished: '  {icon} {name} {duration} ms',
    failed: '  {icon} {name} {duration} ms',
    ignored: '  {icon} {name} ➜ {message} {duration} ms',
    duration: 'Duration: {time}',
    resultSummary: '{summary}',
    error: {
        display: 'deferred',
        template:
            '{separator}\n{icon} {label}  {class} > {name}\n{message}\n{diff}\n{snippet}\n{details}\n',
        diff: { header: false },
        detail: { line: '{index}   {file}' },
    },
};

export const PRESET_PRETTY: PrinterFormat = {
    icons: {
        version: ['', 'STARTED'],
        passed: ['', 'PASSED'],
        failed: ['', 'FAILED'],
        ignored: ['', 'IGNORED'],
    },
    colors: {},
    version: '{text}',
    runtime: '{text}',
    configuration: '{text}',
    processes: '{text}',
    suiteStarted: '{id}',
    suiteFinished: '',
    started: false,
    finished: '  {name} {duration} ms',
    failed: '  {name} {duration} ms',
    ignored: '  {name} ➜ {message} {duration} ms',
    duration: 'Duration: {time}',
    resultSummary: '{summary}',
    error: {
        display: 'deferred',
        template:
            '{separator}\n{label}  {class} > {name}\n{message}\n{diff}\n{snippet}\n{details}\n',
        diff: { header: false },
        detail: { line: '{index}   {file}' },
    },
};

export function resolveFormat(
    preset: PresetName,
    overrides?: Partial<PrinterFormat>,
): PrinterFormat {
    const presets: Record<string, PrinterFormat> = {
        progress: PRESET_PROGRESS,
        collision: PRESET_COLLISION,
        pretty: PRESET_PRETTY,
    };
    const base = presets[preset] ?? PRESET_COLLISION;

    if (!overrides) {
        return base;
    }

    const { icons, error, colors, ...rest } = overrides;

    return {
        ...base,
        ...rest,
        icons: icons ? { ...base.icons, ...icons } : base.icons,
        colors:
            colors === false
                ? false
                : ({
                      ...((base.colors || {}) as object),
                      ...((colors || {}) as object),
                  } as Partial<ColorTheme>),
        error: error
            ? {
                  display: error.display ?? base.error.display,
                  template: error.template ?? base.error.template,
                  diff: error.diff ? { ...base.error.diff, ...error.diff } : base.error.diff,
                  detail: error.detail
                      ? { ...base.error.detail, ...error.detail }
                      : base.error.detail,
                  groups: error.groups !== undefined ? error.groups : base.error.groups,
              }
            : base.error,
    };
}
