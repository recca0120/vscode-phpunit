import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { TeamcityEvent } from '.';
import { TestOutputParser } from './TestOutputParser';

function parseAll(parser: TestOutputParser, lines: string[]) {
    let result: ReturnType<typeof parser.parse>;
    for (const line of lines) {
        result = parser.parse(line);
    }

    return result;
}

function testStarted(name: string, className: string, flowId: number) {
    return `##teamcity[testStarted name='${name}' locationHint='php_qn://${phpUnitProject(`tests/${className}Test.php`)}::\\Tests\\${className}Test::${name}' flowId='${flowId}']`;
}

function testFinished(name: string, flowId: number) {
    return `##teamcity[testFinished name='${name}' duration='0' flowId='${flowId}']`;
}

function testFailed(name: string, flowId: number) {
    return `##teamcity[testFailed name='${name}' message='Failed asserting that false is true.' details='' duration='0' flowId='${flowId}']`;
}

function testIgnored(name: string, flowId: number) {
    return `##teamcity[testIgnored name='${name}' message='Skipped.' details='' duration='0' flowId='${flowId}']`;
}

function testSuiteStarted(className: string, flowId: number) {
    return `##teamcity[testSuiteStarted name='Tests\\${className}Test' flowId='${flowId}']`;
}

function testSuiteFinished(className: string, flowId: number) {
    return `##teamcity[testSuiteFinished name='Tests\\${className}Test' flowId='${flowId}']`;
}

describe('TestOutputParser suite aggregation', () => {
    it('reports passed count when every child test passes', () => {
        const parser = new TestOutputParser();

        const result = parseAll(parser, [
            testSuiteStarted('Example', 1),
            testStarted('test_a', 'Example', 1),
            testFinished('test_a', 1),
            testSuiteFinished('Example', 1),
        ]);

        expect(result).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                passed: 1,
                failed: 0,
                skipped: 0,
            }),
        );
    });

    it('reports failed count when a child test fails', () => {
        const parser = new TestOutputParser();

        const result = parseAll(parser, [
            testSuiteStarted('Example', 2),
            testStarted('test_a', 'Example', 2),
            testFailed('test_a', 2),
            testFinished('test_a', 2),
            testSuiteFinished('Example', 2),
        ]);

        expect(result).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                passed: 0,
                failed: 1,
                skipped: 0,
            }),
        );
    });

    it('reports skipped count when a child test is ignored', () => {
        const parser = new TestOutputParser();

        const result = parseAll(parser, [
            testSuiteStarted('Example', 3),
            testStarted('test_a', 'Example', 3),
            testIgnored('test_a', 3),
            testFinished('test_a', 3),
            testSuiteFinished('Example', 3),
        ]);

        expect(result).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                passed: 0,
                failed: 0,
                skipped: 1,
            }),
        );
    });

    it('aggregates mixed results across multiple child tests', () => {
        const parser = new TestOutputParser();

        const result = parseAll(parser, [
            testSuiteStarted('Example', 4),
            testStarted('test_a', 'Example', 4),
            testFinished('test_a', 4),
            testStarted('test_b', 'Example', 4),
            testFinished('test_b', 4),
            testStarted('test_c', 'Example', 4),
            testFailed('test_c', 4),
            testFinished('test_c', 4),
            testStarted('test_d', 'Example', 4),
            testIgnored('test_d', 4),
            testFinished('test_d', 4),
            testSuiteFinished('Example', 4),
        ]);

        expect(result).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                passed: 2,
                failed: 1,
                skipped: 1,
            }),
        );
    });

    it('bubbles a nested suite failure up to the outer suite', () => {
        const parser = new TestOutputParser();

        const results: ReturnType<typeof parser.parse>[] = [];
        const lines = [
            testSuiteStarted('Outer', 5),
            testSuiteStarted('Inner', 5),
            testStarted('test_a', 'Inner', 5),
            testFailed('test_a', 5),
            testFinished('test_a', 5),
            testSuiteFinished('Inner', 5),
            testSuiteFinished('Outer', 5),
        ];
        for (const line of lines) {
            results.push(parser.parse(line));
        }

        const [innerFinished, outerFinished] = results.slice(-2);

        expect(innerFinished).toEqual(
            expect.objectContaining({ event: TeamcityEvent.testSuiteFinished, failed: 1 }),
        );
        expect(outerFinished).toEqual(
            expect.objectContaining({ event: TeamcityEvent.testSuiteFinished, failed: 1 }),
        );
    });

    it('does not mix counts across independent flowIds', () => {
        const parser = new TestOutputParser();

        const resultA = parseAll(parser, [
            testSuiteStarted('Example', 10),
            testStarted('test_a', 'Example', 10),
            testFailed('test_a', 10),
            testFinished('test_a', 10),
            testSuiteFinished('Example', 10),
        ]);

        const resultB = parseAll(parser, [
            testSuiteStarted('Example', 11),
            testStarted('test_a', 'Example', 11),
            testFinished('test_a', 11),
            testSuiteFinished('Example', 11),
        ]);

        expect(resultA).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                failed: 1,
                passed: 0,
            }),
        );
        expect(resultB).toEqual(
            expect.objectContaining({
                event: TeamcityEvent.testSuiteFinished,
                failed: 0,
                passed: 1,
            }),
        );
    });
});
