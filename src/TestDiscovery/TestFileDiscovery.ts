import { inject, injectable } from 'inversify';
import { type GlobPattern, RelativePattern, type WorkspaceFolder, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { Configuration } from '../Configuration';
import { PHPUnitXML, type TestGlobPattern } from '../PHPUnit';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';

export type WorkspaceTestPattern = {
    workspaceFolder: WorkspaceFolder;
    pattern: RelativePattern;
    exclude: RelativePattern;
};

@injectable()
export class TestFileDiscovery {
    private loaded = false;

    constructor(
        @inject(Configuration) private configuration: Configuration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
    ) {}

    async loadWorkspaceConfiguration(): Promise<void> {
        await this.ensureConfigLoaded();
    }

    async getWorkspaceTestPattern(): Promise<WorkspaceTestPattern> {
        await this.ensureConfigLoaded();

        const { includes, excludes } = this.phpUnitXML.getPatterns(this.workspaceFolder.uri.fsPath);

        const toRelativePattern = (pattern: TestGlobPattern) => {
            const { uri, pattern: glob } = pattern.toGlobPattern();
            return new RelativePattern(uri, glob);
        };

        return {
            workspaceFolder: this.workspaceFolder,
            pattern: toRelativePattern(includes),
            exclude: toRelativePattern(excludes),
        };
    }

    async getConfigFilePattern(): Promise<string> {
        const configArg = this.configuration
            .getArguments()
            .find((p) => p.startsWith('--configuration='));
        if (configArg) {
            const configFile = configArg.replace('--configuration=', '');
            return `{${configFile},composer.lock}`;
        }

        return '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.lock}';
    }

    async reloadAll(): Promise<void> {
        this.invalidateCache();
        this.testCollection.reset();
        const { pattern, exclude } = await this.getWorkspaceTestPattern();
        await this.discoverTestFiles(pattern, exclude);
    }

    async discoverTestFiles(pattern: GlobPattern, exclude: GlobPattern): Promise<void> {
        const newFiles = new Set(
            (await workspace.findFiles(pattern, exclude)).map((f) => f.toString()),
        );

        // Remove files that no longer exist
        for (const file of this.testCollection.getTrackedFiles()) {
            if (!newFiles.has(file.uri.toString())) {
                this.testCollection.delete(file.uri);
            }
        }

        // Add new files (already existing ones are skipped by add())
        await Promise.all([...newFiles].map((f) => this.testCollection.add(URI.parse(f))));
    }

    private invalidateCache(): void {
        this.loaded = false;
    }

    private async ensureConfigLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }

        const configurationFile = await this.configuration.getConfigurationFile(
            this.workspaceFolder.uri.fsPath,
        );
        if (configurationFile) {
            this.testCollection.clearMatcherCache();
            await this.phpUnitXML.loadFile(configurationFile);
        } else {
            this.phpUnitXML.setRoot(this.workspaceFolder.uri.fsPath);
        }

        this.loaded = true;
    }
}
