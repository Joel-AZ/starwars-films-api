import { Logger } from '@nestjs/common';

// Unit tests assert on return values, not on log lines. Silencing Nest's logger
// keeps the suite output to the test results.
Logger.overrideLogger(false);
