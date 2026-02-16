import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { Comment, Declaration, Node } from 'php-parser';
import type { PHPUnitXML } from '../PHPUnitXML';
import type { TestDefinition, TestType } from '../types';
import { engine } from '../utils';
import type { ClassRegistry } from './ClassRegistry';
import type { Parser } from './Parser';
import { PestParser } from './PestParser';
import { PHPUnitParser } from './PHPUnitParser';
import { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

const textDecoder = new TextDecoder('utf-8');

export class TestParser {
    private parsers: Parser[];
    private eventEmitter = new EventEmitter();

    constructor(
        private phpUnitXML: PHPUnitXML,
        classRegistry?: ClassRegistry,
    ) {
        this.parsers = [new PestParser(), new PHPUnitParser(classRegistry)];
    }

    on(eventName: TestType, callback: (testDefinition: TestDefinition, index?: number) => void) {
        this.eventEmitter.on(`${eventName}`, callback);
    }

    async parseFile(file: string, testsuite?: string) {
        return this.parse(textDecoder.decode(await readFile(file)), file, testsuite);
    }

    parse(text: Buffer | string, file: string, testsuite?: string) {
        try {
            const preprocessed = applyInlinePlaceholderWorkaround(text.toString());
            const ast = engine.parseCode(preprocessed, file);
            if (ast.comments) {
                normalizeCommentLineBreaks(ast.comments);
            }

            return this.parseAst(ast, file, testsuite);
        } catch (e) {
            console.error(e);

            return undefined;
        }
    }

    private parseAst(
        declaration: Declaration | Node,
        file: string,
        testsuite?: string,
    ): TestDefinition[] | undefined {
        const definition = new PhpAstNodeWrapper(declaration, {
            phpUnitXML: this.phpUnitXML,
            file,
        });

        for (const parser of this.parsers) {
            const tests = parser.parse(definition);
            if (tests) {
                for (const testDefinition of tests) {
                    testDefinition.testsuite = testsuite;
                }
                return this.emit(tests);
            }
        }

        return;
    }

    private emit(tests: TestDefinition[]) {
        for (const test of tests) {
            this.eventEmitter.emit(`${test.type}`, test);
            if (test.children && test.children.length > 0) {
                this.emit(test.children);
            }
        }

        return tests;
    }
}

/** Workaround for https://github.com/glayzzle/php-parser/issues/170 */
function applyInlinePlaceholderWorkaround(text: string): string {
    return text.replace(/\?>\r?\n<\?/g, '?>\n___PSEUDO_INLINE_PLACEHOLDER___<?');
}

/** Workaround for https://github.com/glayzzle/php-parser/issues/155 */
function normalizeCommentLineBreaks(comments: Comment[]): void {
    for (const comment of comments) {
        let trimmed = 0;
        while (comment.value.length > 0) {
            const last = comment.value[comment.value.length - 1];
            if (last !== '\r' && last !== '\n') {
                break;
            }
            comment.value = comment.value.slice(0, -1);
            trimmed++;
        }
        if (trimmed > 0) {
            // biome-ignore lint/style/noNonNullAssertion: loc is always present when withPositions is true
            comment.loc!.end.offset -= trimmed;
        }
    }
}
