<?php

describe('something', function () {
    it('should detect OK but does not', function (int $number) {
        expect($number)->toBeGreaterThan(3);
    })->with([
        4,
        8,
    ]);
    it('still does not detect OK', function () {
        expect(6)->toBeGreaterThan(3);
    })->with([
        4,
    ]);
});
