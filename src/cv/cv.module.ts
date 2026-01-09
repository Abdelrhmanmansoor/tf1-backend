import { Module } from '@nestjs/common';
import { CVController } from './cv.controller';
import { CVService } from './cv.service';
import { ParserModule } from 'src/cv/parsers';
import { TemplateModule } from 'src/cv/templates';
import { PrismaModule } from 'src/prisma/prisma.module';

/**
 * CV Module
 *
 * Provides CV management functionality including:
 * - CRUD operations
 * - Import/Export
 * - Template rendering
 * - Parser integration
 * - Public sharing
 *
 * Dependencies:
 * - ParserModule (for CV parsing)
 * - TemplateModule (for template rendering)
 * - PrismaModule (for database access)
 */
@Module({
  imports: [ParserModule, TemplateModule, PrismaModule],
  controllers: [CVController],
  providers: [CVService],
  exports: [CVService],
})
export class CVModule {}
