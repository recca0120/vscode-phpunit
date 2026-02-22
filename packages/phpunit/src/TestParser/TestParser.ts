import { readFile } from 'node:fs/promises';
import type { PHPUnitXML } from '../Configuration';
import type { AstParser } from './AstParser/AstParser';
import { interpret } from './Interpreter/interpret';
import type { ParseResult } from './TestExtractor';
import { extractTests } from './TestExtractor';

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    constructor(
        private phpUnitXML: PHPUnitXML,
        private astParser: AstParser,
    ) {}

    async parseFile(file: string, testsuite?: string): Promise<ParseResult | undefined> {
        return this.parse(textDecoder.decode(await readFile(file)), file, testsuite);
    }

    parse(text: Buffer | string, file: string, testsuite?: string): ParseResult | undefined {
        const code = text.toString();
        const ast = this.astParser.parse(code, file);

        if (!ast) {
            return undefined;
        }

        const fileInfo = interpret(ast);
        const result = extractTests(fileInfo, file, this.phpUnitXML.root());

        if (!result) {
            return undefined;
        }

        for (const testDefinition of result.tests) {
            testDefinition.testsuite = testsuite;
        }

        return result;
    }
}
