import { injectable, injectFromBase } from 'inversify';
import {
    EOL,
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestSuiteFinished,
} from '../../PHPUnit';
import { OutputFormatter } from './OutputFormatter';
import { readSourceSnippet } from './SourceFileReader';

@injectable()
@injectFromBase()
export class CollisionPrinter extends OutputFormatter {
    private errors: TestFailed[] = [];

    start() {
        super.start();
        this.errors = [];
    }

    testFinished(result: TestFinished | TestFailed | TestIgnored) {
        const [icon] = this.messages.get(result.event)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        if (result.event === TeamcityEvent.testFailed) {
            this.errors.push(result as TestFailed);
        }

        if (result.event === TeamcityEvent.testIgnored) {
            return `${icon} ${name} ➜ ${(result as TestIgnored).message} ${result.duration} ms`;
        }

        return `${icon} ${name} ${result.duration} ms`;
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
    }

    end() {
        const error = this.errors.map((result) => this.formatError(result)).join(EOL);
        this.errors = [];

        return error;
    }

    private formatError(result: TestFailed) {
        return [
            '',
            this.formatErrorTitle(result),
            this.formatMessage(result),
            this.formatDiff(result),
            this.getFileContent(result),
            this.formatDetails(result),
            '',
        ]
            .filter((content) => content !== undefined)
            .join(EOL);
    }

    private formatErrorTitle(result: TestFailed) {
        const [icon, message] = this.messages.get(result.event)!;
        const parts = result.id.split('::');
        if (parts.length < 2) {
            return `${icon} ${message}  ${result.id}`;
        }

        const [className, method] = parts;
        return `${icon} ${message}  ${className} > ${method.replace(/^test_/, '')}`;
    }

    private formatMessage(result: TestFailed) {
        return result.message;
    }

    private formatDiff(result: TestFailed) {
        if (!result.expected || !result.actual) {
            return undefined;
        }

        return [
            ' Array &0 [',
            this.formatExpected(result.expected, '-'),
            this.formatExpected(result.actual, '+'),
            ' ]',
            '',
        ].join(EOL);
    }

    private getFileContent(result: TestFailed) {
        const detail = result.details.find(({ file }) => file === result.file)
            ?? result.details[0];

        if (!detail) {
            return undefined;
        }

        return readSourceSnippet(this.phpUnitXML.path(detail.file), detail.line)?.join(EOL);
    }

    private formatDetails(result: TestFailed) {
        return (
            EOL +
            result.details
                .map(({ file, line }) => OutputFormatter.fileFormat(file, line))
                .map((file, index) => `${index + 1}. ${file}`)
                .join(EOL)
        );
    }

    private formatExpected(expected: string, prefix: string) {
        return expected
            .replace(/^Array\s+&0\s+[([]/, '')
            .replace(/[)\]]$/, '')
            .trim()
            .split(/\r\n|\n/)
            .map((text) => `${prefix}    ${text.trim()}`)
            .join(EOL);
    }
}
