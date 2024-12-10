import { basename, dirname, join, relative } from 'node:path';
import { Call, ExpressionStatement, String } from 'php-parser';
import { capitalize } from '../utils';
import { TestDefinition, TestParser, TestType } from './TestParser';

export class PestParser extends TestParser {
    private root: string = '';

    setRoot(root: string) {
        this.root = root;
    }

    protected parseAst(ast: any, file: string): TestDefinition[] | undefined {
        return ast.children
            .filter((expressionStatement: ExpressionStatement) => expressionStatement.expression)
            .map((expressionStatement: ExpressionStatement) => expressionStatement.expression)
            .filter((call: Call) => ['it', 'test'].includes(call.what.name as string))
            .map((call: Call) => {
                let relativePath = relative(this.root, file);
                let baseName = (basename(file, '.php'));
                const dotPos = baseName.lastIndexOf('.');
                if (dotPos !== -1) {
                    baseName = baseName.substring(0, dotPos);
                }
                relativePath = join(capitalize(dirname(relativePath)), baseName).replace(/\//g, '\\');
                relativePath = relativePath.replace(/%[a-fA-F0-9][a-fA-F0-9]/g, '');
                relativePath = relativePath.replace(/\\'|\\"/g, '');
                relativePath = relativePath.replace(/[^A-Za-z0-9\\]/, '');

                const classFQN = 'P\\' + relativePath;
                const partsFQN = classFQN.split('\\');
                const className = partsFQN.pop();
                const namespace = partsFQN.join('\\');
                let method = (call.arguments[0] as String).value;
                const loc = call.loc!;
                const start = { line: loc.start.line - 1, character: loc.start.column };
                const end = { line: loc.end.line - 1, character: loc.end.column };

                if (call.what.name as string === 'it') {
                    method = 'it ' + method;
                }

                method = method
                    .replace(/_/g, '__')
                    .replace(/\s+/, '_')
                    .replace(/[^a-zA-Z0-9_\x80-\xff]/, '_');

                return {
                    type: TestType.method,
                    id: `${classFQN}::${method}`,
                    label: method,
                    qualifiedClass: classFQN,
                    namespace: namespace,
                    class: className,
                    method: method,
                    file,
                    start,
                    end,
                };
            });
    }
}