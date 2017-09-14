import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

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
}

class Windows extends AbstractFilesystem implements FilesystemInterface {
    public extensions = ['bat', 'exe', 'cmd']

    public find(file: string): string {
        const exists = this.getExists(file)

        if (exists) {
            return exists
        }

        try {
            for (const extension of this.extensions) {
                return execSync(`where "${file}.${extension}"`)
                    .toString()
                    .replace('/\r\n/', '\n')
                    .split('\n')
                    .shift()
                    .trim()
            }
        } catch (e) {}
    }

    public exists(file: string): boolean {
        for (const extension of this.extensions) {
            if (existsSync(`${file}.${extension}`)) {
                return true
            }
        }

        return false
    }

    protected getExists(file: string): string {
        for (const extension of this.extensions) {
            if (existsSync(`${file}.${extension}`)) {
                return resolve(`${file}.${extension}`)
            }
        }

        return ''
    }
}

class Linux extends AbstractFilesystem implements FilesystemInterface {
    public find(file: string): string {
        if (existsSync(file)) {
            return resolve(file)
        }

        return execSync(`which "${file}"`).toString().replace('/\r\n/', '\n').split('\n').shift().trim()
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
