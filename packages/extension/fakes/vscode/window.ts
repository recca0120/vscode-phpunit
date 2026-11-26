import { vi } from 'vitest';

const window = {
    createOutputChannel: vi.fn().mockImplementation(() => {
        return {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
        };
    }),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showQuickPick: vi.fn(),
    activeTextEditor: undefined as unknown,
};

export { window };
