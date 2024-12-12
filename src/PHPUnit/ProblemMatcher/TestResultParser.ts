import * as yargsParser from 'yargs-parser';
import { Arguments } from 'yargs-parser';
import { TestType } from '../TestParser';
import { converter } from '../TestParser/Converter';
import { escapeValue } from '../utils';
import { TestConfigurationParser } from './TestConfigurationParser';
import { TestProcessesParser } from './TestProcessesParser';
import { TestResultSummaryParser } from './TestResultSummaryParser';
import { TestRuntimeParser } from './TestRuntimeParser';
import { TestVersionParser } from './TestVersionParser';
import { TimeAndMemoryParser } from './TimeAndMemoryParser';
import { TestResult } from './types';
import { IParser } from './ValueParser';

export class TestResultParser implements IParser<TestResult | undefined> {
    private readonly pattern = new RegExp('^.*#+teamcity');
    private readonly filePattern = new RegExp('(s+)?(?<file>.+):(?<line>\\d+)$');
    private readonly parsers = [
        new TestVersionParser(),
        new TestRuntimeParser(),
        new TestConfigurationParser(),
        new TestProcessesParser(),
        new TimeAndMemoryParser(),
        new TestResultSummaryParser(),
    ];

    public is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TestResult | undefined {
        return this.is(text)
            ? this.doParse(text)
            : this.parsers.find((parser) => parser.is(text))?.parse(text);
    }

    private doParse(text: string) {
        text = text
            .trim()
            .replace(this.pattern, '')
            .replace(/^\[|]$/g, '');

        const argv = this.toTeamcityArgv(text);

        return {
            ...argv,
            ...this.parseLocationHint(argv),
            ...this.parseDetails(argv),
        } as TestResult;
    }

    private parseDetails(argv: Pick<Arguments, string | number>) {
        if (!('details' in argv)) {
            return {};
        }

        let message = argv.message;
        const details = this.parseFileAndLine(argv.message);
        details.forEach(({ file, line }) => {
            message = message.replace(`${file}:${line}`, '');
        });

        return {
            message: message.trim(),
            details: [...details, ...this.parseFileAndLine(argv.details)],
        };
    }

    private parseFileAndLine(text: string) {
        return text
            .trim()
            .split(/\r\n|\n/g)
            .filter((input: string) => input.match(this.filePattern))
            .map((input: string) => {
                const { file, line } = input.match(this.filePattern)!.groups!;

                return {
                    file: file.replace(/^(-)+|^at\s+/, '').trim(),
                    line: parseInt(line, 10),
                };
            });
    }

    private parseLocationHint(argv: Pick<Arguments, string | number>) {
        if (!argv.locationHint) {
            return {};
        }

        const locationHint = argv.locationHint;

        const isPest = locationHint.startsWith('pest_qn');

        if (!isPest) {
            const partsLocation = locationHint.replace(/^php_qn:\/\//, '').replace(/::\\/g, '::').split('::');
            const file = partsLocation.shift();
            const [classFQN, methodName] = partsLocation;

            const type = !methodName ? TestType.class : TestType.method;
            const id = converter.generateUniqueId({ type: type, classFQN, methodName });
            const testId = id.replace(/\swith\sdata\sset\s[#"].+$/, '');

            return { id, file, testId };
        }

        const matched = locationHint.match(/pest_qn:\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        let id;
        let testId;
        let file = '';
        if (matched) {
            const methodName = matched.groups['method'];
            if (methodName) {
                const classFQN = matched.groups['classFQN'];
                const type = !methodName ? TestType.class : TestType.method;
                id = converter.generateUniqueId({ type: type, classFQN, methodName });
                testId = id.replace(/\swith\sdata\sset\s[#"].+$/, '');
            } else {
                id = argv.name;
                testId = id;
            }
        } else {
            id = locationHint.replace(/pest_qn:\/\//, '').replace(/\\/g, '/');
            testId = id;
            file = id.split('::')[0];
        }

        return { id, testId, file };
    }

    private toTeamcityArgv(text: string): Pick<Arguments, string | number> {
        text = escapeValue.escapeSingleQuote(text) as string;
        text = escapeValue.unescape(text) as string;

        const [eventName, ...args] = yargsParser(text)._;
        const command = [
            `--event='${eventName}'`,
            ...args.map((parameter) => `--${parameter}`),
        ].join(' ');

        const { _, $0, ...argv } = yargsParser(command, {
            string: ['actual', 'expected'],
        });

        return escapeValue.unescapeSingleQuote(argv);
    }
}
