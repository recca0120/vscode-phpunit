import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { VAR_WORKSPACE_FOLDER } from '../constants';
import { Configuration } from './Configuration';

describe('Configuration Test', () => {
    it('key not exists', () => {
        const configuration = new Configuration();

        expect(configuration.get('foo')).toBeFalsy();
    });

    it('update key', async () => {
        const configuration = new Configuration();
        const key = 'foo';

        await configuration.update(key, 'bar');

        expect(configuration.get(key)).toEqual('bar');
    });

    it('get key', () => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const configuration = new Configuration({ foo: 'bar', 'foo.bar': 'foobar' });

        expect(configuration.get('foo')).toEqual('bar');
        expect(configuration.get('foo.bar')).toEqual('foobar');
    });

    it('get default value when key not exists', () => {
        const configuration = new Configuration();

        expect(configuration.get('foo', 'bar')).toEqual('bar');
    });

    it('constructor with map', () => {
        const configuration = new Configuration(new Map<string, string>([['foo', 'bar']]));

        expect(configuration.get('foo')).toEqual('bar');
        expect(configuration.has('buzz')).toBeFalsy();
    });

    it('constructor with json', () => {
        const configuration = new Configuration({ foo: 'bar' });

        expect(configuration.get('foo')).toEqual('bar');
        expect(configuration.has('buzz')).toBeFalsy();
    });

    it('get phpunit.xml', async () => {
        const configuration = new Configuration({});
        const root = phpUnitProject('');

        expect(await configuration.findConfigurationFile(root)).toEqual(join(root, 'phpunit.xml'));
    });

    it('resolves workspace folder placeholder in --configuration for discovery', async () => {
        const root = phpUnitProject('');
        const configuration = new Configuration({
            args: ['--configuration', `${VAR_WORKSPACE_FOLDER}/phpunit.xml`],
        });

        expect(await configuration.findConfigurationFile(root)).toEqual(join(root, 'phpunit.xml'));
    });

    it('can not get phpunit.xml', async () => {
        const configuration = new Configuration({ args: ['-c', 'src/phpunit.xml'] });

        expect(await configuration.findConfigurationFile()).toBeUndefined();
    });
});

describe('configurationFilesPattern', () => {
    const root = phpUnitProject('');

    it('watches the default configuration files and composer files of the folder', () => {
        const configuration = new Configuration({});

        expect(configuration.configurationFilesPattern(root)).toEqual({
            base: root,
            pattern: '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.json,composer.lock}',
        });
    });

    it('watches the file given with -c instead of the default configuration files', () => {
        const configuration = new Configuration({ args: ['-c', 'phpunit.custom.xml'] });

        expect(configuration.configurationFilesPattern(root)).toEqual({
            base: root,
            pattern: '{phpunit.custom.xml,composer.json,composer.lock}',
        });
    });

    it('resolves the workspace folder placeholder in --configuration', () => {
        const configuration = new Configuration({
            args: ['--configuration', `${VAR_WORKSPACE_FOLDER}/sub/phpunit.xml`],
        });

        expect(configuration.configurationFilesPattern(root)).toEqual({
            base: root,
            pattern: '{sub/phpunit.xml,composer.json,composer.lock}',
        });
    });

    it('watches from the common ancestor when the file given with -c is outside the folder', () => {
        const parent = dirname(root);
        const folder = basename(root);
        const configuration = new Configuration({
            args: ['-c', join(parent, 'shared', 'phpunit.xml')],
        });

        expect(configuration.configurationFilesPattern(root)).toEqual({
            base: parent,
            pattern: `{shared/phpunit.xml,${folder}/composer.json,${folder}/composer.lock}`,
        });
    });
});
