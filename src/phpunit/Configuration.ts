import * as yargsParser from 'yargs-parser';
import { Arguments } from 'yargs-parser';

export interface IConfiguration {
    get(key: string, defaultValue?: unknown): unknown | undefined;

    has(key: string): any;

    update(key: string, value: any): Promise<void>;

    getArguments(input?: string): Arguments;

    getConfigurationFile(): string | undefined;
}

interface ConfigurationItem {
    [p: string]: unknown;
}

export abstract class BaseConfiguration implements IConfiguration {
    abstract get(key: string, defaultValue?: unknown): unknown | undefined;

    abstract has(key: string): any;

    abstract update(key: string, value: any): Promise<void>;

    getArguments(input: string = ''): Arguments {
        const args = [input, ...(this.get('args', []) as string[])];

        return yargsParser(args.join(' ').trim(), {
            alias: { configuration: ['c'] },
            configuration: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'camel-case-expansion': false,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'boolean-negation': false,
            },
        });
    }

    getConfigurationFile(): string | undefined {
        const { _, ...argv } = this.getArguments();
        if (argv.hasOwnProperty('configuration')) {
            return argv.configuration;
        }

        return;
    }
}

export class Configuration extends BaseConfiguration {
    private items = new Map<string, unknown>();

    constructor(items: Map<string, unknown> | ConfigurationItem | undefined = undefined) {
        super();
        if (items instanceof Map) {
            this.items = items;
        } else if (!!items) {
            for (const x in items) {
                this.items.set(x, items[x]);
            }
        }
    }

    get(key: string, defaultValue?: unknown): unknown | undefined {
        return this.has(key) ? this.items.get(key) : defaultValue;
    }

    has(key: string) {
        return this.items.has(key);
    }

    async update(key: string, value: any) {
        this.items.set(key, value);
    }
}
