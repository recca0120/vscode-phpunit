import { readFile } from 'fs/promises';
import { Call, Declaration, Program } from 'php-parser';
import { pestProject } from '../__tests__/utils';
import { parse as parseProperty } from './PropertyParser';
import { TestDefinition, TestParser } from './TestParser';

class PestParser extends TestParser {
    protected parseAst(
        ast: Program,
        file: string,
    ): TestDefinition[] | undefined {
        this.parseProgram(ast, file);
        return [];
    }

    private parseProgram(program: Program, _file: string) {
        program.children
            .map((expressionStatement: any) => expressionStatement.expression)
            .map((call: Call & Declaration) => {
                console.log(parseProperty(call));
                // const loc = call.loc!;
                // const start = { line: loc.start.line, character: loc.start.column };
                // const end = { line: loc.end.line, character: loc.end.column };
                //
                // const label = (call.arguments[0] as String).value;
                // return {
                //     type: TestType.method,
                //     id: `${file}-${label}`,
                //     label: label,
                //     method: label,
                //     start,
                //     end,
                //     file,
                // };
            });
        // export type TestDefinition = {
        //     type: TestType;
        //     id: string;
        //     label: string;
        //     namespace?: string;
        //     qualifiedClass?: string;
        //     class?: string;
        //     method?: string;
        //     parent?: TestDefinition;
        //     children?: TestDefinition[]
        //     file?: string;
        //     start?: Position;
        //     end?: Position;
        //     annotations?: Annotations;
        // };
    }
}

describe('PestParser', () => {
    it('abc', async () => {
        const file = pestProject('tests/Unit/ExampleTest.php');
        const buffer = await readFile(file);

        const parser = new PestParser();

        parser.parse(buffer, file);
    });
});