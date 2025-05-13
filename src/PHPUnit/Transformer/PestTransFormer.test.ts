import { TestType } from '../types';
import { PestV2Fixer } from './PestFixer';
import { PestTransformer } from './PestTransformer';

describe('PestTransformer', () => {
    const transformer = new PestTransformer();

    describe('generateUniqueId', () => {
        it('test /** with comment */ should do', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'test /** with comment */ should do';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::test /** with comment */ should do';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const type = TestType.method;
            const className = 'P\\Tests\\Unit\\ExampleTest';
            const methodName = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const classFQN = className;

            const expected = 'tests/Unit/ExampleTest.php::ensures the given closures reports the correct class name and suggests the [pest()] function';
            expect(transformer.uniqueId({ type, classFQN, methodName })).toEqual(expected);
        });
    });

    describe('generateSearchText', () => {
        it('test /** with comment */ should do', () => {
            const input = 'test /** with comment */ should do';
            const expected = 'test /\\*\\* with comment \\*/ should do';
            expect(input.replace(/([\[\]()*])/g, '\\$1')).toEqual(expected);
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const input = 'ensures the given closures reports the correct class name and suggests the [pest()] function';
            const expected = 'ensures the given closures reports the correct class name and suggests the \\[pest\\(\\)\\] function';
            expect(input.replace(/([\[\]()*])/g, '\\$1')).toEqual(expected);
        });
    });

    describe('pest id', () => {
        it('test description', () => {
            const actual = PestV2Fixer.methodName('test description');

            expect(actual).toEqual('__pest_evaluable_test_description');
        });

        it('test_description', () => {
            const actual = PestV2Fixer.methodName('test_description');

            expect(actual).toEqual('__pest_evaluable_test__description');
        });

        it('ふ+が+', () => {
            const actual = PestV2Fixer.methodName('ふ+が+');

            expect(actual).toEqual('__pest_evaluable_ふ_が_');
        });

        it('ほげ', () => {
            const actual = PestV2Fixer.methodName('ほげ');

            expect(actual).toEqual('__pest_evaluable_ほげ');
        });

        it('卜竹弓一十山', () => {
            const actual = PestV2Fixer.methodName('卜竹弓一十山');

            expect(actual).toEqual('__pest_evaluable_卜竹弓一十山');
        });

        it('アゴデヸ', () => {
            const actual = PestV2Fixer.methodName('アゴデヸ');

            expect(actual).toEqual('__pest_evaluable_アゴデヸ');
        });

        it('!p8VrB', () => {
            const actual = PestV2Fixer.methodName('!p8VrB');

            expect(actual).toEqual('__pest_evaluable__p8VrB');
        });

        it('&amp;xe6VeKWF#n4', () => {
            const actual = PestV2Fixer.methodName('&amp;xe6VeKWF#n4');

            expect(actual).toEqual('__pest_evaluable__amp_xe6VeKWF_n4');
        });

        it('%%HurHUnw7zM!', () => {
            const actual = PestV2Fixer.methodName('%%HurHUnw7zM!');

            expect(actual).toEqual('__pest_evaluable___HurHUnw7zM_');
        });

        it('rundeliekend', () => {
            const actual = PestV2Fixer.methodName('rundeliekend');

            expect(actual).toEqual('__pest_evaluable_rundeliekend');
        });

        it('g%%c!Jt9$fy#Kf', () => {
            const actual = PestV2Fixer.methodName('g%%c!Jt9$fy#Kf');

            expect(actual).toEqual('__pest_evaluable_g__c_Jt9_fy_Kf');
        });

        it('NRs*Gz2@hmB$W$BPD%%b2U%3P%z%apnwSX', () => {
            const actual = PestV2Fixer.methodName('NRs*Gz2@hmB$W$BPD%%b2U%3P%z%apnwSX');

            expect(actual).toEqual('__pest_evaluable_NRs_Gz2_hmB_W_BPD__b2U_3P_z_apnwSX');
        });

        it('ÀÄ¤{¼÷', () => {
            const actual = PestV2Fixer.methodName('ÀÄ¤{¼÷');

            expect(actual).toEqual('__pest_evaluable_ÀÄ¤_¼÷');
        });

        it('ìèéàòç', () => {
            const actual = PestV2Fixer.methodName('ìèéàòç');

            expect(actual).toEqual('__pest_evaluable_ìèéàòç');
        });

        it('زهراء المعادي', () => {
            const actual = PestV2Fixer.methodName('زهراء المعادي');

            expect(actual).toEqual('__pest_evaluable_زهراء_المعادي');
        });

        it('الجبيهه', () => {
            const actual = PestV2Fixer.methodName('الجبيهه');

            expect(actual).toEqual('__pest_evaluable_الجبيهه');
        });

        it('الظهران', () => {
            const actual = PestV2Fixer.methodName('الظهران');

            expect(actual).toEqual('__pest_evaluable_الظهران');
        });

        it('Каролин', () => {
            const actual = PestV2Fixer.methodName('Каролин');

            expect(actual).toEqual('__pest_evaluable_Каролин');
        });

        it('অ্যান্টার্কটিকা', () => {
            const actual = PestV2Fixer.methodName('অ্যান্টার্কটিকা');

            expect(actual).toEqual('__pest_evaluable_অ্যান্টার্কটিকা');
        });

        it('Frýdek-Místek"', () => {
            const actual = PestV2Fixer.methodName('Frýdek-Místek"');

            expect(actual).toEqual('__pest_evaluable_Frýdek_Místek_');
        });

        it('Allingåbro&amp;', () => {
            const actual = PestV2Fixer.methodName('Allingåbro&amp;');

            expect(actual).toEqual('__pest_evaluable_Allingåbro_amp_');
        });

        it('Κεντροαφρικανική Δημοκρατία', () => {
            const actual = PestV2Fixer.methodName('Κεντροαφρικανική Δημοκρατία');

            expect(actual).toEqual('__pest_evaluable_Κεντροαφρικανική_Δημοκρατία');
        });

        it('آذربایجان غربی', () => {
            const actual = PestV2Fixer.methodName('آذربایجان غربی');

            expect(actual).toEqual('__pest_evaluable_آذربایجان_غربی');
        });

        it('זימבבואה', () => {
            const actual = PestV2Fixer.methodName('זימבבואה');

            expect(actual).toEqual('__pest_evaluable_זימבבואה');
        });

        it('Belišće', () => {
            const actual = PestV2Fixer.methodName('Belišće');

            expect(actual).toEqual('__pest_evaluable_Belišće');
        });

        it('Գվատեմալա', () => {
            const actual = PestV2Fixer.methodName('Գվատեմալա');

            expect(actual).toEqual('__pest_evaluable_Գվատեմալա');
        });

        it('パプアニューギニア', () => {
            const actual = PestV2Fixer.methodName('パプアニューギニア');

            expect(actual).toEqual('__pest_evaluable_パプアニューギニア');
        });

        it('富山県', () => {
            const actual = PestV2Fixer.methodName('富山県');

            expect(actual).toEqual('__pest_evaluable_富山県');
        });

        it('Қарағанды', () => {
            const actual = PestV2Fixer.methodName('Қарағанды');

            expect(actual).toEqual('__pest_evaluable_Қарағанды');
        });

        it('Қостанай', () => {
            const actual = PestV2Fixer.methodName('Қостанай');

            expect(actual).toEqual('__pest_evaluable_Қостанай');
        });

        it('안양시 동안구', () => {
            const actual = PestV2Fixer.methodName('안양시 동안구');

            expect(actual).toEqual('__pest_evaluable_안양시_동안구');
        });

        it('Itālija', () => {
            const actual = PestV2Fixer.methodName('Itālija');

            expect(actual).toEqual('__pest_evaluable_Itālija');
        });

        it('Honningsvåg', () => {
            const actual = PestV2Fixer.methodName('Honningsvåg');

            expect(actual).toEqual('__pest_evaluable_Honningsvåg');
        });

        it('Águeda', () => {
            const actual = PestV2Fixer.methodName('Águeda');

            expect(actual).toEqual('__pest_evaluable_Águeda');
        });

        it('Râșcani', () => {
            const actual = PestV2Fixer.methodName('Râșcani');

            expect(actual).toEqual('__pest_evaluable_Râșcani');
        });

        it('Năsăud', () => {
            const actual = PestV2Fixer.methodName('Năsăud');

            expect(actual).toEqual('__pest_evaluable_Năsăud');
        });

        it('Орехово-Зуево', () => {
            const actual = PestV2Fixer.methodName('Орехово-Зуево');

            expect(actual).toEqual('__pest_evaluable_Орехово_Зуево');
        });

        it('Čereňany', () => {
            const actual = PestV2Fixer.methodName('Čereňany');

            expect(actual).toEqual('__pest_evaluable_Čereňany');
        });

        it('Moravče', () => {
            const actual = PestV2Fixer.methodName('Moravče');

            expect(actual).toEqual('__pest_evaluable_Moravče');
        });

        it('Šentjernej', () => {
            const actual = PestV2Fixer.methodName('Šentjernej');

            expect(actual).toEqual('__pest_evaluable_Šentjernej');
        });

        it('Врање', () => {
            const actual = PestV2Fixer.methodName('Врање');

            expect(actual).toEqual('__pest_evaluable_Врање');
        });

        it('Крушевац', () => {
            const actual = PestV2Fixer.methodName('Крушевац');

            expect(actual).toEqual('__pest_evaluable_Крушевац');
        });

        it('Åkersberga', () => {
            const actual = PestV2Fixer.methodName('Åkersberga');

            expect(actual).toEqual('__pest_evaluable_Åkersberga');
        });

        it('บอสเนียและเฮอร์เซโกวีนา', () => {
            const actual = PestV2Fixer.methodName('บอสเนียและเฮอร์เซโกวีนา');

            expect(actual).toEqual('__pest_evaluable_บอสเนียและเฮอร์เซโกวีนา');
        });

        it('Birleşik Arap Emirlikleri', () => {
            const actual = PestV2Fixer.methodName('Birleşik Arap Emirlikleri');

            expect(actual).toEqual('__pest_evaluable_Birleşik_Arap_Emirlikleri');
        });

        it('Німеччина', () => {
            const actual = PestV2Fixer.methodName('Німеччина');

            expect(actual).toEqual('__pest_evaluable_Німеччина');
        });

        it('Nam Định', () => {
            const actual = PestV2Fixer.methodName('Nam Định');

            expect(actual).toEqual('__pest_evaluable_Nam_Định');
        });

        it('呼和浩特', () => {
            const actual = PestV2Fixer.methodName('呼和浩特');

            expect(actual).toEqual('__pest_evaluable_呼和浩特');
        });

        it('test /** with comment */ should do', () => {
            const actual = PestV2Fixer.methodName('test /** with comment */ should do');

            expect(actual).toEqual('__pest_evaluable_test_____with_comment____should_do');
        });

        it('test /** with comment */ should do', () => {
            const actual = PestV2Fixer.methodName('test /** with comment */ should do');

            expect(actual).toEqual('__pest_evaluable_test_____with_comment____should_do');
        });

        it('ensures the given closures reports the correct class name and suggests the [pest()] function', () => {
            const actual = PestV2Fixer.methodName('ensures the given closures reports the correct class name and suggests the [pest()] function');

            expect(actual).toEqual('__pest_evaluable_ensures_the_given_closures_reports_the_correct_class_name_and_suggests_the__pest____function');
        });

        it('adds coverage if --min exist', () => {
            const actual = PestV2Fixer.methodName('adds coverage if --min exist');

            expect(actual).toEqual('__pest_evaluable_adds_coverage_if___min_exist');
        });

        it('has_emails with dataset', () => {
            const actual = PestV2Fixer.methodName(`it has emails with data set "(|'enunomaduro@gmail.com|')"`);

            expect(actual).toEqual('__pest_evaluable_it_has_emails"(\'enunomaduro@gmail.com\')"');
        });

        it('test /** with comment {@*} should do', () => {
            const actual = PestV2Fixer.methodName('test /** with comment {@*} should do');

            expect(actual).toEqual('__pest_evaluable_test_____with_comment____should_do');
        });
    });
});