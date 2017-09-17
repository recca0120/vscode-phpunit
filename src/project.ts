import { DiagnosticCollection, OutputChannel } from 'vscode'

export interface Project {
    window?: any
    workspace?: any
    rootPath?: string
    extensionPath?: string
    outputChannel?: OutputChannel
    diagnosticCollection?: DiagnosticCollection
}
