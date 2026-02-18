import { describe, expect, it } from 'vitest';
import { Position } from 'vscode';
import { CloverParser } from './CloverParser';

describe('CloverParser test', () => {
    it('parseClover from fixture file', async () => {
        const cf = await CloverParser.parseClover(
            'src/PHPUnit/__tests__/fixtures/test1.clover.xml',
        );
        expect(cf.length).toEqual(3);
        const dc = cf[1].generateDetailedCoverage();
        expect(dc.length).toEqual(6);
        expect(dc[0].executed).toEqual(2);
        if (dc[0].location instanceof Position) {
            expect(dc[0].location.line).toEqual(8);
        }
    });

    it('parses single package with multiple files', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <line num="10" type="stmt" count="1"/>
        <metrics statements="1" coveredstatements="1"/>
      </file>
      <file name="/app/Models/Post.php">
        <line num="5" type="stmt" count="0"/>
        <metrics statements="1" coveredstatements="0"/>
      </file>
    </package>
    <metrics files="2" statements="2" coveredstatements="1"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual(['/app/Models/User.php', '/app/Models/Post.php']);
    });

    it('parses multiple packages', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <metrics statements="1" coveredstatements="1"/>
      </file>
    </package>
    <package name="App\\Services">
      <file name="/app/Services/PaymentService.php">
        <metrics statements="2" coveredstatements="1"/>
      </file>
    </package>
    <metrics files="2" statements="3" coveredstatements="2"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual([
            '/app/Models/User.php',
            '/app/Services/PaymentService.php',
        ]);
    });

    it('parses global files without package', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <file name="/app/helpers.php">
      <metrics statements="1" coveredstatements="0"/>
    </file>
    <metrics files="1" statements="1" coveredstatements="0"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual(['/app/helpers.php']);
    });

    it('parses mixed global files and packages', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <metrics statements="1" coveredstatements="1"/>
      </file>
    </package>
    <package name="App\\Services">
      <file name="/app/Services/PaymentService.php">
        <metrics statements="2" coveredstatements="1"/>
      </file>
    </package>
    <file name="/app/helpers.php">
      <metrics statements="0" coveredstatements="0"/>
    </file>
    <metrics files="3" statements="3" coveredstatements="2"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual([
            '/app/helpers.php',
            '/app/Models/User.php',
            '/app/Services/PaymentService.php',
        ]);
    });

    it('parses multiple global files without any package', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <file name="/app/helpers.php">
      <metrics statements="1" coveredstatements="0"/>
    </file>
    <file name="/app/bootstrap.php">
      <metrics statements="2" coveredstatements="1"/>
    </file>
    <metrics files="2" statements="3" coveredstatements="1"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual(['/app/helpers.php', '/app/bootstrap.php']);
    });

    it('parses package with single file', async () => {
        const cf = await CloverParser.parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <metrics statements="1" coveredstatements="1"/>
      </file>
    </package>
    <metrics files="1" statements="1" coveredstatements="1"/>
  </project>
</coverage>`);

        expect(cf.map((f) => f.uri.path)).toEqual(['/app/Models/User.php']);
    });
});
