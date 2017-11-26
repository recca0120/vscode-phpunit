import { ConfigRepository } from '../src/config';

class FakeWorkspaceConfiguration {
    get() {}

    update() {}

    has() {}
}

class FakeWorkspace {
    constructor(private configuration: FakeWorkspaceConfiguration) {}

    getConfiguration() {
        return this.configuration;
    }
}

describe('Config Test', () => {
    it('get', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'get').and.returnValue('fake');

        expect(config.get('foo', 'bar')).toBe('fake');

        expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
        expect(configuration.get).toHaveBeenCalledWith('foo', 'bar');
    });

    it('put', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'update').and.callThrough();

        expect(config.put('foo', 'bar')).toBe(config);

        expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
        expect(configuration.update).toHaveBeenCalledWith('foo', 'bar');
    });

    it('has', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'has').and.returnValue(true);

        expect(config.has('foo')).toBe(true);

        expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit');
        expect(configuration.has).toHaveBeenCalledWith('foo');
    });
});
