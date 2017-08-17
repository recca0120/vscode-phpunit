import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

export class Finder {
    public platform = process.platform
    public extensions = ['bat', 'exe', 'cmd']
    protected cache = {};

    public find(cmd: string): string {
        if (this.cache[cmd]) {
            return this.cache[cmd];
        }

        return this.cache[cmd] = this.isWindows() === true ? this.getCommandByWindows(cmd) : this.getCommandByLinux(cmd);
    }

    protected getCommandByWindows(cmd: string): string {
        if (existsSync(`${cmd}`)) {
            return resolve(`${cmd}`)
        }

        for (let extension of this.extensions) {
            if (existsSync(`${cmd}.${extension}`)) {
                return resolve(`${cmd}.${extension}`)
            }
        }

        try {
            for (let extension of this.extensions) {
                return execSync(`where "${cmd}.${extension}"`).toString().replace('/\r\n/', '\n').split('\n').shift().trim()
            }
        } catch (e) {

        }

        throw new Error('file not find');
    }

    protected getCommandByLinux(cmd: string): string {
        if (existsSync(cmd)) {
            return resolve(cmd);
        }
 
        return execSync(`which "${cmd}"`).toString().replace('/\r\n/', '\n').split('\n').shift().trim();
    }

    public isWindows(): boolean {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(this.platform)
    }
}
