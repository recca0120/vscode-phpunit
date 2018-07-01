import { Argument } from '../../src/phpunit/argument';
import { Filesystem, Factory as FilesystemFactory } from '../../src/filesystem';
import { projectPath } from '../helpers';

describe('Arguments Test', () => {
    it('it should get configuration and junit', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const args: Argument = new Argument(files).setDirectory(projectPath('tests')).setRoot(projectPath());
        spyOn(files, 'tmpfile').and.returnValue('foo.log');

        expect(await args.all()).toEqual(['-c', projectPath('phpunit.xml.dist'), '--log-junit', 'foo.log']);
    });

    it('it should not get configuration and junit', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const args: Argument = new Argument(files).setDirectory(projectPath('tests')).setRoot(projectPath());

        spyOn(files, 'tmpfile').and.returnValue('');
        spyOn(files, 'findUp').and.returnValue('');

        expect(await args.all()).toEqual([]);
    });

    it('it should not get configuration when property has -c', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const args: Argument = new Argument(files).setDirectory(projectPath('tests')).setRoot(projectPath());

        spyOn(files, 'tmpfile').and.returnValue('foo.log');

        args.set(['-c', 'foo']);
        expect(await args.all()).toEqual(['-c', 'foo', '--log-junit', 'foo.log']);

        args.set(['--configuration', 'bar']);
        expect(await args.all()).toEqual(['--configuration', 'bar', '--log-junit', 'foo.log']);
    });

    it('it should not get junit when property has --junit', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const args: Argument = new Argument(files).setDirectory(projectPath('tests')).setRoot(projectPath());

        args.set(['-c', 'foo', '--log-junit', 'bar']);
        expect(await args.all()).toEqual(['-c', 'foo', '--log-junit', 'bar']);
    });

    it('it should get property', async () => {
        const files: Filesystem = new FilesystemFactory().create();
        const args: Argument = new Argument(files).setDirectory(projectPath('tests')).setRoot(projectPath());

        spyOn(files, 'tmpfile').and.returnValue('foo.log');

        args.set(['--foo']);
        await args.all();

        expect(args.get('-c')).toEqual(projectPath('phpunit.xml.dist'));
        expect(args.get('--foo')).toBeTruthy();
        expect(args.get('--bar')).toBeFalsy();
    });
});
