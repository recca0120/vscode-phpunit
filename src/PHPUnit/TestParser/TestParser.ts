import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { Declaration, Node } from 'php-parser';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestDefinition, TestType } from '../types';
import { engine } from '../utils';
import { Parser } from './Parser';
import { PestParser } from './PestParser';
import { PHPDefinition } from './PHPDefinition';
import { PHPUnitParser } from './PHPUnitParser';

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private parsers: Parser[] = [new PestParser(), new PHPUnitParser()];
    private eventEmitter = new EventEmitter;

    constructor(private phpUnitXML: PHPUnitXML) {
    }

    on(eventName: TestType, callback: (testDefinition: TestDefinition, index?: number) => void) {
        this.eventEmitter.on(`${eventName}`, callback);
    }

    async parseFile(file: string, testsuite?: string) {
        return this.parse(textDecoder.decode(await readFile(file)), file, testsuite);
    }

    parse(text: Buffer | string, file: string, testsuite?: string) {
        text = text.toString();

        // Todo https://github.com/glayzzle/php-parser/issues/170
        text = text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');

        try {
            const ast = engine.parseCode(text, file);

            // Removed manual comment newline stripping, assuming php-parser handles this or it's not necessary

            return this.parseAst(ast, file, testsuite);
        } catch (e) {
            console.error('Error parsing PHP file:', e); // Added context to error logging

            return undefined;
        }
    }

    private parseAst(declaration: Declaration | Node, file: string, testsuite?: string): TestDefinition[] | undefined {
        const definition = new PHPDefinition(declaration, { phpUnitXML: this.phpUnitXML, file });

        let allTests: TestDefinition[] | undefined = undefined;

        // Iterate through parsers and combine results
        for (const parser of this.parsers) {
            const tests = parser.parse(definition);
            if (tests && tests.length > 0) {
                // Assign testsuite to parsed definitions
                tests.forEach((testDefinition) => testDefinition.testsuite = testsuite);

                if (!allTests) {
                    allTests = tests;
                } else {
                    // Combine results from different parsers if necessary
                    // This might need more sophisticated merging logic depending on how parsers interact
                    // For now, simply concatenating
                    allTests = allTests.concat(tests);
                }
            }
        }

        // Emit all collected tests
        if (allTests && allTests.length > 0) {
            this.emit(allTests);
            return allTests;
        }

        return undefined; // Return undefined if no tests were found by any parser
    }

    private emit(tests: TestDefinition[]) {
        tests.forEach(test => {
            this.eventEmitter.emit(`${test.type}`, test);
            if (test.children && test.children.length > 0) {
                this.emit(test.children);
            }
        });

        return tests;
    }
}
