/**
 * Template Module
 * NestJS module for CV template system
 */

import { Module } from '@nestjs/common';
import TemplateRegistry from './template.registry';
import TemplateRenderingService from './template-rendering.service';

@Module({
  providers: [TemplateRegistry, TemplateRenderingService],
  exports: [TemplateRegistry, TemplateRenderingService],
})
export class TemplateModule {}
