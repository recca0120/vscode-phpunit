export interface IconSet {
    version: [icon: string, label: string];
    passed: [icon: string, label: string];
    failed: [icon: string, label: string];
    ignored: [icon: string, label: string];
}

export type ErrorCategory = 'error' | 'failure' | 'risky';

export interface ErrorGroupCategory {
    type: ErrorCategory;
    singular: string;
    plural: string;
}

export interface ErrorGroupConfig {
    separator: string;
    categories: ErrorGroupCategory[];
}

export interface ErrorFormat {
    display: 'deferred' | 'inline';
    template: string;
    diff: { header: string | false };
    detail: { line: string };
    groups?: ErrorGroupConfig;
}

export interface PrinterFormat {
    icons: IconSet;
    version: string | false;
    runtime: string | false;
    configuration: string | false;
    processes: string | false;
    suiteStarted: string | false;
    suiteFinished: string | false;
    started: string | false;
    finished: string;
    failed: string;
    ignored: string;
    duration: string | false;
    resultSummary: string | false;
    error: ErrorFormat;
}

export const PRESET_PROGRESS: PrinterFormat = {
    icons: {
        version: ['🚀', 'STARTED'],
        passed: ['', 'PASSED'],
        failed: ['', 'FAILED'],
        ignored: ['', 'IGNORED'],
    },
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
        passed: ['✅', 'PASSED'],
        failed: ['❌', 'FAILED'],
        ignored: ['➖', 'IGNORED'],
    },
    version: '{icon} {text}',
    runtime: '{text}',
    configuration: '{text}',
    processes: '{text}',
    suiteStarted: '{id}',
    suiteFinished: '',
    started: false,
    finished: '  {icon} {name} {duration} ms',
    failed: '  {icon} {name} {duration} ms',
    ignored: '  {icon} {name} ➜ {message} {duration} ms',
    duration: '{text}',
    resultSummary: '{text}',
    error: {
        display: 'deferred',
        template: '\n  {icon} {label}  {fqcn} > {name}\n{message}\n{diff}\n{snippet}\n{details}\n',
        diff: { header: false },
        detail: { line: '{index}. {file}' },
    },
};

export const PRESET_PRETTY: PrinterFormat = {
    icons: {
        version: ['', 'STARTED'],
        passed: ['', 'PASSED'],
        failed: ['', 'FAILED'],
        ignored: ['', 'IGNORED'],
    },
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
    duration: '{text}',
    resultSummary: '{text}',
    error: {
        display: 'deferred',
        template: '\n  {label}  {fqcn} > {name}\n{message}\n{diff}\n{snippet}\n{details}\n',
        diff: { header: false },
        detail: { line: '{index}. {file}' },
    },
};

export function resolveFormat(
    preset: 'progress' | 'collision' | 'pretty',
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

    const { icons, error, ...rest } = overrides;

    return {
        ...base,
        ...rest,
        icons: icons ? { ...base.icons, ...icons } : base.icons,
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
