import { basename, dirname, join, relative } from 'node:path';
import {
    Block, Call, Closure, Declaration, ExpressionStatement, namedargument, Node, Program, String,
} from 'php-parser';
import { Transformer, TransformerFactory } from '../Transformer';
import { TestDefinition, TestType } from '../types';
import { capitalize } from '../utils';
import { Parser } from './Parser';

export class PestParser extends Parser {
    private transformer: Transformer = TransformerFactory.factory('pest');

    parse(declaration: Declaration | Node, file: string): TestDefinition[] | undefined {
        const clazz = this.parseClass(declaration, file);

        clazz.children = this.parseDescribe(declaration, clazz);
        if (!clazz.children || clazz.children.length <= 0) {
            return;
        }

        const namespace = this.generateNamespace(clazz.namespace);

        return namespace ? [{ ...namespace, children: [clazz] }] : [clazz];
    }

    private parseClass(declaration: Declaration | Node, file: string): TestDefinition {
        let relativePath = relative(this.root(), file);
        let baseName = basename(file, '.php');
        const dotPos = baseName.lastIndexOf('.');
        if (dotPos !== -1) {
            baseName = baseName.substring(0, dotPos);
        }
        relativePath = join(capitalize(dirname(relativePath)), baseName).replace(/\//g, '\\');
        relativePath = relativePath.replace(/%[a-fA-F0-9][a-fA-F0-9]/g, '');
        relativePath = relativePath.replace(/\\'|\\"/g, '');
        relativePath = relativePath.replace(/[^A-Za-z0-9\\]/, '');

        const type = TestType.class;
        const classFQN = 'P\\' + relativePath;
        const partsFQN = classFQN.split('\\');
        const className = partsFQN.pop()!;
        const namespace = partsFQN.join('\\');
        const id = this.transformer.uniqueId({ type, classFQN });
        const label = this.transformer.generateLabel({ type, classFQN, className });

        const { start, end } = this.parsePosition(declaration);

        return { type, id, label, classFQN, namespace, className, file, start, end, depth: 2 };
    }

    private parseDescribe(declaration: Call | Block | Node, clazz: any, prefixes: string[] = []): TestDefinition[] {
        let children: any[];
        if (['program', 'namespace'].includes(declaration.kind)) {
            children = (declaration as Program).children;
        } else {
            const closure = this.parseClosure((declaration as Call).arguments[1] as Closure | namedargument);
            prefixes = [...prefixes, this.parseName((declaration as Call).arguments[0] as namedargument | String)!];
            children = closure.kind === 'arrowfunc' ? [{ expression: closure.body! }] : closure.body!.children!;
        }

        if (children.length > 0 && children[0].kind === 'namespace') {
            return this.parseDescribe(children[0], clazz);
        }

        return children
            .filter((expressionStatement: ExpressionStatement) => expressionStatement.expression)
            .map((expressionStatement: any) => expressionStatement.expression)
            .filter((call: Call) => ['describe', 'test', 'it'].includes(this.parseName(call) ?? ''))
            .reduce((tests: TestDefinition[], call: Call) => {
                if (this.parseName(call) !== 'describe') {
                    return [...tests, this.parseTestOrIt(call, clazz, prefixes)];
                }

                return [...tests, {
                    ...this.parseTest(TestType.describe, call, clazz, prefixes),
                    children: this.parseDescribe(call, clazz, prefixes),
                }];
            }, []);
    }

    private parseTestOrIt(call: Call, clazz: TestDefinition, prefixes: string[] = []): TestDefinition {
        return this.parseTest(TestType.method, call, clazz, prefixes);
    }

    private parseTest(type: TestType, call: Call, clazz: TestDefinition, prefixes: string[]) {
        if (call.what.kind === 'propertylookup') {
            return this.parseTestOrIt(((call.what as any).what) as Call, clazz, prefixes);
        }

        let methodName = this.parseName(call.arguments[0] as (String | namedargument));
        if (this.parseName(call) === 'it') {
            methodName = 'it ' + methodName;
        }
        const labelName = methodName;

        if (type === TestType.describe) {
            methodName = '`' + methodName + '`';
        }
        if (prefixes.length > 0) {
            methodName = [...prefixes.map((value) => '`' + value + '`'), methodName].join(' → ');
        }

        const id = this.transformer.uniqueId({ ...clazz, type, methodName });
        const label = this.transformer.generateLabel({ ...clazz, type, methodName: labelName });
        const { start, end } = this.parsePosition(call);

        return { ...clazz, type, id, label, methodName, start, end, depth: prefixes.length + 3 };
    }
}