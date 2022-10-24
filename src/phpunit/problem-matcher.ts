import * as parser from 'yargs-parser';
import { Arguments } from 'yargs-parser';

class TeamcityParser {
    private readonly pattern = /^\s*#+teamcity/;

    public parse(text: string) {
        text = text
            .trim()
            .replace(this.pattern, '')
            .replace(/^\[|\]$/g, '');

        const { _, $0, ...argv } = this.toTeamcityArgv(text);

        return { ...argv };
    }

    private toTeamcityArgv(text: string) {
        const [teamcity, ...args] = this.parseArgv(text)._;
        const command = [
            `--teamcity='${teamcity}'`,
            ...args.map((parameter) => `--${parameter}`),
        ].join(' ');

        return this.parseArgv(command);
    }

    private parseArgv(text: string): Arguments {
        return parser(text);
    }
}

export const teamcityParser = new TeamcityParser();
