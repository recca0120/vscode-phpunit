import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Psr4 = Record<string, string | string[]>;

export class ComposerAutoload {
    private prefixes: Promise<[string, string[]][]> | undefined;

    constructor(private root: () => string) {}

    async locate(fqn: string): Promise<string[]> {
        const prefixes = await this.loadPrefixes();

        return prefixes
            .filter(([prefix]) => fqn.startsWith(prefix))
            .flatMap(([prefix, dirs]) => {
                const relative = `${fqn.slice(prefix.length).replace(/\\/g, '/')}.php`;
                return dirs.map((dir) => join(this.root(), dir, relative));
            });
    }

    reset(): void {
        this.prefixes = undefined;
    }

    private loadPrefixes(): Promise<[string, string[]][]> {
        this.prefixes ??= this.readPrefixes();
        return this.prefixes;
    }

    private async readPrefixes(): Promise<[string, string[]][]> {
        const composer = await readFile(join(this.root(), 'composer.json'), 'utf8')
            .then((text) => JSON.parse(text))
            .catch(() => undefined);
        if (!composer) {
            return [];
        }

        const psr4: Psr4 = {
            ...(composer.autoload?.['psr-4'] ?? {}),
            ...(composer['autoload-dev']?.['psr-4'] ?? {}),
        };

        return Object.entries(psr4)
            .map(([prefix, dirs]): [string, string[]] => [prefix, [dirs].flat()])
            .sort(([a], [b]) => b.length - a.length);
    }
}
