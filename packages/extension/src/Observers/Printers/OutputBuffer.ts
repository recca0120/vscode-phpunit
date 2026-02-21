import { EOL } from '@vscode-phpunit/phpunit';

export class OutputBuffer {
    private current?: string;
    private store: Map<string, string> = new Map();

    setCurrent(current?: string) {
        this.current = current;
    }

    append(text: string) {
        if (!this.current || text.match(/^##teamcity\[/)) {
            return;
        }

        const existing = this.store.get(this.current) || '';
        this.store.set(this.current, `${existing}${text}${EOL}`);
    }

    get(name: string) {
        const text = this.store.get(name);
        if (text) {
            this.store.delete(name);
        }
        return text?.trim();
    }

    all() {
        return Array.from(this.store.values()).join(EOL).trim();
    }

    clear() {
        this.store.clear();
    }
}
