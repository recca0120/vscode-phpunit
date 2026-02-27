import { datasetIndexed, datasetNamed } from '../../utils';
import type { AstNode } from '../AstParser/AstNode';
import type { Bindings, Context, Expression } from './Expression';
import { arrayCombineExpression } from './Functions/Array/ArrayCombineExpression';
import { arrayMapExpression } from './Functions/Array/ArrayMapExpression';
import { implodeExpression } from './Functions/Array/ImplodeExpression';
import { rangeExpression } from './Functions/Array/RangeExpression';
import { lcfirstExpression } from './Functions/String/LcfirstExpression';
import { ltrimExpression } from './Functions/String/LtrimExpression';
import { rtrimExpression } from './Functions/String/RtrimExpression';
import { sprintfExpression } from './Functions/String/SprintfExpression';
import { strRepeatExpression } from './Functions/String/StrRepeatExpression';
import { strReplaceExpression } from './Functions/String/StrReplaceExpression';
import { strtolowerExpression } from './Functions/String/StrtolowerExpression';
import { strtoupperExpression } from './Functions/String/StrtoupperExpression';
import { substrExpression } from './Functions/String/SubstrExpression';
import { trimExpression } from './Functions/String/TrimExpression';
import { ucfirstExpression } from './Functions/String/UcfirstExpression';
import { arrayCreationExpression } from './Iterables/ArrayCreationExpression';
import { classConstantAccessExpression } from './Iterables/ClassConstantAccessExpression';
import { encapsedStringExpression } from './Literals/EncapsedStringExpression';
import { numberLiteralExpression } from './Literals/NumberLiteralExpression';
import { stringLiteralExpression } from './Literals/StringLiteralExpression';
import { subscriptAccessExpression } from './Literals/SubscriptAccessExpression';
import { variableExpression } from './Literals/VariableExpression';
import { binaryExpr } from './Operators/BinaryExpression';
import { conditionalExpression } from './Operators/ConditionalExpression';
import { anonymousFunctionExpression } from './Statements/AnonymousFunctionExpression';
import { arrowFunctionExpression } from './Statements/ArrowFunctionExpression';
import { assignmentExpression } from './Statements/AssignmentExpression';
import { compoundStatementExpression } from './Statements/CompoundStatementExpression';
import { forExpression } from './Statements/ForExpression';
import { foreachExpression } from './Statements/ForeachExpression';
import { ifStatementExpression } from './Statements/IfStatementExpression';
import { methodDeclarationExpression } from './Statements/MethodDeclarationExpression';
import { returnExpression } from './Statements/ReturnExpression';
import { updateExpression } from './Statements/UpdateExpression';
import { whileExpression } from './Statements/WhileExpression';
import { yieldLabelExpression } from './Statements/YieldLabelExpression';

const allExpressions: Expression<unknown>[] = [
    variableExpression,
    stringLiteralExpression,
    numberLiteralExpression,
    subscriptAccessExpression,
    encapsedStringExpression,
    binaryExpr,
    conditionalExpression,
    strtoupperExpression,
    strtolowerExpression,
    ucfirstExpression,
    lcfirstExpression,
    trimExpression,
    ltrimExpression,
    rtrimExpression,
    strRepeatExpression,
    substrExpression,
    strReplaceExpression,
    sprintfExpression,
    implodeExpression,
    assignmentExpression,
    updateExpression,
    returnExpression,
    arrayMapExpression,
    arrayCombineExpression,
    arrayCreationExpression,
    rangeExpression,
    classConstantAccessExpression,
    forExpression,
    foreachExpression,
    whileExpression,
    ifStatementExpression,
    yieldLabelExpression,
    compoundStatementExpression,
    anonymousFunctionExpression,
    arrowFunctionExpression,
    methodDeclarationExpression,
];

function resolve(node: AstNode, context: Context): unknown {
    for (const expr of allExpressions) {
        if (!expr.supports(node)) {
            continue;
        }
        return expr.resolve(node, context);
    }
    return undefined;
}

function createContext(bindings: Bindings, classBody?: AstNode[]): Context {
    const context: Context = {
        bindings,
        classBody,
        resolve: (node) => resolve(node, context),
        fork: (b, cb) => createContext(b, cb),
    };
    return context;
}

export function evaluate(node: AstNode, bindings: Bindings = {}, classBody?: AstNode[]): unknown {
    return createContext(bindings, classBody).resolve(node);
}

export function extractLabels(resolved: unknown): string[] | undefined {
    if (!(resolved instanceof Map)) {
        return undefined;
    }
    return [...resolved.keys()].map((key: string) =>
        /^\d+$/.test(key) ? datasetIndexed(key) : datasetNamed(key),
    );
}

export function resolveLabels(node: AstNode, classBody?: AstNode[]): string[] {
    const resolved = evaluate(node, {}, classBody);
    return extractLabels(resolved) ?? (Array.isArray(resolved) ? (resolved as string[]) : []);
}
