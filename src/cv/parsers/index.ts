/**
 * CV Parser System - Public API
 *
 * This file exports all public interfaces, classes, and services
 * for the CV parser system.
 *
 * Usage:
 * import {
 *   ParserRegistry,
 *   BaseParser,
 *   JsonResumeParser,
 *   YamlParser,
 *   LinkedInParser,
 *   CVData,
 *   IParserResult,
 *   ParserModule,
 * } from '@cv/parsers';
 */

// Base parser and interfaces
export { BaseParser, CVDataSchema, CVData, IParserResult, IParserMetadata } from './base.parser';

// Concrete parser implementations
export { JsonResumeParser } from './json-resume.parser';
export { YamlParser } from './yaml.parser';
export { LinkedInParser } from './linkedin.parser';

// Registry service
export { ParserRegistry } from './parser.registry';

// NestJS module
export { ParserModule } from './parser.module';
