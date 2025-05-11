import { readFileSync } from 'node:fs';
import { EOL, TeamcityEvent, TestFailed, TestFinished, TestIgnored, TestSuiteFinished } from '../../PHPUnit';
import { Printer } from './Printer';

export class CollisionPrinter extends Printer {
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
        ].filter((content) => content !== undefined).join(EOL);
    }

    private formatErrorTitle(result: TestFailed) {
        let [className, method] = result.id.split('::');
        method = method.replace(/^test_/, '');
        const [icon, message] = this.messages.get(result.event)!;

        return `${icon} ${message}  ${className} > ${method}`;
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
            this.formatExpected(result.expected!, '-'),
            this.formatExpected(result.actual!, '+'),
            ' ]',
            '',
        ].join(EOL);
    }

    private getFileContent(result: TestFailed) {
        let detail = result.details.find(({ file }) => file === result.file)!;
        if (result.details.length > 0) {
            detail = result.details[0];
        }

        if (!detail) {
            return undefined;
        }

        try {
            const data = readFileSync(this.phpUnitXML.path(detail.file), 'utf8');
            const position = Math.max(0, detail.line - 5);
            const lines = data.split(/\r\n|\n/).splice(position, 10).map((line, index) => {
                const currentPosition = position + index + 1;
                const prefix = detail.line === currentPosition ? '➜ ' : '  ';

                return `${prefix}${String(currentPosition).padStart(2, ' ')} ▕ ${line}`;
            });

            return [
                '',
                `at ${Printer.fileFormat(detail.file, detail.line)}`,
                ...lines,
            ].join(EOL);
        } catch (e) {
            return undefined;
        }
    }

    private formatDetails(result: TestFailed) {
        return EOL + result.details
            .map(({ file, line }) => Printer.fileFormat(file, line))
            .map((file, index) => `${index + 1}. ${file}`).join(EOL);
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