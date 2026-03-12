<?php

use App\Domain\PeName;

// Test: with(XXX::class) - class name string as dataset value
it('should use class constant as dataset', function (string $className) {
    expect($className)->toBe(PeName::class);
})->with([
    PeName::class,
]);

// Test: with(XXX::EnumCase) - enum case as dataset value (wrapped)
it('should handle enum case as dataset', function (PeName $peName) {
    expect($peName)->toBeInstanceOf(PeName::class);
})->with([
    [PeName::Standard],
    [PeName::Dynamic],
    [PeName::Legacy],
]);

// Test: both inside describe(FQN::class)
describe(PeName::class, function () {
    it('should reject not of type Standard and Dynamic', function (PeName $peName) {
        expect($peName)->toBeInstanceOf(PeName::class);
    })->with([
        [PeName::Standard],
        [PeName::Dynamic],
        [PeName::Legacy],
    ]);
});
