import { Module } from '@nestjs/common';
import { JsonResumeParser } from './json-resume.parser';
import { YamlParser } from './yaml.parser';
import { LinkedInParser } from './linkedin.parser';
import { ParserRegistry } from './parser.registry';

/**
 * CV Parser Module
 *
 * Provides parsing functionality for multiple CV formats:
 * - JSON Resume (standard JSON format)
 * - YAML (YAML format)
 * - LinkedIn CSV (LinkedIn export format)
 *
 * Usage:
 * 1. Import ParserModule in your parent module
 * 2. Inject ParserRegistry service in your controllers/services
 * 3. Use ParserRegistry to parse CV data from various formats
 *
 * Example:
 * @Injectable()
 * export class CVService {
 *   constructor(private parserRegistry: ParserRegistry) {}
 *
 *   async importCV(fileContent: string, format: string) {
 *     const result = await this.parserRegistry.parse(fileContent, format);
 *     return result.data;
 *   }
 * }
 */
@Module({
  providers: [
    JsonResumeParser,
    YamlParser,
    LinkedInParser,
    ParserRegistry,
  ],
  exports: [
    JsonResumeParser,
    YamlParser,
    LinkedInParser,
    ParserRegistry,
  ],
})
export class ParserModule {}
