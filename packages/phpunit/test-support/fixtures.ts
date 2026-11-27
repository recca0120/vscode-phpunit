import { join } from 'node:path';

export const fixturePath = (uri: string) => join(__dirname, '..', 'tests', 'fixtures', uri);
export const phpUnitProject = (uri: string) => fixturePath(join('phpunit-stub', uri));
export const pestProject = (uri: string) => fixturePath(join('pest-stub', uri));
