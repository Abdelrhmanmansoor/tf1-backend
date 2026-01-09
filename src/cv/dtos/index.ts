import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CVData } from 'src/cv/parsers';

/**
 * Create CV DTO
 */
export class CreateCVDto {
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  data: CVData;

  @IsOptional()
  @IsString()
  templateId?: string;
}

/**
 * Update CV DTO
 */
export class UpdateCVDto {
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  data: CVData;
}

/**
 * Import CV DTO
 */
export class ImportCVDto {
  @IsString()
  format: 'json' | 'yaml' | 'csv';

  @IsString()
  fileContent: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}

/**
 * Export CV DTO
 */
export class ExportCVDto {
  @IsString()
  format: 'pdf' | 'html' | 'json';

  @IsOptional()
  @IsString()
  templateId?: string;
}

/**
 * Change Template DTO
 */
export class ChangeTemplateDto {
  @IsString()
  templateId: string;
}

/**
 * Publish CV DTO
 */
export class PublishCVDto {
  @IsOptional()
  @IsString()
  password?: string;
}
