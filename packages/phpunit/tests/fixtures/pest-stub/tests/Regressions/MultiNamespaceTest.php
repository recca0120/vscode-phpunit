<?php

namespace Regressions\First {
    class Alpha {}
}

namespace Regressions\Second {
    describe(Beta::class, function () {
        it('works', fn () => expect(true)->toBeTrue());
    });
}
