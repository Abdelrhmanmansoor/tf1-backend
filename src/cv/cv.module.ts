import { Module } from '@nestjs/common';
import { CVController } from './cv.controller';
import { CVService } from './cv.service';
import { ParserModule } from 'src/cv/parsers';
import { TemplateModule } from 'src/cv/templates';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OpenAIModule } from 'src/integrations/openai';
import { CVAIService } from './services';

/**
 * CV Module
 *
 * Provides CV management functionality including:
 * - CRUD operations
 * - Import/Export
 * - Template rendering
 * - Parser integration
 * - Public sharing
 * - AI-powered features (NEW)
 *
 * Dependencies:
 * - ParserModule (for CV parsing)
 * - TemplateModule (for template rendering)
 * - PrismaModule (for database access)
 * - OpenAIModule (for AI features)
 */
@Module({
  imports: [ParserModule, TemplateModule, PrismaModule, OpenAIModule],
  controllers: [CVController],
  providers: [CVService, CVAIService],
  exports: [CVService, CVAIService],
})
export class CVModule {}
