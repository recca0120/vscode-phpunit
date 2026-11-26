import { globSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { fixturePath } from '../../../tests/utils';
import { PhpParserAstParser } from './PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from './TreeSitter/TreeSitterAstParser';
import { initTreeSitter } from './TreeSitter/TreeSitterParser';

const fixtures = globSync('**/*.php', { cwd: fixturePath('') })
    .filter((file) => !file.includes('vendor/'))
    .sort();

const knownDifferences = new Set<string>([
    'pest-stub/src/Calculator.php',
    'pest-stub/src/Item.php',
    'pest-stub/tests/Fixtures/CollisionTest.php',
    'pest-stub/tests/Fixtures/DirectoryWithTests/ExampleTest.php',
    'pest-stub/tests/Fixtures/ExampleTest.php',
    'pest-stub/tests/Fixtures/UnexpectedOutput.php',
    'pest-stub/tests/Unit/DatasetTest.php',
    'pest-stub/tests/Unit/DescribeTest.php',
    'pest-stub/tests/Unit/ExampleTest.php',
    'pest-stub/tests/Unit/SkipTodoTest.php',
    'phpunit-stub/src/Calculator.php',
    'phpunit-stub/src/Item.php',
    'phpunit-stub/tests/CalculatorTest.php',
    'phpunit-stub/tests/DataProviderLoopTest.php',
]);

describe('php-parser produces the same AST as tree-sitter', () => {
    beforeAll(async () => initTreeSitter());

    for (const file of fixtures) {
        const test = knownDifferences.has(file) ? it.fails : it;

        test(file, () => {
            const code = readFileSync(fixturePath(file), 'utf8');

            expect(new PhpParserAstParser().parse(code, file)).toEqual(
                new TreeSitterAstParser().parse(code, file),
            );
        });
    }
});
