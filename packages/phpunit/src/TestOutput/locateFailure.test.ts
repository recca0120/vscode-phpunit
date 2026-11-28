import { describe, expect, it } from 'vitest';
import { locateFailure } from './locateFailure';
import { OutputLineParser } from './OutputLineParser';
import type { TestFailed } from './types';

const testFile = '/U1/BACKEND/tests/TestCase/Controller/CmsPagesControllerTest.php';
const traitFile = '/U1/BACKEND/vendor/cakephp/cakephp/src/TestSuite/IntegrationTestTrait.php';
const failedInTrait = `##teamcity[testFailed name='testAddPost' message='Failed asserting that |'Der Eintrag wurde gespeichert.|' is in |'flash|' message.' details=' ${traitFile}:1177|n ${testFile}:169|n ' duration='247' flowId='3654']`;

const failed = (text: string) => new OutputLineParser().parse(text) as TestFailed;

describe('locateFailure', () => {
    it('points at the line of the test file and keeps the other frames as the stack trace', () => {
        expect(locateFailure({ ...failed(failedInTrait), file: testFile })).toEqual({
            location: { file: testFile, line: 169 },
            stackTrace: [{ file: traitFile, line: 1177 }],
        });
    });

    it('keeps every frame as the stack trace when none is in the test file', () => {
        expect(
            locateFailure({ ...failed(failedInTrait), file: '/U1/BACKEND/tests/OtherTest.php' }),
        ).toEqual({
            location: undefined,
            stackTrace: [
                { file: traitFile, line: 1177 },
                { file: testFile, line: 169 },
            ],
        });
    });

    it('has neither a location nor a stack trace without frames', () => {
        expect(locateFailure({ file: testFile, details: [] })).toEqual({
            location: undefined,
            stackTrace: [],
        });
    });

    it('has neither a location nor a stack trace when the test file is unknown', () => {
        expect(locateFailure({ ...failed(failedInTrait), file: undefined })).toEqual({
            location: undefined,
            stackTrace: [],
        });
    });
});
