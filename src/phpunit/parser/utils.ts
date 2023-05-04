import { Class, Declaration, Engine, Namespace } from 'php-parser';

export const engine = new Engine({
    ast: { withPositions: true, withSource: true },
    parser: { extractDoc: true, suppressErrors: false },
    lexer: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        all_tokens: true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        short_tags: true,
    },
});
export const getName = (ast: Namespace | Class | Declaration) => {
    return typeof ast.name === 'string' ? ast.name : ast.name.name;
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
