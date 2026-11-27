import { describe, expect, it } from 'vitest';
import { PRESET_COLLISION, PRESET_PRETTY, PRESET_PROGRESS, resolveFormat } from './PrinterConfig';
import type { PrinterFormat } from './PrinterFormat';

describe('resolveFormat', () => {
    it('returns base preset without overrides', () => {
        expect(resolveFormat('progress')).toEqual(PRESET_PROGRESS);
        expect(resolveFormat('collision')).toEqual(PRESET_COLLISION);
        expect(resolveFormat('pretty')).toEqual(PRESET_PRETTY);
    });

    it('merges overrides', () => {
        const format = resolveFormat('collision', { finished: '{status_dot}' });
        expect(format.finished).toEqual('{status_dot}');
        expect(format.suiteStarted).toEqual(PRESET_COLLISION.suiteStarted);
    });

    it('deep merges icons overrides', () => {
        const format = resolveFormat('collision', {
            colors: false,
            icons: { passed: ['P', 'OK'] },
        } as Partial<PrinterFormat>);
        expect(format.icons.passed).toEqual(['P', 'OK']);
        expect(format.icons.failed).toEqual(PRESET_COLLISION.icons.failed);
    });

    it('deep merges error overrides', () => {
        const format = resolveFormat('collision', {
            colors: false,
            error: { diff: { header: '--- Exp\n+++ Act' } },
        } as Partial<PrinterFormat>);
        expect(format.error.diff.header).toEqual('--- Exp\n+++ Act');
        expect(format.error.template).toEqual(PRESET_COLLISION.error.template);
        expect(format.error.detail.line).toEqual(PRESET_COLLISION.error.detail.line);
    });
});
