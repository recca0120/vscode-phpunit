import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../../test-support/fixtures';
import { PHPUnitXML } from '../../PHPUnitXML';
import { TestParser } from '../../TestParser';
import { createDefaultAstParser } from './createDefaultAstParser';
import { initTreeSitter } from './TreeSitter/TreeSitterParser';

const code = `<?php

use PHPUnit\\Framework\\TestCase;

class ExampleTest extends TestCase
{
    public function test_example(): void
    {
        $this->assertTrue(true);
    }
}
`;

const parseIds = () => {
    const file = phpUnitProject('tests/ExampleTest.php');
    const testParser = new TestParser(
        new PHPUnitXML().setRoot(phpUnitProject('')),
        createDefaultAstParser(),
    );

    return testParser
        .parse(code, file)
        ?.tests.flatMap((test) => [test.id, ...(test.children ?? []).map((child) => child.id)]);
};

describe('createDefaultAstParser', () => {
    it('parses the tests before tree-sitter is initialised', () => {
        expect(parseIds()).toEqual(['Example', 'Example::Example']);
    });

    it('parses the tests once tree-sitter is initialised', async () => {
        await initTreeSitter();

        expect(parseIds()).toEqual(['Example', 'Example::Example']);
    });
});
