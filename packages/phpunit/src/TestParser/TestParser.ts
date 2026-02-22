import { readFile } from 'node:fs/promises';
import type { PHPUnitXML } from '../Configuration';
import type { AstParser } from './AstParser/AstParser';
import { PestTestExtractor } from './PestTestExtractor';
import { PHPUnitTestExtractor } from './PHPUnitTestExtractor';
import type { ParseResult, TestExtractor } from './TestExtractor';
import { TestNode } from './TestNode';

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private extractors: TestExtractor[];

    constructor(
        private phpUnitXML: PHPUnitXML,
        private astParser: AstParser,
    ) {
        this.extractors = [new PestTestExtractor(), new PHPUnitTestExtractor()];
    }

    async parseFile(file: string, testsuite?: string): Promise<ParseResult | undefined> {
        return this.parse(textDecoder.decode(await readFile(file)), file, testsuite);
    }

    parse(text: Buffer | string, file: string, testsuite?: string): ParseResult | undefined {
        const code = text.toString();
        const ast = this.astParser.parse(code, file);

        if (!ast) {
            return undefined;
        }

        const definition = new TestNode(ast, {
            phpUnitXML: this.phpUnitXML,
            file,
        });

        for (const extractor of this.extractors) {
            const result = extractor.extract(definition);
            if (result) {
                for (const testDefinition of result.tests) {
                    testDefinition.testsuite = testsuite;
                }
                return result;
            }
        }

        return undefined;
    }
}
