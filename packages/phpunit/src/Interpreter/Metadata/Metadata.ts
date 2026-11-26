export type CloneMode = 'none' | 'deep' | 'shallow';

export type Metadata =
    | { kind: 'test' }
    | { kind: 'group'; name: string }
    | { kind: 'testDox'; text: string }
    | { kind: 'testWith'; data: unknown; name?: string }
    | { kind: 'dataProvider'; className?: string; methodName: string }
    | { kind: 'dependsOnMethod'; className?: string; methodName: string; clone: CloneMode }
    | { kind: 'dependsOnClass'; className: string; clone: CloneMode };
