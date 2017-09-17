import { existsSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

interface FilesystemInterface {
    find(file: string): string
    exists(file: string): boolean
    isWindows(): boolean
}

abstract class AbstractFilesystem {
    public platform = process.platform

    public isWindows(): boolean {
        return /win32|mswin(?!ce)|mingw|bccwin|cygwin/i.test(this.platform)
    }

    protected normalize(buffer: Buffer) {
        return buffer
            .toString()
            .replace('/\r\n/', '\n')
            .split('\n')
            .shift()
            .trim()
    }
}

class Windows extends AbstractFilesystem implements FilesystemInterface {
    public extensions = ['.bat', '.exe', '.cmd', '']

    public find(file: string): string {
        const exists = this.getExists(file)

        if (exists) {
            return exists
        }

        for (const extension of this.extensions) {
            const fileName = `${file}${extension}`
            try {
                const process = spawnSync('where', [fileName])

                if (process.status === 0) {
                    return this.normalize(new Buffer(process.output.join('')))
                }
            } catch (e) {}
        }

        return ''
    }

    public exists(file: string): boolean {
        for (const extension of this.extensions) {
            if (existsSync(`${file}${extension}`)) {
                return true
            }
        }

        return false
    }

    protected getExists(file: string): string {
        for (const extension of this.extensions) {
            if (existsSync(`${file}${extension}`)) {
                return resolve(`${file}${extension}`)
            }
        }

        return ''
    }
}

class Linux extends AbstractFilesystem implements FilesystemInterface {
    public find(fileName: string): string {
        if (existsSync(fileName)) {
            return resolve(fileName)
        }

        const process = spawnSync('which', [fileName])

        return this.normalize(new Buffer(process.output.join('')))
    }

    public exists(file: string): boolean {
        return existsSync(file)
    }
}

export class Filesystem extends AbstractFilesystem {
    protected instance: FilesystemInterface

    protected cache = new Map<string, string>()

    public constructor() {
        super()
        this.instance = this.isWindows() ? new Windows() : new Linux()
    }

    public find(file: string): string {
        const key = file
        if (this.cache.has(key) === true) {
            return this.cache.get(key)
        }

        const find = this.instance.find(key)
        if (find) {
            this.cache.set(key, find)
        }

        return find ? find : ''
    }

    public exists(file: string): boolean {
        const key = `${file}-exists`
        if (this.cache.has(key) === true) {
            return true
        }

        const exists = this.instance.exists(file)
        if (exists === true) {
            this.cache.set(key, file)
        }

        return exists
    }
}
