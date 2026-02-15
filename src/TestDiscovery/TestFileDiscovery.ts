import { inject, injectable } from 'inversify';
import { type GlobPattern, RelativePattern, Uri, type WorkspaceFolder, workspace } from 'vscode';
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

        const { includes, excludes } = this.phpUnitXML.getPatterns(
            this.workspaceFolder.uri.fsPath,
        );

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

    async reloadAll(): Promise<void> {
        this.invalidateCache();
        const { pattern, exclude } = await this.getWorkspaceTestPattern();
        await this.discoverTestFiles(pattern, exclude);
    }

    async discoverTestFiles(pattern: GlobPattern, exclude: GlobPattern): Promise<void> {
        this.testCollection.reset();
        const files = await workspace.findFiles(pattern, exclude);
        await Promise.all(files.map((file) => this.testCollection.add(file)));
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
            this.testCollection.reset();
            await this.phpUnitXML.loadFile(configurationFile);
        } else {
            this.phpUnitXML.setRoot(this.workspaceFolder.uri.fsPath);
        }

        this.loaded = true;
    }
}
