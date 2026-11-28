import { beforeAll, describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import { pestProject } from '../../test-support/fixtures';
import { generateXML } from '../../test-support/phpUnitXml';
import { createDefaultAstParser } from '../Interpreter/AstParser/createDefaultAstParser';
import { initTreeSitter } from '../Interpreter/AstParser/TreeSitter/TreeSitterParser';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestParser } from '../TestParser';
import type { TestDefinition } from '../types';
import { TestIndex } from './TestIndex';

beforeAll(async () => initTreeSitter());

const fileWithOnly = pestProject('tests/OnlyProbe/AProbeTest.php');
const otherFile = pestProject('tests/OnlyProbe/BProbeTest.php');
const sources: Record<string, string> = {
    [fileWithOnly]: `<?php
test('a marked', fn () => expect(true)->toBeTrue())->only();
test('a plain', fn () => expect(true)->toBeTrue());
`,
    [otherFile]: `<?php
test('b plain', fn () => expect(true)->toBeTrue());
`,
};

const givenTestIndex = async () => {
    const phpUnitXML = new PHPUnitXML().load(
        generateXML(`<testsuites>
            <testsuite name="Probe">
                <directory suffix="Test.php">./tests</directory>
            </testsuite>
        </testsuites>`),
        pestProject('phpunit.xml'),
    );
    const testParser = new TestParser(
        phpUnitXML,
        createDefaultAstParser(),
        async (file) => sources[file],
    );
    const testIndex = new TestIndex(phpUnitXML, testParser);
    for (const file of Object.keys(sources)) {
        await testIndex.update(URI.file(file));
    }

    return testIndex;
};

const leaves = (tests: TestDefinition[]): TestDefinition[] =>
    tests.flatMap((test) => (test.children?.length ? leaves(test.children) : [test]));

const testsLabelled = (testIndex: TestIndex, labels: string[]) => {
    const all = [...testIndex.files()].flatMap((file) => leaves(file.tests));

    return labels.map((label) => all.find((test) => test.label === label) as TestDefinition);
};

const labelsOf = (tests: TestDefinition[]) => tests.map((test) => test.label);

describe('TestIndex notRunByOnly', () => {
    it('leaves out every unmarked test of the run, also those in other files', async () => {
        const testIndex = await givenTestIndex();
        const queued = testsLabelled(testIndex, ['a marked', 'a plain', 'b plain']);

        expect(labelsOf(testIndex.notRunByOnly(queued))).toEqual(['a plain', 'b plain']);
    });

    it('leaves out an unmarked test run on its own from a file with only()', async () => {
        const testIndex = await givenTestIndex();
        const queued = testsLabelled(testIndex, ['a plain']);

        expect(labelsOf(testIndex.notRunByOnly(queued))).toEqual(['a plain']);
    });

    it('leaves out nothing when no file of the run has only()', async () => {
        const testIndex = await givenTestIndex();
        const queued = testsLabelled(testIndex, ['b plain']);

        expect(testIndex.notRunByOnly(queued)).toEqual([]);
    });
});
