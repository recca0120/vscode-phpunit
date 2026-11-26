import type { MarkdownString, TestCoverageCount, WorkspaceFolder } from 'vscode';
import { URI } from 'vscode-uri';

enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3,
}

class FakeTestRunRequest {
    constructor(
        public include?: any,
        public exclude?: any,
        public profile?: any,
        public continuous: boolean = false,
    ) {}
}
const TestRunRequest = FakeTestRunRequest;

const isWin = process.platform === 'win32';

const Uri = new Proxy(URI, {
    get: (target: any, p) => {
        if (p !== 'file' || isWin) {
            return target[p];
        }

        return (...args: any[]) => {
            const result = target[p].apply(target, args);
            const str = result.toString().replace(/%5C/g, '/');
            const fsPath = result.fsPath;
            const path = result.path.replace(/\\/g, '/');

            return Object.assign({}, result, {
                path,
                fsPath,
                toString: () => str,
            });
        };
    },
});

class FakeTestTag {
    readonly id: string;
    constructor(id: string) {
        this.id = id;
    }
}

class FakeTestMessage {
    constructor(public message: string | MarkdownString) {}

    static diff(message: string | MarkdownString, expected: string, actual: string) {
        const msg = new FakeTestMessage(message);
        (msg as any).expected = expected;
        (msg as any).actual = actual;
        return msg;
    }
}
const TestMessage = FakeTestMessage;

class Disposable {
    dispose() {}
}

class FakeLocation {
    constructor(
        public uri: URI,
        public range: any,
    ) {}
}
const Location = FakeLocation;

class FakeRange {
    constructor(
        public start: any,
        public end: any,
    ) {}
}
const Range = FakeRange;

class Position {
    constructor(
        public line: number,
        public character: number,
    ) {}

    translate(lineDelta?: number, characterDelta?: number) {
        return new Position(this.line + (lineDelta ?? 0), characterDelta ?? this.character);
    }
}

class FakeDocumentLink {
    constructor(
        public range: any,
        public target?: URI,
    ) {}
}
const DocumentLink = FakeDocumentLink;

class FakeCancellationTokenSource {
    private listeners: Array<() => void> = [];

    token = {
        isCancellationRequested: false,
        onCancellationRequested: (listener: () => void) => {
            this.listeners.push(listener);
            return new Disposable();
        },
    };

    cancel() {
        this.token.isCancellationRequested = true;
        for (const fn of this.listeners) {
            fn();
        }
    }

    dispose() {}
}
const CancellationTokenSource = FakeCancellationTokenSource;

class FakeRelativePattern {
    uri: URI;
    base: string;
    pattern: string;
    constructor(workspaceFolder: WorkspaceFolder | URI | string, pattern: string) {
        if (typeof workspaceFolder === 'string') {
            workspaceFolder = URI.file(workspaceFolder);
        }
        const uri = 'uri' in workspaceFolder ? workspaceFolder.uri : workspaceFolder;
        this.uri = uri;
        this.base = uri.fsPath;
        this.pattern = pattern;
    }
}
const RelativePattern = FakeRelativePattern;

class FakeEventEmitter<T = void> {
    private listeners: Array<(e: T) => void> = [];

    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return new Disposable();
    };

    fire(data: T) {
        for (const fn of this.listeners) {
            fn(data);
        }
    }

    dispose() {
        this.listeners = [];
    }
}
const EventEmitter = FakeEventEmitter;

class FakeTestMessageStackFrame {
    label: string;
    uri?: any;
    position?: any;
    constructor(label: string, uri?: any, position?: any) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
const TestMessageStackFrame = FakeTestMessageStackFrame;

class FileCoverage {
    constructor(
        public uri: URI,
        public statementCoverage: TestCoverageCount,
    ) {}
}

class TestCoverageCount {
    constructor(
        public covered: number,
        public total: number,
    ) {}
}

class StatementCoverage {
    constructor(
        public executed: number | boolean,
        public location: any,
    ) {}
}

export {
    CancellationTokenSource,
    Disposable,
    DocumentLink,
    EventEmitter,
    FakeEventEmitter,
    FakeTestTag as TestTag,
    FileCoverage,
    Location,
    Position,
    Range,
    RelativePattern,
    StatementCoverage,
    TestCoverageCount,
    TestMessage,
    TestMessageStackFrame,
    TestRunProfileKind,
    TestRunRequest,
    Uri,
};
