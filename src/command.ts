import { execSync } from 'child_process'
import { existsSync } from 'fs'

export class Finder {
    public platform = process.platform
    protected cache = {};

    public find(cmd: string): string {
        if (this.cache[cmd]) {
            return this.cache[cmd];
        }

        if (existsSync(cmd)) {
            return this.cache[cmd] = cmd;
        }

        const executable = this.isWindows() === true ? 'where' : 'which'
        const command = execSync(`${executable} "${cmd}"`).toString().replace('/\r\n/', '\n').split('\n').shift().trim()

        return this.cache[cmd] = command;
    }

    public isWindows(): boolean {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(this.platform)
    }
}
