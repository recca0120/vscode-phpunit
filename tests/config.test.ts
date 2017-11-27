import { ConfigRepository } from '../src/config';

class FakeWorkspaceConfiguration {
    instance(namespace = 'phpunit') {
        return this;
    }

    get() {}

    update() {}

    has() {}
}

class FakeWorkspace {
    constructor(private configuration: FakeWorkspaceConfiguration) {}

    getConfiguration(namespace = 'phpunit') {
        return this.configuration.instance(namespace);
    }
}

describe('Config Test', () => {
    it('get', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'instance').and.callThrough();
        spyOn(configuration, 'get').and.returnValue('fake');

        expect(config.get('foo', 'bar', 'namespace')).toBe('fake');

        expect(workspace.getConfiguration).toHaveBeenCalledWith('namespace');
        expect(configuration.instance).toHaveBeenCalledWith('namespace');
        expect(configuration.get).toHaveBeenCalledWith('foo', 'bar');
    });

    it('put', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'instance').and.callThrough();
        spyOn(configuration, 'update').and.callThrough();

        expect(config.put('foo', 'bar', 'namespace')).toBe(config);

        expect(workspace.getConfiguration).toHaveBeenCalledWith('namespace');
        expect(configuration.instance).toHaveBeenCalledWith('namespace');
        expect(configuration.update).toHaveBeenCalledWith('foo', 'bar');
    });

    it('has', () => {
        const configuration = new FakeWorkspaceConfiguration();
        const workspace = new FakeWorkspace(configuration);
        const config = new ConfigRepository(workspace);

        spyOn(workspace, 'getConfiguration').and.callThrough();
        spyOn(configuration, 'instance').and.callThrough();
        spyOn(configuration, 'has').and.returnValue(true);

        expect(config.has('foo', 'namespace')).toBe(true);

        expect(workspace.getConfiguration).toHaveBeenCalledWith('namespace');
        expect(configuration.instance).toHaveBeenCalledWith('namespace');
        expect(configuration.has).toHaveBeenCalledWith('foo');
    });
});
