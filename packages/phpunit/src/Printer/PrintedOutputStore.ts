import { EOL } from '../utils';

export class PrintedOutputStore {
    private current?: string;
    private store: Map<string, string> = new Map();

    setCurrent(current?: string) {
        this.current = current;
    }

    append(text: string) {
        if (!this.current || /^##teamcity\[/.test(text)) {
            return;
        }

        const existing = this.store.get(this.current) || '';
        this.store.set(this.current, `${existing}${text}${EOL}`);
    }

    take(name: string) {
        const text = this.store.get(name);
        this.store.delete(name);

        return text?.trim();
    }

    flush() {
        const text = Array.from(this.store.values()).join(EOL).trim();
        this.store.clear();

        return text;
    }

    clear() {
        this.store.clear();
    }
}
