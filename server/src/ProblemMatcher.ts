export abstract class ProblemMatcher<T> {
    private problems: any[] = [];
    private problemIndex = -1;
    private currentIndex = -1;

    constructor(private patterns: RegExp[] = []) {}

    async parse(contents: string): Promise<T[]> {
        const lines: string[] = contents.split(/\r\n|\r|\n/g);

        this.problems = [];
        this.problemIndex = -1;
        let current: RegExpMatchArray;
        let next: RegExpMatchArray;
        for (const line of lines) {
            this.parseLine(line);
            if ((next = line.match(this.nextRule))) {
                if (this.nextIndex === 0) {
                    this.problemIndex++;
                }

                this.currentIndex = this.nextIndex;
                await this.doUpdate(next);

                continue;
            }

            if (this.currentIndex === -1) {
                continue;
            }

            if ((current = line.match(this.currentRule))) {
                await this.doUpdate(current);
            } else {
                this.currentIndex = -1;
            }
        }

        return this.problems;
    }

    protected abstract parseLine(line: string): void;

    protected abstract async create(m: RegExpMatchArray): Promise<T>;

    protected abstract async update(
        problem: T,
        m: RegExpMatchArray,
        index: number
    ): Promise<void>;

    private async doUpdate(m: RegExpMatchArray) {
        if (!this.problems[this.problemIndex]) {
            this.problems[this.problemIndex] = await this.create(m);
        }

        await this.update(
            this.problems[this.problemIndex],
            m,
            this.currentIndex
        );
    }

    private get currentRule() {
        return this.patterns[this.currentIndex];
    }

    private get nextRule() {
        return this.patterns[this.nextIndex];
    }

    private get nextIndex() {
        return this.currentIndex === this.patterns.length - 1
            ? 0
            : this.currentIndex + 1;
    }
}
