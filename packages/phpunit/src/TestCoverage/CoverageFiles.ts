import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export class CoverageFiles {
    private readonly directory: string;

    constructor(cwd: string) {
        this.directory = join(cwd, '.phpunit.cache');
    }

    async prepare() {
        await mkdir(this.directory, { recursive: true });
    }

    allocate(index: number) {
        return join(this.directory, `coverage-${randomBytes(4).toString('hex')}-${index}.xml`);
    }
}
