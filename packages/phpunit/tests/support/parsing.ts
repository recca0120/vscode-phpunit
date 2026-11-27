import type { AstParser } from '../../src/Interpreter/AstParser/AstParser';
import { ChainAstParser } from '../../src/Interpreter/AstParser/ChainAstParser';
import { PhpParserAstParser } from '../../src/Interpreter/AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from '../../src/Interpreter/AstParser/TreeSitter/TreeSitterAstParser';
import { PHPUnitXML } from '../../src/PHPUnitXML/PHPUnitXML';
import { ClassRegistry } from '../../src/TestIndex/ClassRegistry';
import { InheritanceResolver } from '../../src/TestIndex/InheritanceResolver';
import { TestParser } from '../../src/TestParser/TestParser';
import type { TestDefinition } from '../../src/types';

const flatten = (tests: TestDefinition[]): TestDefinition[] =>
    tests.flatMap((test) => [test, ...flatten(test.children ?? [])]);

export const parseTestFile = (
    buffer: Buffer | string,
    file: string,
    root: string,
    astParser?: AstParser,
) => {
    const phpUnitXML = new PHPUnitXML();
    phpUnitXML.setRoot(root);
    const testParser = new TestParser(
        phpUnitXML,
        astParser ?? new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]),
    );

    const result = testParser.parse(buffer, file);
    if (!result) {
        return [];
    }

    const registry = new ClassRegistry();
    for (const cls of result.classes) {
        registry.register(cls);
    }

    return flatten(new InheritanceResolver(registry).resolve(result.tests));
};

export const findTest = (tests: TestDefinition[], id: string) => {
    const matchers: ((test: TestDefinition) => boolean)[] = [
        (test) => test.classFQN === id && !test.className && !test.methodName,
        (test) => test.className === id && !test.methodName,
        (test) => test.methodName === id,
    ];

    for (const matches of matchers) {
        const test = tests.find(matches);
        if (test) {
            return test;
        }
    }

    return undefined;
};
