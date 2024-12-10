import { basename, dirname, join, relative } from 'node:path';
import { Call, Closure, String } from 'php-parser';
import { capitalize } from '../utils';
import { TestDefinition, TestParser, TestType } from './TestParser';

export class PestParser extends TestParser {
    private root: string = '';

    setRoot(root: string) {
        this.root = root;
    }

    protected parseAst(ast: any, file: string): TestDefinition[] | undefined {
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

        const methods: TestDefinition[] = this.parseDescribe(ast, file, classFQN, namespace, className);

        if (methods.length <= 0) {
            return;
        }

        const loc = ast.loc;
        const start = { line: loc.start.line - 1, character: loc.start.column };
        const end = { line: loc.end.line - 1, character: loc.end.column };

        const clazz = {
            type: TestType.class,
            id: classFQN,
            qualifiedClass: classFQN,
            namespace: namespace,
            class: className,
            children: methods,
            file,
            start,
            end,
        } as TestDefinition;

        if (clazz.namespace) {
            this.eventEmitter.emit(`${TestType.namespace}`, {
                type: TestType.namespace,
                id: `namespace:${clazz.namespace}`,
                namespace: clazz.namespace!,
                label: clazz.namespace,
            });
        }

        this.eventEmitter.emit(`${clazz.type}`, clazz);

        methods.forEach(method => this.eventEmitter.emit(`${method.type}`, method));

        return [clazz];
    }

    private parseDescribe(ast: any, file: string, classFQN: string, namespace: string, className?: string, prefixes: string[] = []): TestDefinition[] {
        let children: any[];
        if (ast.kind === 'program') {
            children = ast.children;
        } else {
            children = (ast.arguments[1] as Closure).body!.children!;
            prefixes = [...prefixes, (ast.arguments[0] as String).value];
        }

        return children
            .filter((expressionStatement: any) => expressionStatement.expression)
            .map((expressionStatement: any) => expressionStatement.expression)
            .filter((call: Call) => ['describe', 'test', 'it'].includes(call.what.name as string))
            .reduce((tests: TestDefinition[], call: Call) => {
                return (call.what.name as string) === 'describe'
                    ? [...tests, ...this.parseDescribe(call, file, classFQN, namespace, className, prefixes)]
                    : [...tests, this.parseTestOrIt(file, call, classFQN, namespace, className, prefixes)];
            }, []);
    }

    private parseTestOrIt(file: string, call: Call, classFQN: string, namespace: string, className?: string, prefixes: string[] = []) {
        let label = (call.arguments[0] as String).value;

        if (call.what.name as string === 'it') {
            label = 'it ' + label;
        }

        let name = label;

        if (prefixes.length > 0) {
            label = [...prefixes, label].join(' → ');
            name = [...prefixes.map((value) => '`' + value + '`'), name].join(' → ');
        }

        const loc = call.loc!;
        const start = { line: loc.start.line - 1, character: loc.start.column };
        const end = { line: loc.end.line - 1, character: loc.end.column };

        return {
            type: TestType.method,
            id: `${classFQN}::${name}`,
            label,
            qualifiedClass: classFQN,
            namespace: namespace,
            class: className,
            method: name,
            file,
            start,
            end,
        };
    }
}