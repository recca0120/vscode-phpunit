import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Psr4 = Record<string, string | string[]>;
type Composer = {
    autoload?: { 'psr-4'?: Psr4 };
    'autoload-dev'?: { 'psr-4'?: Psr4 };
};

export class ComposerAutoload {
    private composer: Promise<Composer | undefined> | undefined;

    constructor(private root: () => string) {}

    async locate(fqn: string): Promise<string[]> {
        const composer = await this.loadComposer();
        const psr4 = { ...composer?.autoload?.['psr-4'], ...composer?.['autoload-dev']?.['psr-4'] };

        return Object.entries(psr4)
            .sort(([a], [b]) => b.length - a.length)
            .filter(([prefix]) => fqn.startsWith(prefix))
            .flatMap(([prefix, dirs]) => {
                const relative = `${fqn.slice(prefix.length).replace(/\\/g, '/')}.php`;
                return [dirs].flat().map((dir) => join(this.root(), dir, relative));
            });
    }

    async devDirectories(): Promise<string[]> {
        const composer = await this.loadComposer();
        return Object.values(composer?.['autoload-dev']?.['psr-4'] ?? {}).flat();
    }

    clear(): void {
        this.composer = undefined;
    }

    private loadComposer(): Promise<Composer | undefined> {
        this.composer ??= readFile(join(this.root(), 'composer.json'), 'utf8')
            .then((text) => JSON.parse(text) as Composer)
            .catch(() => undefined);
        return this.composer;
    }
}
