import { join } from 'node:path';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import {
    checkFileExists,
    findAsyncSequential,
    parseArgumentGroups,
    quoteInlineOptionValue,
} from '../utils';
import { BinaryDetector } from './BinaryDetector';

interface ConfigurationItem {
    [p: string]: unknown;
}

export interface IConfiguration {
    get(key: string, defaultValue?: unknown): unknown | undefined;

    has(key: string): boolean;

    update(key: string, value: unknown): Promise<void>;

    arguments(input: string): string[];

    findConfigurationFile(root?: string): Promise<string | undefined>;
}

export abstract class BaseConfiguration implements IConfiguration {
    constructor(protected binaryDetector: BinaryDetector = new BinaryDetector()) {}

    get(key: string, defaultValue?: unknown): unknown | undefined {
        if (key === 'phpunit' && !this.has('phpunit')) {
            return this.binaryDetector.detect();
        }

        return this.resolve(key, defaultValue);
    }

    abstract resolve(key: string, defaultValue?: unknown): unknown | undefined;

    abstract has(key: string): boolean;

    abstract update(key: string, value: unknown): Promise<void>;

    arguments(input: string = ''): string[] {
        const args = (this.get('args', []) as string[]).map(quoteInlineOptionValue);

        return parseArgumentGroups([args, [input]], ['teamcity', 'colors', 'testdox', 'c']);
    }

    async findConfigurationFile(root: string = ''): Promise<string | undefined> {
        let files = ['phpunit.xml', 'phpunit.xml.dist', 'phpunit.dist.xml'].map((file) =>
            join(root, file),
        );

        const configuration = this.arguments().find((parameter: string) =>
            parameter.startsWith('--configuration'),
        );
        if (configuration) {
            const configurationFile = configuration
                .replace('--configuration=', '')
                .replace(VAR_WORKSPACE_FOLDER, root);
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
