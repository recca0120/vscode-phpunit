import { join } from 'node:path';
import { BinaryDetector } from './BinaryDetector';
import { checkFileExists, findAsyncSequential, parseArguments } from './utils';

interface ConfigurationItem {
    [p: string]: unknown;
}

export interface IConfiguration {
    get(key: string, defaultValue?: unknown): unknown | undefined;

    has(key: string): boolean;

    update(key: string, value: unknown): Promise<void>;

    getArguments(input: string): string[];

    getConfigurationFile(root?: string): Promise<string | undefined>;
}

export abstract class BaseConfiguration implements IConfiguration {
    protected binaryDetector: BinaryDetector = new BinaryDetector();

    get(key: string, defaultValue?: unknown): unknown | undefined {
        if (key === 'phpunit' && !this.has('phpunit')) {
            return this.binaryDetector.detect();
        }

        return this.resolve(key, defaultValue);
    }

    abstract resolve(key: string, defaultValue?: unknown): unknown | undefined;

    abstract has(key: string): boolean;

    abstract update(key: string, value: unknown): Promise<void>;

    getArguments(input: string = ''): string[] {
        const parameters = [...(this.get('args', []) as string[]), input];

        return parseArguments(parameters, ['teamcity', 'colors', 'testdox', 'c']);
    }

    async getConfigurationFile(root: string = ''): Promise<string | undefined> {
        let files = ['phpunit.xml', 'phpunit.xml.dist', 'phpunit.dist.xml'].map((file) =>
            join(root, file),
        );

        const configuration = this.getArguments().find((parameter: string) =>
            parameter.startsWith('--configuration'),
        );
        if (configuration) {
            const configurationFile = configuration.replace('--configuration=', '');
            files = [configurationFile, join(root, configurationFile), ...files];
        }

        return await findAsyncSequential<string>(
            files,
            async (file) => await checkFileExists(file),
        );
    }
}

export class Configuration extends BaseConfiguration {
    private items = new Map<string, unknown>();

    constructor(items: Map<string, unknown> | ConfigurationItem | undefined = undefined) {
        super();
        if (!items) {
            return;
        }

        if (items instanceof Map) {
            this.items = items;
            return;
        }

        for (const x in items) {
            this.items.set(x, items[x]);
        }
    }

    resolve(key: string, defaultValue?: unknown): unknown | undefined {
        return this.has(key) ? this.items.get(key) : defaultValue;
    }

    has(key: string) {
        return this.items.has(key);
    }

    async update(key: string, value: unknown) {
        this.items.set(key, value);
    }
}
