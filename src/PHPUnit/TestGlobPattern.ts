import { join, normalize, relative } from 'node:path';
import { URI } from 'vscode-uri';
import type { TestSuite } from './PHPUnitXML';

export class TestGlobPattern {
    private readonly relativePath: string;

    constructor(
        private root: string,
        private testPath: string,
        private items: string[] = [],
    ) {
        this.relativePath = TestGlobPattern.normalizePath(relative(this.root, this.testPath));
    }

    private static normalizePath(...paths: string[]) {
        return normalize(paths.join('/')).replace(/\\|\/+/g, '/');
    }

    push(item: TestSuite, extension: string = '') {
        const args = [this.relativePath, item.value];
        if (item.tag !== 'file') {
            args.push(`**/*${item.suffix ?? extension}`);
        }

        this.items.push(TestGlobPattern.normalizePath(...args));
    }

    toGlobPattern() {
        const arrayUnique = (items: (string | undefined)[]) => Array.from(new Set(items));
        const dirs = arrayUnique(
            this.items.map((item) => {
                return /^\*/.test(item) ? undefined : item.substring(0, item.indexOf('/'));
            }),
        );

        const legalDirs = dirs.filter((value) => !!value);
        const isSingle = dirs.length === 1 && legalDirs.length === 1;
        if (!isSingle) {
            return { uri: URI.file(this.root), pattern: `{${this.items}}` };
        }

        const dir = legalDirs[0];
        const items = this.items.map((item) => item.replace(new RegExp(`^${dir}[\\/]?`), ''));
        const pattern = `{${items}}`;

        return { uri: URI.file(join(this.root, dir!)), pattern };
    }
}
