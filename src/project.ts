import { DiagnosticCollection, OutputChannel } from 'vscode'

export interface Project {
    window?: any
    workspace?: any
    rootPath?: string
    diagnostics?: DiagnosticCollection
    extensionPath?: string
    outputChannel?: OutputChannel
}
