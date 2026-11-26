import { PHPUnitXML } from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativePattern, type WorkspaceFolder, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import type { Configuration } from '../Configuration';
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
        gatherFiles: vi.fn().mockReturnValue([]),
    } as unknown as TestCollection;
}

describe('TestFileDiscovery.getConfigFilePattern', () => {
    let collection: TestCollection;
    let phpUnitXML: PHPUnitXML;

    beforeEach(() => {
        collection = createMockCollection();
        phpUnitXML = new PHPUnitXML();
    });

    it('uses --configuration=xxx.xml when specified', () => {
        const configuration = createMockConfiguration(['--configuration=custom.xml']);
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(discovery.getConfigFilePattern()).toBe('{custom.xml,composer.json,composer.lock}');
    });

    it('uses -c xxx.xml (normalized to --configuration=) when specified', () => {
        const configuration = createMockConfiguration(['--configuration=my-phpunit.xml']);
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(discovery.getConfigFilePattern()).toBe(
            '{my-phpunit.xml,composer.json,composer.lock}',
        );
    });

    it('uses default pattern when no --configuration specified', () => {
        const configuration = createMockConfiguration();
        const discovery = new TestFileDiscovery(
            configuration,
            phpUnitXML,
            collection,
            workspaceFolder,
        );

        expect(discovery.getConfigFilePattern()).toBe(
            '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.json,composer.lock}',
        );
    });
});

describe('TestFileDiscovery.discoverTestFiles', () => {
    const discover = async (folderUri: URI, found: URI[]) => {
        const collection = createMockCollection();
        vi.mocked(workspace.findFiles).mockResolvedValueOnce(found);
        const discovery = new TestFileDiscovery(
            createMockConfiguration(),
            new PHPUnitXML(),
            collection,
            { uri: folderUri, name: 'proj', index: 0 } as WorkspaceFolder,
        );

        await discovery.discoverTestFiles(
            new RelativePattern(folderUri.fsPath, '**/*.php'),
            new RelativePattern(folderUri.fsPath, 'vendor/**'),
        );

        return vi.mocked(collection.add).mock.calls.map(([uri]) => uri.toString());
    };

    it('ignores files of a sibling folder sharing the same prefix', async () => {
        const added = await discover(URI.file('/a/proj'), [
            URI.file('/a/proj/tests/ATest.php'),
            URI.file('/a/project2/tests/BTest.php'),
        ]);

        expect(added).toEqual([URI.file('/a/proj/tests/ATest.php').toString()]);
    });
});
