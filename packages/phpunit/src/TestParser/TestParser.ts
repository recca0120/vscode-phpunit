import { readFile } from 'node:fs/promises';
import type { AstParser } from '../Interpreter/AstParser/AstParser';
import { interpret } from '../Interpreter/Interpreter';
import type { PHPUnitXML } from '../PHPUnitXML';
import { resolveIncludes } from './IncludeResolver';
import type { ParseResult } from './ParseResult';
import { extractTests } from './TestExtractor';

const textDecoder = new TextDecoder('utf-8');

export type ReadText = (file: string) => Promise<string>;

export const readTextFile: ReadText = async (file) => textDecoder.decode(await readFile(file));

export class TestParser {
    constructor(
        private phpUnitXML: PHPUnitXML,
        private astParser: AstParser,
        private readText: ReadText = readTextFile,
    ) {}

    async parseFile(file: string, testsuite?: string): Promise<ParseResult | undefined> {
        return this.parse(await this.readText(file), file, testsuite);
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

        return { ...result, includes: resolveIncludes(ast, file) };
    }
}
