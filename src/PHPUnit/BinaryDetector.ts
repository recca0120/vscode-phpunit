import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { injectable } from 'inversify';

@injectable()
export class BinaryDetector {
    constructor(private cwd: string = '') {}

    detect(): string {
        try {
            const content = readFileSync(join(this.cwd, 'composer.json'), 'utf-8');
            const composer = JSON.parse(content);
            const deps = { ...composer.require, ...composer['require-dev'] };
            if ('pestphp/pest' in deps) {
                return 'vendor/bin/pest';
            }
        } catch {
            // composer.json not found or not parseable
        }

        return 'vendor/bin/phpunit';
    }
}
