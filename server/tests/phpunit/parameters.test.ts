import { Filesystem } from './../../src/filesystem';
import { Parameters } from './../../src/phpunit';
import { resolve } from 'path';

describe('Parameters Test', () => {
    it('it should set value', async () => {
        const files: Filesystem = new Filesystem();
        const parameters: Parameters = new Parameters(files);

        parameters.setCwd(resolve(__dirname, '../fixtures/project/tests'));
        parameters.setRoot(resolve(__dirname, '../fixtures/project'));

        spyOn(files, 'tmpfile').and.returnValue('tmpfile');

        parameters.set(['foo', 'bar']);

        expect(await parameters.all()).toEqual([
            'foo',
            'bar',
            '-c',
            resolve(__dirname, '../fixtures/project/phpunit.xml.dist'),
            '--log-junit',
            'tmpfile',
        ]);
    });

    it('it should get value', () => {
        const files: Filesystem = new Filesystem();
        const parameters: Parameters = new Parameters(files);

        spyOn(files, 'tmpfile').and.returnValue('tmpfile');

        parameters.set(['--foo', 'bar', '--buzz']);

        expect(parameters.get('--foo')).toEqual('bar');
        expect(parameters.get('--buzz')).toBeTruthy();
        expect(parameters.get('-f')).toBeFalsy();
    });

    it('it should exists', () => {
        const files: Filesystem = new Filesystem();
        const parameters: Parameters = new Parameters(files);

        spyOn(files, 'tmpfile').and.returnValue('tmpfile');

        parameters.set(['--foo', 'bar', '--buzz']);

        expect(parameters.exists('--foo')).toBeTruthy();
        expect(parameters.exists('--buzz')).toBeTruthy();
        expect(parameters.exists('-f')).toBeFalsy();
    });
});
