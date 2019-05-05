/**
 * This event is sent by a Test Adapter when it starts loading the test definitions.
 */
export interface TestLoadStartedEvent {
    type: 'started';
}
/**
 * This event is sent by a Test Adapter when it finished loading the test definitions.
 */
export interface TestLoadFinishedEvent {
    type: 'finished';
    /** The test definitions that have just been loaded */
    suite?: TestSuiteInfo;
    /** If loading the tests failed, this should contain the reason for the failure */
    errorMessage?: string;
}
/**
 * This event is sent by a Test Adapter when it starts a test run.
 */
export interface TestRunStartedEvent {
    type: 'started';
    /**
     * The test(s) that will be run, this should be the same as the `tests` argument from the call
     * to `run(tests)` or `debug(tests)` that started the test run.
     */
    tests: string[];
}
/**
 * This event is sent by a Test Adapter when it finished a test run.
 */
export interface TestRunFinishedEvent {
    type: 'finished';
}
/**
 * Information about a test suite.
 */
export interface TestSuiteInfo {
    type: 'suite';
    id: string;
    /** The label to be displayed by the Test Explorer for this suite. */
    label: string;
    /** The description to be displayed next to the label. */
    description?: string;
    /** The tooltip text to be displayed by the Test Explorer when you hover over this suite. */
    tooltip?: string;
    /**
     * The file containing this suite (if known).
     * This can either be an absolute path (if it is a local file) or a URI.
     * Note that this should never contain a `file://` URI.
     */
    file?: string;
    /** The line within the specified file where the suite definition starts (if known). */
    line?: number;
    children: (TestSuiteInfo | TestInfo)[];
}
/**
 * Information about a test.
 */
export interface TestInfo {
    type: 'test';
    id: string;
    /** The label to be displayed by the Test Explorer for this test. */
    label: string;
    /** The description to be displayed next to the label. */
    description?: string;
    /** The tooltip text to be displayed by the Test Explorer when you hover over this test. */
    tooltip?: string;
    /**
     * The file containing this test (if known).
     * This can either be an absolute path (if it is a local file) or a URI.
     * Note that this should never contain a `file://` URI.
     */
    file?: string;
    /** The line within the specified file where the test definition starts (if known). */
    line?: number;
    /** Indicates whether this test will be skipped during test runs */
    skipped?: boolean;
}
/**
 * Information about a suite being started or completed during a test run.
 */
export interface TestSuiteEvent {
    type: 'suite';
    /**
     * The suite that is being started or completed. This field usually contains the ID of the
     * suite, but it may also contain the full information about a suite that is started if that
     * suite had not been sent to the Test Explorer yet.
     */
    suite: string | TestSuiteInfo;
    state: 'running' | 'completed';
    /**
     * This property allows you to update the description of the suite in the Test Explorer.
     * When the test states are reset, the description will change back to the one from `TestSuiteInfo`.
     */
    description?: string;
    /**
     * This property allows you to update the tooltip of the suite in the Test Explorer.
     * When the test states are reset, the tooltip will change back to the one from `TestSuiteInfo`.
     */
    tooltip?: string;
}
/**
 * Information about a test being started, completed or skipped during a test run.
 */
export interface TestEvent {
    type: 'test';
    /**
     * The test that is being started, completed or skipped. This field usually contains
     * the ID of the test, but it may also contain the full information about a test that is
     * started if that test had not been sent to the Test Explorer yet.
     */
    test: string | TestInfo;
    state: 'running' | 'passed' | 'failed' | 'skipped' | 'errored';
    /**
     * This message will be displayed by the Test Explorer when the user selects the test.
     * It is usually used for information about why a test has failed.
     */
    message?: string;
    /**
     * These messages will be shown as decorations for the given lines in the editor.
     * They are usually used to show information about a test failure at the location of that failure.
     */
    decorations?: TestDecoration[];
    /**
     * This property allows you to update the description of the test in the Test Explorer.
     * When the test states are reset, the description will change back to the one from `TestInfo`.
     */
    description?: string;
    /**
     * This property allows you to update the tooltip of the test in the Test Explorer.
     * When the test states are reset, the tooltip will change back to the one from `TestInfo`.
     */
    tooltip?: string;
}
export interface TestDecoration {
    /**
     * The line for which the decoration should be shown
     */
    line: number;
    /**
     * The message to show in the decoration. This must be a single line of text.
     */
    message: string;
    /**
     * This text is shown when the user hovers over the decoration's message.
     * If this isn't defined then the hover will show the test's log.
     */
    hover?: string;
}
export interface RetireEvent {
    /**
     * An array of test or suite IDs. For every suite ID, all tests in that suite will be retired.
     * If this isn't defined then all tests will be retired.
     */
    tests?: string[];
}
