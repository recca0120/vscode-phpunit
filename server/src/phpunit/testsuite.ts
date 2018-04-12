import { TestNode } from './common';
import { Ast } from './ast';
import { FilesystemContract } from './../filesystem/contract';
import { Filesystem } from './../filesystem/index';

export class Testsuite {
    constructor(private ast: Ast = new Ast(), private files: FilesystemContract = new Filesystem()) {}

    getTestNodes(code: string, uri: string): TestNode[] {
        return this.ast.parse(code, this.files.uri(uri));
    }
}
