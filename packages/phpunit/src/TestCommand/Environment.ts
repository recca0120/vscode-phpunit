import type { SpawnOptions } from 'node:child_process';
import { parseArgv } from '../Configuration/arguments';
import { CMD_TEMPLATE, CMD_TEMPLATE_QUOTED } from '../constants';
import type { PathMapper } from '../Path/PathMapper';
import type { Arg, Invocation } from './Invocation';

export type SpawnSpec = { runtime: string; args: string[]; options: SpawnOptions };

export interface Environment {
    readonly paths: PathMapper;
    launch(invocation: Invocation): SpawnSpec;
}

type TemplateVariables = {
    php: string;
    phpargs: string;
    phpunit: string;
    phpunitargs: string;
};

const RUNS_IN_SHELL = /^ssh|sh\s+-c/;
const variable = (name: string) => `\${${name}}`;
const intactArgToken = (index: number) => `__ARG_PLACEHOLDER_${index}__`;

export class CommandTemplateEnvironment implements Environment {
    private readonly runsInShell: boolean;

    constructor(
        private readonly template: string,
        readonly paths: PathMapper,
        private readonly resolveVariables: (text: string) => string = (text) => text,
    ) {
        this.runsInShell = RUNS_IN_SHELL.test(template);
    }

    launch(invocation: Invocation): SpawnSpec {
        const intactArgs = new Map<string, string>();
        const variables: TemplateVariables = {
            php: this.quoteIfNeeded(this.paths.toRemote(invocation.php)),
            phpargs: invocation.phpArgs.join(' '),
            phpunit: this.quoteIfNeeded(this.paths.toRemote(invocation.binary)),
            phpunitargs: invocation.args.map((arg) => this.renderArg(arg, intactArgs)).join(' '),
        };
        const command = this.fillTemplate(this.commandTemplate(variables), variables);
        const [runtime, ...args] = this.restoreIntactArgs(parseArgv(command), intactArgs)
            .filter((input) => !!input)
            .map((input) => this.resolveVariables(input).trim());

        return { runtime, args, options: invocation.options };
    }

    private renderArg(arg: Arg, intactArgs: Map<string, string>) {
        if (typeof arg === 'string') {
            return arg;
        }

        if ('intact' in arg) {
            return this.keepIntact(arg.intact, intactArgs);
        }

        const remote = this.paths.toRemote(arg.path);
        if (/^-.*\s/.test(remote) || (this.runsInShell && /\s/.test(remote))) {
            return this.keepIntact(remote, intactArgs);
        }

        return this.quoteIfNeeded(remote);
    }

    private keepIntact(value: string, intactArgs: Map<string, string>) {
        for (const [token, existing] of intactArgs) {
            if (existing === value) {
                return token;
            }
        }
        const token = intactArgToken(intactArgs.size);
        intactArgs.set(token, value);
        return token;
    }

    private commandTemplate(variables: TemplateVariables) {
        let template = this.template;
        if (!Object.keys(variables).some((name) => template.includes(variable(name)))) {
            template += this.runsInShell ? ` ${CMD_TEMPLATE_QUOTED}` : ` ${CMD_TEMPLATE}`;
        }
        template = template.replace(
            /('\${(php|phpargs|phpunit|phpunitargs)}.*?')/g,
            (_m, quoted: string) => quoted.replace(/^['"]|['"]$/g, '"'),
        );

        return variables.phpargs ? template : template.replace(/\s+\$\{phpargs\}/, '');
    }

    private fillTemplate(template: string, variables: TemplateVariables) {
        return Object.entries(variables).reduce(
            (command, [name, value]) => command.replace(variable(name), value.trim()),
            template.trim(),
        );
    }

    private restoreIntactArgs(tokens: string[], intactArgs: Map<string, string>) {
        if (intactArgs.size === 0) {
            return tokens;
        }

        return tokens.map((token) => {
            for (const [placeholder, arg] of intactArgs) {
                if (!token.includes(placeholder)) {
                    continue;
                }

                const value = this.runsInShell ? this.quoteForShell(arg) : arg;
                token = token.replace(placeholder, () => value);
            }

            return token;
        });
    }

    private quoteForShell(arg: string) {
        if (!arg.includes("'")) {
            return `'${arg}'`;
        }

        return `"${arg.replace(/"/g, '\\"')}"`;
    }

    private quoteIfNeeded(value: string) {
        const hasSpaces = value?.includes(' ');
        const isUnquoted = !/^["']/.test(value);
        const isPath = /[/\\]/.test(value);

        if (hasSpaces && isUnquoted && isPath) {
            return `"${value}"`;
        }
        return value;
    }
}
