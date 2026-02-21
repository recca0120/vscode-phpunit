<?php

describe('something', function () {
    describe('something else', function () {
        it('test example', function () {
            expect(true)->toBeTrue();
        });

        it('test example2', function () {
            expect(true)->toBeTrue();
        });
    });
});

describe('before each', function () {
    beforeEach(function () {
        expect(true)->toBeTrue();
    });

    it('test example', function () {
        expect(true)->toBeTrue();
    });
});
