import { Command } from 'vscode-languageserver/lib/main';
import { Argument } from './Argument';

export class TestResult {
    constructor(private output: any, private command: Command, private args: Argument) {
        console.log(this.command, this.args);
    }

    toString() {
        return this.output;
    }
}
