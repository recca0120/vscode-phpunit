import * as Yargs from 'yargs';
import { ArgumentsCamelCase } from 'yargs';

class TeamcityParser {
    private readonly pattern = /^\s*#+teamcity/;
    private readonly yargs = Yargs();

    public parse(text: string) {
        text = text
            .trim()
            .replace(this.pattern, '')
            .replace(/^\[|\]$/g, '');

        return this.parseArguments(text)
            .then((argv) => this.toCommand(argv))
            .then((argv) => this.toArguments(argv));
    }

    private toArguments(argv: ArgumentsCamelCase<any>) {
        const [teamcity] = argv._;
        const { _, $0, ...args } = argv;

        return { teamcity, args };
    }

    private toCommand(argv: ArgumentsCamelCase<any>) {
        const [event, ...args] = argv._;
        const command = [event, ...args.map((parameter) => `--${parameter}`)].join(' ');

        return this.parseArguments(command);
    }

    private parseArguments(text: string): Promise<ArgumentsCamelCase<any>> {
        return new Promise((resolve) => {
            this.yargs.parse(text, (err: Error | undefined, argv: ArgumentsCamelCase<any>) => {
                if (err) {
                    throw err;
                }

                resolve(argv);
            });
        });
    }
}

export const teamcityParser = new TeamcityParser();
