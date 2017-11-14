import { normalizePath } from '../src/helpers';

describe('Helpers Tests', () => {
    it('should normalize path', () => {
        expect(normalizePath('C:\\Windows\\System32')).toBe('/c/Windows/System32');
    });
});
