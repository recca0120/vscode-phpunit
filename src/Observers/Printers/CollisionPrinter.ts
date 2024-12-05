import { readFileSync } from 'node:fs';
import { EOL, TestFailed, TestFinished, TestResult, TestResultEvent, TestSuiteFinished } from '../../PHPUnit';
import { Printer } from './Printer';

export class CollisionPrinter extends Printer {
    private errors: TestResult[] = [];

    start() {
        super.start();
        this.errors = [];
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
    }

    testFinished(result: TestFinished | TestFailed) {
        const [icon] = this.messages.get(result.kind)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        if (result.kind === TestResultEvent.testFailed) {
            this.errors.push(result as any);
        }

        return `${icon} ${name} ${result.duration} ms`;
    }

    end() {
        return this.errors.map((result) => this.formatError(result)).join(EOL);
    }

    private formatError(result: TestResult) {
        return [
            '',
            this.formatErrorTitle(result),
            this.formatMessage(result),
            this.formatDiff(result),
            this.formatFile(result),
            this.formatDetails(result),
            '',
        ].filter((content) => content !== undefined).join(EOL);
    }

    private formatErrorTitle(result: TestResult) {
        let [className, method] = result.id.split('::');
        method = method.replace(/^test_/, '');
        const [icon, message] = this.messages.get(result.kind)!;

        return `${icon} ${message}  ${className} > ${method}`;
    }

    private formatMessage(result: TestResult) {
        return result.message;
    }

    private formatDiff(result: TestResult) {
        if (!result.expected || !result.actual) {
            return undefined;
        }

        return [
            ' Array &0 [',
            this.formatExpected(result.expected!, '-'),
            this.formatExpected(result.actual!, '+'),
            ' ]',
            '',
        ].join(EOL);
    }

    private formatFile(result: TestResult) {
        const detail = result.details.find(({ file }) => {
            return file === result.file;
        })!;

        if (!detail) {
            return undefined;
        }

        const data = readFileSync(detail.file, 'utf8');
        const position = detail.line - 5;
        const lines = data.split(/\r\n|\n/).splice(position, 10).map((line, index) => {
            const currentPosition = position + index + 1;
            const prefix = detail.line === currentPosition ? '➜ ' : '  ';

            return `${prefix}${String(currentPosition).padStart(2, ' ')} ▕ ${line}`;
        });

        return [
            '',
            `at ${detail.file}:${detail.line}`,
            ...lines,
        ].join(EOL);
    }

    private formatDetails(result: TestResult) {
        return EOL + result.details.map(({ file, line }, index) => {
            return `${index + 1} ${file}:${line}`;
        }).join(EOL);
    }

    private formatExpected(expected: string, prefix: string) {
        return expected
            .replace(/^Array\s+&0\s+[(\[]/, '')
            .replace(/[)\]]$/, '')
            .trim()
            .split(/\r\n|\n/)
            .map((text) => `${prefix}    ${text.trim()}`)
            .join(EOL);
    }
}