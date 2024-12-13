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
    let ctrl: TestController;
    let testParser: TestParser;
    let builder: TestHierarchyBuilder;

    const toTree = (items: any) => {
        const results = [] as any[];
        items.forEach((item: any) => {
            results.push({
                id: item.id,
                label: item.label,
                children: toTree(item.children),
            });
        });

        return results;
    };

    const givenCodes = (files: { file: string, code: string }[]) => {
        files.forEach(({ file, code }) => {
            testParser.parse(code, phpUnitProject(file));
        });

        builder.get();
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        testParser = new TestParser();
        builder = new TestHierarchyBuilder(testParser, ctrl);
    });

    it('no namespace', () => {
        givenCodes([{
            file: 'tests/AssertionsTest.php',
            code: givenPhp(
                '',
                'AssertionsTest',
                ['test_passed', 'test_failed'],
            ),
        }]);

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'Assertions',
                label: '$(symbol-class) AssertionsTest',
                children: [
                    {
                        id: 'Assertions::Passed',
                        label: '$(symbol-method) test_passed',
                        children: [],
                    },
                    {
                        id: 'Assertions::Failed',
                        label: '$(symbol-method) test_failed',
                        children: [],
                    },
                ],
            }
            ,
        ]);
    });

    it('nested namespace', () => {
        givenCodes([{
            file: 'tests/AssertionsTest.php',
            code: givenPhp(
                'namespace Recca0120\\VSCode\\Tests',
                'AssertionsTest',
                ['test_passed'],
            ),
        }]);

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'namespace:VSCode (Recca0120\\VSCode)',
                label: '$(symbol-namespace) Recca0120\\VSCode',
                children: [
                    {
                        id: 'namespace:Tests (Recca0120\\VSCode\\Tests)',
                        label: '$(symbol-namespace) Tests',
                        children: [
                            {
                                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)',
                                label: '$(symbol-class) AssertionsTest',
                                children: [
                                    {
                                        id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Passed',
                                        label: '$(symbol-method) test_passed',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ])
        ;
    });

    it('sibling namespace', () => {
        givenCodes([{
            file: 'tests/AssertionsTest.php',
            code: givenPhp(
                'namespace Recca0120\\VSCode\\Tests',
                'AssertionsTest',
                ['test_passed'],
            ),
        }, {
            file: 'tests/Assertions2Test.php',
            code: givenPhp(
                'namespace Recca0120\\VSCode\\Tests',
                'Assertions2Test',
                ['test_passed'],
            ),
        }]);

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'namespace:VSCode (Recca0120\\VSCode)',
                label: '$(symbol-namespace) Recca0120\\VSCode',
                children: [
                    {
                        id: 'namespace:Tests (Recca0120\\VSCode\\Tests)',
                        label: '$(symbol-namespace) Tests',
                        children: [
                            {
                                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)',
                                label: '$(symbol-class) AssertionsTest',
                                children: [
                                    {
                                        id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Passed',
                                        label: '$(symbol-method) test_passed',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                id: 'Assertions2 (Recca0120\\VSCode\\Tests\\Assertions2)',
                                label: `$(symbol-class) Assertions2Test`,
                                children: [
                                    {
                                        id: 'Assertions2 (Recca0120\\VSCode\\Tests\\Assertions2)::Passed',
                                        label: '$(symbol-method) test_passed',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);
    });
});