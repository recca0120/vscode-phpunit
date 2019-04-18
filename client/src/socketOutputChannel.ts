import { OutputChannel } from 'vscode';
import * as WebSocket from 'ws';

export class SocketOutputChannel implements OutputChannel {
    private log: string = '';
    private socket?: WebSocket;
    readonly name: string = '';
    constructor(
        private outputChannel: OutputChannel,
        private socketPort = 7000
    ) {
        this.name = outputChannel.name;
    }
    listen(): this {
        this.socket =
            this.socket || new WebSocket(`ws://localhost:${this.socketPort}`);
        return this;
    }
    setSocket(socket: WebSocket) {
        this.socket = socket;
        return this;
    }
    append(value: string): void {
        this.log += value;

        return this.outputChannel.append(value);
    }
    appendLine(value: string): void {
        this.log += value;
        // Don't send logs until WebSocket initialization
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(this.log);
        }
        this.log = '';

        return this.outputChannel.appendLine(value);
    }
    clear(): void {
        return this.outputChannel.clear();
    }
    show(...args: any[]): void {
        return this.outputChannel.show(...args);
    }
    hide(): void {
        return this.outputChannel.hide();
    }
    dispose(): void {
        return this.outputChannel.dispose();
    }
}
