import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { Declaration, Node } from 'php-parser';
import { PHPUnitXML } from '../PHPUnitXML';
import { TestDefinition, TestType } from '../types';
import { engine } from '../utils';
import { Parser } from './Parser';
import { PestParser } from './PestParser';
import { PHPUnitParser } from './PHPUnitParser';

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private parsers: Parser[] = [new PestParser(), new PHPUnitParser()];
    private eventEmitter = new EventEmitter;

    constructor(private phpUnitXML?: PHPUnitXML) {
        this.parsers.forEach(parser => parser.setPhpUnitXML(this.phpUnitXML));
    }

    on(eventName: TestType, callback: (testDefinition: TestDefinition, index?: number) => void) {
        this.eventEmitter.on(`${eventName}`, callback);
    }

    async parseFile(file: string) {
        return this.parse(textDecoder.decode(await readFile(file)), file);
    }

    parse(text: Buffer | string, file: string) {
        text = text.toString();

        // Todo https://github.com/glayzzle/php-parser/issues/170
        text = text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');

        try {
            const ast = engine.parseCode(text, file);

            // https://github.com/glayzzle/php-parser/issues/155
            // currently inline comments include the line break at the end, we need to
            // strip those out and update the end location for each comment manually
            ast.comments?.forEach((comment) => {
                if (comment.value[comment.value.length - 1] === '\r') {
                    comment.value = comment.value.slice(0, -1);
                    comment.loc!.end.offset = comment.loc!.end.offset - 1;
                }
                if (comment.value[comment.value.length - 1] === '\n') {
                    comment.value = comment.value.slice(0, -1);
                    comment.loc!.end.offset = comment.loc!.end.offset - 1;
                }
            });

            return this.parseAst(ast, file);
        } catch (e) {
            return undefined;
        }
    }

    private parseAst(declaration: Declaration | Node, file: string): TestDefinition[] | undefined {
        for (const parser of this.parsers) {
            const tests = parser.parse(declaration, file);
            if (tests) {
                return this.emit(tests);
            }
        }

        return;
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