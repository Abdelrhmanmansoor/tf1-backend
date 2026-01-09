import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseParser, IParserMetadata, IParserResult } from './base.parser';
import { JsonResumeParser } from './json-resume.parser';
import { YamlParser } from './yaml.parser';
import { LinkedInParser } from './linkedin.parser';

/**
 * Parser Registry Service
 *
 * Manages all available CV parsers
 * Provides functionality to:
 * - Register and manage parsers
 * - Auto-detect parser based on format
 * - Parse CV data with appropriate parser
 * - Search and filter parsers
 * - Get parser metadata and statistics
 */
@Injectable()
export class ParserRegistry {
  private parsers: Map<string, BaseParser> = new Map();
  private formatMap: Map<string, string[]> = new Map(); // format -> parser types

  constructor(
    private jsonResumeParser: JsonResumeParser,
    private yamlParser: YamlParser,
    private linkedInParser: LinkedInParser,
  ) {
    this.registerDefaultParsers();
  }

  /**
   * Register default parsers
   */
  private registerDefaultParsers(): void {
    this.register(this.jsonResumeParser);
    this.register(this.yamlParser);
    this.register(this.linkedInParser);
  }

  /**
   * Register a parser
   *
   * @param parser Parser instance
   * @throws BadRequestException if parser already registered
   */
  register(parser: BaseParser): void {
    const metadata = parser.getMetadata();

    if (this.parsers.has(metadata.type)) {
      throw new BadRequestException(
        `Parser '${metadata.type}' is already registered`,
      );
    }

    this.parsers.set(metadata.type, parser);

    // Register formats
    for (const format of metadata.supportedFormats) {
      if (!this.formatMap.has(format.toLowerCase())) {
        this.formatMap.set(format.toLowerCase(), []);
      }
      this.formatMap.get(format.toLowerCase())!.push(metadata.type);
    }
  }

  /**
   * Get parser by type
   *
   * @param type Parser type
   * @returns Parser instance
   * @throws BadRequestException if parser not found
   */
  getParser(type: string): BaseParser {
    const parser = this.parsers.get(type.toLowerCase());

    if (!parser) {
      throw new BadRequestException(
        `Parser '${type}' not found. Available parsers: ${this.getAvailableParserTypes().join(', ')}`,
      );
    }

    return parser;
  }

  /**
   * Get parsers by format
   *
   * @param format File format (e.g., 'json', 'yaml', 'csv')
   * @returns Array of parsers supporting the format
   */
  getParsersByFormat(format: string): BaseParser[] {
    const formatLower = format.toLowerCase();
    const parserTypes = this.formatMap.get(formatLower) || [];

    return parserTypes
      .map((type) => this.parsers.get(type))
      .filter((p) => p !== undefined) as BaseParser[];
  }

  /**
   * Get parsers by section support
   *
   * @param section Section name
   * @returns Array of parsers supporting the section
   */
  getParsersBySection(section: string): BaseParser[] {
    const sectionLower = section.toLowerCase();

    return Array.from(this.parsers.values()).filter((parser) =>
      parser.getSupportedSections().some((s) => s.toLowerCase() === sectionLower),
    );
  }

  /**
   * Auto-detect parser based on format
   * If multiple parsers support the format, returns the primary one
   *
   * @param format File format
   * @returns Parser instance
   * @throws BadRequestException if no parser found for format
   */
  autoDetect(format: string): BaseParser {
    const parsers = this.getParsersByFormat(format);

    if (parsers.length === 0) {
      throw new BadRequestException(
        `No parser found for format '${format}'. Supported formats: ${Array.from(this.formatMap.keys()).join(', ')}`,
      );
    }

    // Priority: json-resume > yaml > linkedin
    const priority = ['json-resume', 'yaml', 'linkedin'];
    for (const type of priority) {
      const parser = parsers.find((p) => p.getMetadata().type === type);
      if (parser) return parser;
    }

    return parsers[0];
  }

  /**
   * Parse CV data with automatic parser detection
   *
   * @param input CV data
   * @param format File format (e.g., 'json', 'yaml', 'csv')
   * @param parserType Optional specific parser type
   * @returns Parse result
   */
  async parse(
    input: any,
    format: string,
    parserType?: string,
  ): Promise<IParserResult> {
    const parser = parserType
      ? this.getParser(parserType)
      : this.autoDetect(format);

    return parser.parse(input);
  }

  /**
   * Parse with all available parsers (for comparison/validation)
   *
   * @param input CV data
   * @param format File format
   * @returns Map of parser type to parse result
   */
  async parseWithAll(
    input: any,
    format: string,
  ): Promise<Map<string, IParserResult>> {
    const results = new Map<string, IParserResult>();
    const parsers = this.getParsersByFormat(format);

    for (const parser of parsers) {
      const result = await parser.parse(input);
      results.set(parser.getMetadata().type, result);
    }

    return results;
  }

  /**
   * Search parsers by keyword
   *
   * @param keyword Search keyword
   * @returns Array of matching parsers
   */
  search(keyword: string): BaseParser[] {
    const keywordLower = keyword.toLowerCase();

    return Array.from(this.parsers.values()).filter((parser) => {
      const metadata = parser.getMetadata();
      return (
        metadata.name.toLowerCase().includes(keywordLower) ||
        metadata.type.toLowerCase().includes(keywordLower) ||
        metadata.description.toLowerCase().includes(keywordLower)
      );
    });
  }

  /**
   * Get all registered parsers
   *
   * @returns Array of all parsers
   */
  getAllParsers(): BaseParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get parser metadata
   *
   * @param type Parser type
   * @returns Parser metadata
   */
  getMetadata(type: string): IParserMetadata {
    return this.getParser(type).getMetadata();
  }

  /**
   * Get all parser metadata
   *
   * @returns Array of parser metadata
   */
  getAllMetadata(): IParserMetadata[] {
    return this.getAllParsers().map((p) => p.getMetadata());
  }

  /**
   * Get available parser types
   *
   * @returns Array of available parser types
   */
  getAvailableParserTypes(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Get available formats
   *
   * @returns Array of available formats
   */
  getAvailableFormats(): string[] {
    return Array.from(this.formatMap.keys());
  }

  /**
   * Check if parser is registered
   *
   * @param type Parser type
   * @returns True if parser is registered
   */
  hasParser(type: string): boolean {
    return this.parsers.has(type.toLowerCase());
  }

  /**
   * Check if format is supported
   *
   * @param format File format
   * @returns True if format is supported
   */
  supportsFormat(format: string): boolean {
    return this.formatMap.has(format.toLowerCase());
  }

  /**
   * Get parser statistics
   *
   * @returns Statistics object
   */
  getStatistics(): {
    totalParsers: number;
    supportedFormats: string[];
    supportedSections: Set<string>;
    parserDetails: Array<{
      type: string;
      name: string;
      formats: string[];
      sections: string[];
    }>;
  } {
    const supportedSections = new Set<string>();
    const parserDetails: Array<{
      type: string;
      name: string;
      formats: string[];
      sections: string[];
    }> = [];

    for (const parser of this.parsers.values()) {
      const metadata = parser.getMetadata();
      parserDetails.push({
        type: metadata.type,
        name: metadata.name,
        formats: metadata.supportedFormats,
        sections: metadata.supportedSections,
      });

      metadata.supportedSections.forEach((section) =>
        supportedSections.add(section),
      );
    }

    return {
      totalParsers: this.parsers.size,
      supportedFormats: this.getAvailableFormats(),
      supportedSections,
      parserDetails,
    };
  }

  /**
   * Validate parser configuration
   *
   * @returns Validation result
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.parsers.size === 0) {
      errors.push('No parsers registered');
    }

    if (this.formatMap.size === 0) {
      errors.push('No formats registered');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
