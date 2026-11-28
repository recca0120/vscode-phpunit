import { dirname, isAbsolute, join, normalize, relative } from 'node:path';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { checkFileExists, findAsyncSequential, isInsideDirectory } from '../utils';
import { parseArgumentGroups, quoteInlineOptionValue } from './arguments';
import { BinaryDetector } from './BinaryDetector';

const CONFIGURATION_FILES = ['phpunit.xml', 'phpunit.xml.dist', 'phpunit.dist.xml'];
const COMPOSER_FILES = ['composer.json', 'composer.lock'];

const commonAncestor = (root: string, directory: string): string => {
    let base = root;
    while (!isInsideDirectory(base, directory) && dirname(base) !== base) {
        base = dirname(base);
    }

    return base;
};

const toPattern = (files: string[]) => `{${files.join(',')}}`;

interface ConfigurationItem {
    [p: string]: unknown;
}

export type ConfigurationFilesPattern = {
    base: string;
    pattern: string;
};

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

    configurationFilesPattern(root: string): ConfigurationFilesPattern {
        const configurationFile = this.configurationArgument(root);
        if (!configurationFile) {
            return { base: root, pattern: toPattern([...CONFIGURATION_FILES, ...COMPOSER_FILES]) };
        }

        const file = isAbsolute(configurationFile)
            ? configurationFile
            : join(root, configurationFile);
        const base = commonAncestor(root, dirname(file));
        const files = [file, ...COMPOSER_FILES.map((composerFile) => join(root, composerFile))].map(
            (watched) => relative(base, watched).replace(/\\/g, '/'),
        );

        return { base, pattern: toPattern(files) };
    }

    async findConfigurationFile(root: string = ''): Promise<string | undefined> {
        let files = CONFIGURATION_FILES.map((file) => join(root, file));

        const configurationFile = this.configurationArgument(root);
        if (configurationFile) {
            files = [normalize(configurationFile), join(root, configurationFile), ...files];
        }

        return await findAsyncSequential<string>(
            files,
            async (file) => await checkFileExists(file),
        );
    }

    private configurationArgument(root: string): string | undefined {
        return this.arguments()
            .find((parameter) => parameter.startsWith('--configuration'))
            ?.replace('--configuration=', '')
            .replace(VAR_WORKSPACE_FOLDER, root);
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
