import { join } from 'node:path';
import { checkFileExists, findAsyncSequential, parseArguments } from './utils';

interface ConfigurationItem {
    [p: string]: unknown;
}

export interface IConfiguration {
    get(key: string, defaultValue?: unknown): unknown | undefined;

    has(key: string): any;

    update(key: string, value: any): Promise<void>;

    getArguments(input: string): string[];

    getConfigurationFile(): Promise<string | undefined>;
}

export abstract class BaseConfiguration implements IConfiguration {
    abstract get(key: string, defaultValue?: unknown): unknown | undefined;

    abstract has(key: string): any;

    abstract update(key: string, value: any): Promise<void>;

    getArguments(input: string = ''): string[] {
        const parameters = [input, ...(this.get('args', []) as string[])];

        return parseArguments(parameters, ['teamcity', 'colors', 'testdox', 'c']);
    }

    async getConfigurationFile(root: string = ''): Promise<string | undefined> {
        let files = ['phpunit.xml', 'phpunit.xml.dist', 'phpunit.dist.xml'].map((file) => join(root, file));

        const configuration = this.getArguments().find((parameter: string) => parameter.startsWith('--configuration'));
        if (configuration) {
            const configurationFile = configuration.replace('--configuration=', '');
            files = [configurationFile, join(root, configurationFile), ...files];
        }

        return await findAsyncSequential<string>(files, async (file) => await checkFileExists(file));
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
