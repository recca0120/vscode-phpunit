import type { AstNode } from '../AstParser/AstNode';
import { classConstantAccessExpression } from './Access/ClassConstantAccessExpression';
import { subscriptAccessExpression } from './Access/SubscriptAccessExpression';
import { variableExpression } from './Access/VariableExpression';
import { anonymousFunctionExpression } from './Callables/AnonymousFunctionExpression';
import { arrowFunctionExpression } from './Callables/ArrowFunctionExpression';
import { methodDeclarationExpression } from './Callables/MethodDeclarationExpression';
import { compoundStatementExpression } from './ControlFlow/CompoundStatementExpression';
import { forExpression } from './ControlFlow/ForExpression';
import { foreachExpression } from './ControlFlow/ForeachExpression';
import { ifStatementExpression } from './ControlFlow/IfStatementExpression';
import { returnExpression } from './ControlFlow/ReturnExpression';
import { whileExpression } from './ControlFlow/WhileExpression';
import { yieldLabelExpression } from './ControlFlow/YieldLabelExpression';
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
import { arrayCreationExpression } from './Literals/ArrayCreationExpression';
import { booleanLiteralExpression } from './Literals/BooleanLiteralExpression';
import { encapsedStringExpression } from './Literals/EncapsedStringExpression';
import { floatLiteralExpression } from './Literals/FloatLiteralExpression';
import { nullLiteralExpression } from './Literals/NullLiteralExpression';
import { numberLiteralExpression } from './Literals/NumberLiteralExpression';
import { stringLiteralExpression } from './Literals/StringLiteralExpression';
import { assignmentExpression } from './Operators/AssignmentExpression';
import { binaryExpr } from './Operators/BinaryExpression';
import { conditionalExpression } from './Operators/ConditionalExpression';
import { unaryExpression } from './Operators/UnaryExpression';
import { updateExpression } from './Operators/UpdateExpression';

const allExpressions: Expression<unknown>[] = [
    variableExpression,
    stringLiteralExpression,
    numberLiteralExpression,
    floatLiteralExpression,
    booleanLiteralExpression,
    nullLiteralExpression,
    subscriptAccessExpression,
    encapsedStringExpression,
    binaryExpr,
    unaryExpression,
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

function createContext(bindings: Bindings, classBody?: AstNode[], className?: string): Context {
    const context: Context = {
        bindings,
        classBody,
        className,
        resolve: (node) => resolve(node, context),
        fork: (b, cb = classBody) => createContext(b, cb, className),
    };
    return context;
}

export function evaluate(
    node: AstNode,
    bindings: Bindings = {},
    classBody?: AstNode[],
    className?: string,
): unknown {
    return createContext(bindings, classBody, className).resolve(node);
}
