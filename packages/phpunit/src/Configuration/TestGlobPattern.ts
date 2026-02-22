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
        const hasWildcard = this.items.some((item) => /^\*/.test(item));
        const dirs = Array.from(
            new Set(
                this.items
                    .filter((item) => !/^\*/.test(item))
                    .map((item) => item.substring(0, item.indexOf('/'))),
            ),
        );

        if (hasWildcard || dirs.length !== 1 || !dirs[0]) {
            return { uri: URI.file(this.root), pattern: `{${this.items}}` };
        }

        const dir = dirs[0];
        const items = this.items.map((item) => item.replace(new RegExp(`^${dir}[\\/]?`), ''));

        return { uri: URI.file(join(this.root, dir)), pattern: `{${items}}` };
    }
}
