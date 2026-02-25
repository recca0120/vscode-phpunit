import stripAnsi from 'strip-ansi';
import type { PHPUnitXML } from '../Configuration/PHPUnitXML';
import {
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestProcesses,
    type TestResult,
    type TestResultSummary,
    type TestRuntime,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
    type TestVersion,
} from '../TestOutput/types';
import { EOL } from '../utils';
import { OutputBuffer } from './OutputBuffer';
import type { ErrorCategory, IconSet, PrinterFormat } from './PrinterConfig';
import { fileFormat, readSourceSnippet } from './SourceFileReader';

const PRINTED_OUTPUT_PATTERN =
    /(This test printed output|Test code or tested code printed unexpected output):(?<output>.*)/i;

export class Printer {
    private outputBuffer = new OutputBuffer();
    private command = '';
    private errors: TestFailed[] = [];
    private isDotMode: boolean;
    private isInlineError: boolean;

    constructor(
        private phpUnitXML: PHPUnitXML,
        private format: PrinterFormat,
    ) {
        this.isDotMode = format.finished.includes('{status_dot}');
        this.isInlineError = format.error.display === 'inline';
    }

    start(command?: string): string | undefined {
        this.outputBuffer.clear();
        this.command = command ?? '';
        this.errors = [];

        return command ? `${command}${EOL}` : undefined;
    }

    error(text: string) {
        return `${this.command}${EOL}❌ ${text}`;
    }

    testVersion(result: TestVersion) {
        if (this.format.version === false) {
            return undefined;
        }

        return this.line(
            this.interpolate(this.format.version, {
                ...this.infoVars('version', result),
                phpunit: result.phpunit,
                paratest: result.paratest,
            }),
        );
    }

    testProcesses(result: TestProcesses) {
        if (this.format.processes === false) {
            return undefined;
        }

        return this.line(
            this.interpolate(this.format.processes, {
                text: result.text,
                processes: result.processes,
            }),
        );
    }

    testRuntime(result: TestRuntime) {
        if (this.format.runtime === false) {
            return undefined;
        }

        return this.line(
            this.interpolate(this.format.runtime, {
                text: result.text,
                runtime: result.runtime,
            }),
        );
    }

    testConfiguration(result: TestConfiguration) {
        if (this.format.configuration === false) {
            return undefined;
        }

        return (
            this.line(
                this.interpolate(this.format.configuration, {
                    text: result.text,
                    configuration: result.configuration,
                }),
            ) + EOL
        );
    }

    testSuiteStarted(result: TestSuiteStarted): string | undefined {
        if (this.shouldSkipSuite(result.id) || this.format.suiteStarted === false) {
            return undefined;
        }

        return this.line(
            this.interpolate(this.format.suiteStarted, { id: result.id, name: result.name }),
        );
    }

    testStarted(result: TestStarted): string | undefined {
        this.outputBuffer.setCurrent(result.name);

        if (this.format.started === false) {
            return undefined;
        }

        return this.line(
            this.interpolate(this.format.started, { name: result.name, id: result.id }),
        );
    }

    testFinished(result: TestFinished | TestFailed) {
        const isFailed = result.event === TeamcityEvent.testFailed;

        if (isFailed && this.isInlineError) {
            const statusLine = this.line(
                this.interpolate(this.format.failed, this.resultVars(result, 'F')),
            );
            return statusLine + this.formatError(result as TestFailed, 1);
        }

        if (isFailed) {
            this.errors.push(result as TestFailed);
        }

        const statusDot = isFailed ? 'F' : '.';
        const template = isFailed ? this.format.failed : this.format.finished;
        const vars = this.resultVars(result, statusDot);
        const text = this.interpolate(template, vars);

        return this.isDotMode ? text : this.line(text);
    }

    testIgnored(result: TestIgnored): string | undefined {
        const statusDot = 'S';
        const [icon, label] = this.getIcon(result.event);
        const name = this.formatTestName(result);

        const text = this.interpolate(this.format.ignored, {
            status_dot: statusDot,
            icon,
            label,
            name,
            id: result.id,
            message: result.message,
            duration: String(result.duration),
        });

        return this.isDotMode ? text : this.line(text);
    }

    testSuiteFinished(result: TestSuiteFinished): string | undefined {
        if (this.shouldSkipSuite(result.id) || this.format.suiteFinished === false) {
            return undefined;
        }

        return this.line(this.interpolate(this.format.suiteFinished, {}));
    }

    timeAndMemory(result: TestDuration) {
        const errors = this.end();
        this.outputBuffer.setCurrent(undefined);
        const text = result.text.trim();

        if (this.format.duration === false) {
            return errors;
        }

        const formatted = this.line(
            this.interpolate(this.format.duration, {
                text,
                time: result.time,
                memory: result.memory,
            }),
        );

        return errors ? errors + formatted : formatted;
    }

    testResultSummary(result: TestResultSummary) {
        const errors = this.end();
        this.outputBuffer.setCurrent(undefined);
        const text = result.text.trim();

        if (this.format.resultSummary === false) {
            return errors;
        }

        const formatted = this.line(
            this.interpolate(this.format.resultSummary, {
                text,
                tests: result.tests != null ? String(result.tests) : undefined,
                assertions: result.assertions != null ? String(result.assertions) : undefined,
                errors: result.errors != null ? String(result.errors) : undefined,
                failures: result.failures != null ? String(result.failures) : undefined,
                warnings: result.warnings != null ? String(result.warnings) : undefined,
                skipped: result.skipped != null ? String(result.skipped) : undefined,
                incomplete: result.incomplete != null ? String(result.incomplete) : undefined,
                risky: result.risky != null ? String(result.risky) : undefined,
            }),
        );

        return errors ? errors + formatted : formatted;
    }

    end(): string | undefined {
        if (this.errors.length === 0) {
            return undefined;
        }

        const groups = this.format.error.groups;
        const joined = groups ? this.formatGrouped(groups) : this.formatFlat();
        this.errors = [];

        return this.isDotMode ? EOL + EOL + joined + EOL : joined + EOL;
    }

    close(): string | undefined {
        return this.end();
    }

    printedOutput(result?: TestResult) {
        const text = result ? this.getTestPrintedOutput(result) : this.outputBuffer.flush();

        return text ? `🟨 ${text}` : undefined;
    }

    append(line: string) {
        this.outputBuffer.append(stripAnsi(line));
    }

    private shouldSkipSuite(id?: string): boolean {
        return !id || id.includes('::');
    }

    private formatTestName(result: TestFinished | TestFailed | TestIgnored): string {
        return /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;
    }

    private getTestPrintedOutput(result: TestResult): string | undefined {
        const name = 'name' in result ? result.name : '';
        const message = 'message' in result ? (result as { message: string }).message : '';
        const matched = message.match(PRINTED_OUTPUT_PATTERN);

        return matched ? matched.groups?.output.trim() : this.outputBuffer.get(name);
    }

    private formatFlat(): string {
        return this.errors.map((result, index) => this.formatError(result, index + 1)).join(EOL);
    }

    private formatGrouped(groups: NonNullable<typeof this.format.error.groups>): string {
        const classified = new Map<ErrorCategory, TestFailed[]>();
        for (const result of this.errors) {
            const category = this.classify(result);
            const list = classified.get(category) ?? [];
            list.push(result);
            classified.set(category, list);
        }

        const sections: string[] = [];
        for (const { type, singular, plural } of groups.categories) {
            const items = classified.get(type);
            if (!items || items.length === 0) {
                continue;
            }
            const header = (items.length === 1 ? singular : plural).replace(
                '{count}',
                String(items.length),
            );
            const body = items.map((result, i) => this.formatError(result, i + 1)).join(EOL);
            sections.push(header + EOL + EOL + body);
        }

        return sections.join(EOL + EOL + groups.separator + EOL + EOL);
    }

    private classify(result: TestFailed): ErrorCategory {
        if (
            result.message === 'This test did not perform any assertions' &&
            result.details.length === 0
        ) {
            return 'risky';
        }
        if (result.message.startsWith('Failed asserting')) {
            return 'failure';
        }

        return 'error';
    }

    private formatError(result: TestFailed, index: number) {
        const vars = this.errorVars(result, index);
        const hasVars = /\{(\w+(?::\w+)?)\}/;

        const lines = this.format.error.template.split('\n').filter((template) => {
            return !hasVars.test(template) || this.interpolate(template, vars).trim() !== '';
        });

        return lines.map((template) => this.interpolate(template, vars)).join(EOL);
    }

    private errorVars(result: TestFailed, index: number): Record<string, string | undefined> {
        const [icon, label] = this.getIcon(result.event);
        const name = this.formatTestName(result);
        const parts = result.id.split('::');
        const segments = parts[0].split('\\');
        const className = parts.length >= 2 ? segments[segments.length - 1] : result.id;
        const fqcn = parts.length >= 2 ? parts[0] : result.id;

        return {
            index: String(index),
            icon,
            label,
            name,
            class: className,
            fqcn,
            id: result.id,
            duration: String(result.duration),
            message: result.message,
            diff: this.formatDiff(result),
            snippet: this.getSourceSnippet(result),
            details: this.formatDetails(result),
        };
    }

    private resultVars(
        result: TestFinished | TestFailed,
        statusDot: string,
    ): Record<string, string | undefined> {
        const [icon, label] = this.getIcon(result.event);
        const name = this.formatTestName(result);

        return {
            status_dot: statusDot,
            icon,
            label,
            name,
            id: result.id,
            duration: String(result.duration),
        };
    }

    private infoVars(
        key: keyof IconSet,
        result: { text: string },
    ): Record<string, string | undefined> {
        const [icon, label] = this.format.icons[key];

        return {
            icon,
            label,
            text: result.text,
        };
    }

    private static readonly eventIconMap: Record<string, keyof IconSet> = {
        [TeamcityEvent.testFinished]: 'passed',
        [TeamcityEvent.testFailed]: 'failed',
        [TeamcityEvent.testIgnored]: 'ignored',
    };

    private getIcon(event: TeamcityEvent): [string, string] {
        const key = Printer.eventIconMap[event] ?? 'version';

        return this.format.icons[key];
    }

    private line(text: string): string {
        return text + EOL;
    }

    private interpolate(template: string, vars: Record<string, string | undefined>): string {
        return template.replace(/\{(\w+(?::\w+)?)\}/g, (_match, key) => vars[key] ?? '');
    }

    private formatDiff(result: TestFailed): string | undefined {
        if (!result.expected || !result.actual) {
            return undefined;
        }

        const header = this.format.error.diff.header
            ? this.format.error.diff.header.split('\n')
            : [];

        const isArray = /^Array\s+&0\s+[([]/m.test(result.expected);
        if (!isArray) {
            return [...header, `- ${result.expected}`, `+ ${result.actual}`, ''].join(EOL);
        }

        return [
            ...header,
            ' Array &0 [',
            this.formatArrayEntries(result.expected, '-'),
            this.formatArrayEntries(result.actual, '+'),
            ' ]',
            '',
        ].join(EOL);
    }

    private formatArrayEntries(value: string, prefix: string) {
        return value
            .replace(/^Array\s+&0\s+[([]/, '')
            .replace(/[)\]]$/, '')
            .trim()
            .split(/\r\n|\n/)
            .map((text) => `${prefix}    ${text.trim()}`)
            .join(EOL);
    }

    private getSourceSnippet(result: TestFailed): string | undefined {
        const detail = result.details.find(({ file }) => file === result.file) ?? result.details[0];

        if (!detail) {
            return undefined;
        }

        return readSourceSnippet(this.phpUnitXML.path(detail.file), detail.line)?.join(EOL);
    }

    private formatDetails(result: TestFailed): string | undefined {
        if (result.details.length === 0) {
            return undefined;
        }

        return [
            '',
            ...result.details.map(({ file, line }, index) =>
                this.interpolate(this.format.error.detail.line, {
                    index: String(index + 1),
                    file: fileFormat(file, line),
                }),
            ),
        ].join(EOL);
    }
}
