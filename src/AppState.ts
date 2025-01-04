export class AppState {
    private static instance: AppState;

    public static getInstance(): AppState {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }

        return AppState.instance;
    }

    private static readonly MAX_ENTRIES = 1000;

    /**
     * Map parser unique id to whether it's a Pest test
     */
    public parserTestTypeMap: Map<string, boolean>;

    private constructor() {
        this.parserTestTypeMap = new Map<string, boolean>();
    }

    private static cleanup(): void {
        const instance = AppState.getInstance();
        const mapSize = instance.parserTestTypeMap.size;


        if (mapSize < AppState.MAX_ENTRIES) {
            return;
        }

        const entriesToDelete = mapSize - AppState.MAX_ENTRIES;
        const iterator = instance.parserTestTypeMap.keys();
        for (let i = 0; i < entriesToDelete; i++) {
            const key = iterator.next().value;
            key && instance.parserTestTypeMap.delete(key);
        }
    }

    /**
     * Set whether a parser is a Pest test
     * @param parserId Unique identifier for the parser
     * @param isPest Boolean indicating if it's a Pest test
     */
    public static setParserTestType(parserId: string, isPest: boolean): void {
        AppState.getInstance().parserTestTypeMap.set(parserId, isPest);
        AppState.cleanup();
    }

    /**
     * Get whether a parser is a Pest test
     * @param parserId Unique identifier for the parser
     * @returns Boolean indicating if it's a Pest test, or undefined if not set
     */
    public static getParserTestType(parserId: string): boolean | undefined {
        return AppState.getInstance().parserTestTypeMap.get(parserId);
    }
}