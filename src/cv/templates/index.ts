/**
 * Template System Index
 * Exports all template classes and services
 */

// Base template
export { BaseTemplate, ITemplate, RenderOptions } from './base.template';

// Template classes (9 templates)
export { AwesomeCVTemplate } from './awesome-cv.template';
export { ModernCVTemplate } from './modern-cv.template';
export { ClassicTemplate } from './classic.template';
export { MinimalTemplate } from './minimal.template';
export { CreativeTemplate } from './creative.template';
export { SimpleTemplate } from './simple.template';
export { ElegantTemplate } from './elegant.template';
export { TechTemplate } from './tech.template';
export { ExecutiveTemplate } from './executive.template';

// Services
export { TemplateRegistry } from './template.registry';
export { TemplateRenderingService, RenderResult } from './template-rendering.service';

// Module
export { TemplateModule } from './template.module';
