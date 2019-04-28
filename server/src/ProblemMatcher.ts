import { Location } from 'vscode-languageserver-protocol';
import files, { Filesystem } from './Filesystem';

export enum ProblemStatus {
    UNKNOWN,
    PASSED,
    SKIPPED,
    INCOMPLETE,
    FAILURE,
    ERROR,
    RISKY,
    WARNING,
}

export interface Problem {
    name: string;
    namespace: string;
    class: string;
    method: string;
    status: ProblemStatus;
    message: string;
    files: Location[];
}

export class ProblemMatcher {
    private problemStatus = [
        'UNKNOWN',
        'PASSED',
        'SKIPPED',
        'INCOMPLETE',
        'FAILURE',
        'ERROR',
        'RISKY',
        'WARNING',
    ].join('|');

    constructor(private _files: Filesystem = files) {}

    async parse(response: string): Promise<Problem[]> {
        const lines: string[] = response.split(/\r\n|\r|\n/g);

        const problems: any[] = [];

        let nameMatch: RegExpMatchArray;
        let classMatch: RegExpMatchArray;
        let messageMatch: RegExpMatchArray;
        let fileMatch: RegExpMatchArray;
        let statusMatch: RegExpMatchArray;
        let current = -1;
        let status = this.asStatus('failure') as ProblemStatus;

        for (const line of lines) {
            statusMatch = line.match(
                new RegExp(
                    `There (was|were) \\d+ (${
                        this.problemStatus
                    })(s?)( test?)(:?)`,
                    'i'
                )
            );

            if (statusMatch) {
                status = this.asStatus(statusMatch[2].trim()) as ProblemStatus;
            }

            nameMatch = line.match(/^\d+\)\s(.*)$/);

            if (nameMatch) {
                current++;
                classMatch = line.match(/([^:\s]+)::([^\s]+)/);
                const namespace = classMatch[1]
                    .substr(0, classMatch[0].lastIndexOf('\\'))
                    .replace(/\\$/, '');

                const clazz = classMatch[1]
                    .substr(classMatch[0].lastIndexOf('\\'))
                    .replace(/^\\/, '');

                problems.push({
                    name: nameMatch[1],
                    namespace: namespace,
                    class: clazz,
                    method: classMatch[2],
                    status: status,
                    message: '',
                    files: [],
                });

                continue;
            }

            if (current === -1) {
                continue;
            }

            const problem = problems[current];

            fileMatch = line.match(/^(.*):(\d+)/);
            if (fileMatch) {
                const uri = this._files.asUri(fileMatch[1]);
                const lineNumber = parseInt(fileMatch[2]) - 1;
                problem.files.push(
                    await this._files.lineLocation(uri, lineNumber)
                );

                continue;
            }

            messageMatch = line.match(/(^(.*)$)/);
            if (problem.files.length === 0) {
                problem.message += `${messageMatch[0]}\n`;
            }
        }

        return problems;
    }

    private asStatus(status: string): ProblemStatus {
        for (const name in ProblemStatus) {
            if (name.toLowerCase() === status) {
                return ProblemStatus[name] as any;
            }
        }

        return ProblemStatus.ERROR;
    }
}
