import type { ColorTheme } from './AnsiStyle';

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
    colors?: Partial<ColorTheme> | false;
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

export type PresetName = 'progress' | 'collision' | 'pretty';
