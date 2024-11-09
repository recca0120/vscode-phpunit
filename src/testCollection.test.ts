import { phpUnitProject } from './phpunit/__tests__/utils';
import { PHPUnitXML } from './phpunit';
import { TestCollection } from './testCollection';
import { readFile } from 'node:fs/promises';
import * as vscode from 'vscode';


describe('TestCollection', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: vscode.Uri.file(root) };

    let phpUnitXML: PHPUnitXML;
    let collection: TestCollection;
    beforeEach(async () => {
        phpUnitXML = new PHPUnitXML(await readFile(phpUnitProject('phpunit.xml')));
    });

    it('add test', async () => {
        const includes: string[] = ['tests/**/*.php'];
        const excludes: string[] = ['**/.git/**', '**/node_modules/**'];

        const includePattern = new vscode.RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
        const excludePattern = new vscode.RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
        const files = await vscode.workspace.findFiles(includePattern, excludePattern);
        console.log(files);
    });
});