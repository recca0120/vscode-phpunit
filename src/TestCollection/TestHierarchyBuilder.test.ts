import { expect } from '@jest/globals';
import { TestController, tests } from 'vscode';
import { TestParser } from '../PHPUnit';
import { phpUnitProject } from '../PHPUnit/__tests__/utils';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

function givenPhp(namespace: string, className: string, methods: string[]) {
    return `<?php
${namespace};

class ${className} extends TestCase 
{
${methods.map((name) => `
    public function ${name}() {
        $this->assertTrue(true);
    }
`).join('')}
}`;
}

describe('TestHierarchyBuilder', () => {
    const toTree = (items: any) => {
        const results = [] as any[];
        items.forEach((item: any) => {
            results.push({
                id: item.id,
                children: toTree(item.children),
            });
        });

        return results;
    };

    const parse = (files: { file: string, code: string }[]) => {
        files.forEach(({ file, code }) => {
            testParser.parse(code, phpUnitProject(file));
        });
    };

    let ctrl: TestController;
    let testParser: TestParser;
    let builder: TestHierarchyBuilder;
    beforeEach(() => {
        ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        testParser = new TestParser();
        builder = new TestHierarchyBuilder(testParser, ctrl);
    });

    it('has 1 node', () => {
        parse([{
            file: 'tests/AssertionsTest.php',
            code: givenPhp(
                'namespace Recca0120\\VSCode\\Tests',
                'AssertionsTest',
                ['test_passed', 'test_failed'],
            ),
        }]);

        builder.get();

        expect(toTree(ctrl.items)).toEqual([{
            id: 'namespace:Recca0120\\VSCode\\Tests',
            children: [{
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                children: [{
                    id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                    children: [],
                }, {
                    id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
                    children: [],
                }],
            },
            ],
        }]);
    });
});