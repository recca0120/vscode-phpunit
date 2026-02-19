import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import type { Configuration } from '../Configuration';
import type { PHPUnitXML } from '../PHPUnit';
import type { TestCollection } from '../TestCollection';
import { TestFileDiscovery } from './TestFileDiscovery';

const root = '/workspace';
const workspaceFolder = { uri: { fsPath: root } } as WorkspaceFolder;

function createMockConfiguration(args: string[] = []) {
    return {
        getArguments: vi.fn().mockReturnValue(args),
        getConfigurationFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as Configuration;
}

function createMockCollection() {
    return {
        reset: vi.fn(),
        delete: vi.fn(),
        add: vi.fn().mockResolvedValue(undefined),
        clearMatcherCache: vi.fn(),
        getTrackedFiles: vi.fn().mockReturnValue([]),
    } as unknown as TestCollection;
}

describe('TestFileDiscovery.getConfigFilePattern', () => {
    let collection: TestCollection;
    let phpUnitXML: PHPUnitXML;

    beforeEach(() => {
        collection = createMockCollection();
        phpUnitXML = {
            loadFile: vi.fn(),
            setRoot: vi.fn(),
            getPatterns: vi.fn(),
        } as unknown as PHPUnitXML;
    });

    it('uses --configuration=xxx.xml when specified', async () => {
        const configuration = createMockConfiguration(['--configuration=custom.xml']);
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(await discovery.getConfigFilePattern()).toBe('{custom.xml,composer.lock}');
    });

    it('uses -c xxx.xml (normalized to --configuration=) when specified', async () => {
        const configuration = createMockConfiguration(['--configuration=my-phpunit.xml']);
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(await discovery.getConfigFilePattern()).toBe('{my-phpunit.xml,composer.lock}');
    });

    it('uses default pattern when no --configuration specified', async () => {
        const configuration = createMockConfiguration();
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(await discovery.getConfigFilePattern()).toBe(
            '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.lock}',
        );
    });
});
