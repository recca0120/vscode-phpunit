import {
    EOL,
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestSuiteFinished,
} from '@vscode-phpunit/phpunit';
import { OutputFormatter } from './OutputFormatter';

export class PrettyPrinter extends OutputFormatter {
    private static readonly decorated = {
        default: '│',
        start: '┐',
        message: '├',
        diff: '┊',
        trace: '╵',
        last: '┴',
    } as const;

    testFinished(result: TestFinished | TestFailed) {
        const line = this.formatTestResult(result);
        if (!line) {
            return '';
        }

        if (result.event === TeamcityEvent.testFailed) {
            return [line, this.formatError(result as TestFailed)].join(EOL);
        }

        return line;
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return '';
    }

    private formatError(result: TestFailed) {
        return [
            this.formatMessage(PrettyPrinter.decorated.start),
            this.formatMessage(PrettyPrinter.decorated.message, result.message),
            this.formatDiff(result),
            this.formatMessage(PrettyPrinter.decorated.default),
            this.formatDetails(result),
            this.formatMessage(PrettyPrinter.decorated.last),
        ].join('');
    }

    private formatDetails(result: TestFailed) {
        return result.details
            .map(({ file, line }) => OutputFormatter.fileFormat(file, line))
            .reduce(
                (msg, file) => msg + this.formatMessage(PrettyPrinter.decorated.default, file),
                '',
            );
    }

    private formatDiff(result: TestFailed) {
        if (!(result.expected && result.actual)) {
            return '';
        }

        return [
            this.formatMessage(PrettyPrinter.decorated.diff, `${result.expected}`, '---·Expected '),
            this.formatMessage(PrettyPrinter.decorated.diff, `${result.actual}`, '+++·Actual '),
        ].join('');
    }

    private formatMessage(decorated: string, message: string = '', prefix = '') {
        const indent = '     ';

        return (
            message
                .split(/\r\n|\n/g)
                .map((line, index) => `${indent}${decorated} ${index === 0 ? prefix : ''}${line}`)
                .join(EOL) + EOL
        );
    }
}
