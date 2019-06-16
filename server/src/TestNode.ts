import URI from 'vscode-uri';
import { CodeLens, Command, Range } from 'vscode-languageserver-protocol';
import {
    TestInfo,
    TestSuiteInfo,
    TestEvent,
    TestSuiteEvent,
} from './TestExplorer';

export interface TestOptions {
    [propName: string]: any;
    workspaceFolder: string;
    class?: string;
    namespace?: string;
    method?: string;
    uri: URI;
}

interface ExportCodeLens {
    exportCodeLens(): CodeLens[];
}

abstract class BaseTestNode {
    [propName: string]: any;

    constructor(private node: any, private options?: TestOptions) {}

    get workspaceFolder() {
        return this.options && this.options.workspaceFolder
            ? this.options.workspaceFolder
            : undefined;
    }

    get name(): string {
        return this.node.name.name;
    }

    get file(): string | undefined {
        return this.options && this.options.uri
            ? this.options.uri.toString()
            : undefined;
    }

    get line(): number {
        return this.node.loc.start.line - 1;
    }

    get depends(): string[] {
        const comments: any[] = this.node.body.leadingComments || [];

        return comments.reduce((depends: any[], comment: any) => {
            const matches = (comment.value.match(/@depends\s+[^\n\s]+/g) || [])
                .map((depend: string) => depend.replace('@depends', '').trim())
                .filter((depend: string) => !!depend);

            return depends.concat(matches);
        }, []);
    }

    get kind(): string {
        return this.node.kind;
    }

    get qualifiedClassName(): string {
        return [this.namespace, this.class].filter(name => !!name).join('\\');
    }

    get namespace(): string | undefined {
        return this.options ? this.options.namespace : undefined;
    }

    get class(): string | undefined {
        return this.options ? this.options.class : undefined;
    }

    get method(): string {
        return this.kind === 'method' ? this.node.name.name : '';
    }

    get range(): Range {
        const start = this.node.loc.start;
        const startCharacter = this.node.visibility
            ? start.column - this.node.visibility.length
            : start.column;

        const end = this.node.loc.end;

        return Range.create(
            start.line - 1,
            startCharacter,
            end.line - 1,
            end.column
        );
    }

    get uri(): URI | undefined {
        return this.options ? this.options.uri : undefined;
    }

    isTest(): boolean {
        return (
            this.acceptModifier() &&
            (this.acceptComments() || this.acceptMethodName())
        );
    }

    asCodeLens(): CodeLens {
        const codeLens = CodeLens.create(this.range);

        codeLens.command = {
            title: 'Run Test',
            command: 'phpunit.lsp.run-test-at-cursor',
            arguments: [this.workspaceFolder, this.id],
        } as Command;

        return codeLens;
    }

    private acceptModifier(): boolean {
        return ['', 'public'].indexOf(this.node.visibility) !== -1;
    }

    private acceptComments(): boolean {
        const comments: any[] = this.node.body.leadingComments || [];

        return comments.some((comment: any) => /@test/.test(comment.value));
    }

    private acceptMethodName(): boolean {
        return /^test/.test(this.node.name.name);
    }
}

export class TestSuiteNode extends BaseTestNode
    implements TestSuiteInfo, ExportCodeLens {
    type: 'suite' = 'suite';

    constructor(
        node: any,
        public children: (TestSuiteNode | TestNode)[],
        options?: TestOptions
    ) {
        super(node, options);
    }

    get id(): string {
        return this.qualifiedClassName;
    }

    get label(): string {
        return this.qualifiedClassName || '';
    }

    asTestSuiteEvent(): TestSuiteEvent {
        return {
            type: 'suite',
            suite: this.id,
            state: 'running',
        };
    }

    exportCodeLens(): CodeLens[] {
        return [this.asCodeLens()].concat(
            this.children.map(test => test.asCodeLens())
        );
    }
}

export class TestNode extends BaseTestNode implements TestInfo {
    type: 'test' = 'test';

    constructor(node: any, options?: TestOptions) {
        super(node, options);
    }

    get id(): string {
        return [this.qualifiedClassName, this.name].join('::');
    }

    get label(): string {
        return this.method;
    }

    asTestEvent(): TestEvent {
        return {
            type: 'test',
            test: this.id,
            state: 'running',
        };
    }
}
