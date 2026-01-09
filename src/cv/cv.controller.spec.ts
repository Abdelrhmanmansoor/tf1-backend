import { Test, TestingModule } from '@nestjs/testing';
import { CVController } from './cv.controller';
import { CVService } from './cv.service';
import { ParserRegistry } from './parsers/parser.registry';
import { TemplateRegistry } from './templates/template.registry';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('CVController Integration Tests', () => {
  let controller: CVController;
  let service: CVService;
  let prisma: PrismaService;

  const mockCVService = {
    createCV: jest.fn(),
    getCV: jest.fn(),
    getUserCVs: jest.fn(),
    updateCV: jest.fn(),
    deleteCV: jest.fn(),
    importCV: jest.fn(),
    renderToPDF: jest.fn(),
    renderToHTML: jest.fn(),
    exportCV: jest.fn(),
    changeTemplate: jest.fn(),
    publishCV: jest.fn(),
    getPublicCV: jest.fn(),
    getCVVersions: jest.fn(),
    getCVStatistics: jest.fn(),
    getParsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CVController],
      providers: [
        { provide: CVService, useValue: mockCVService },
        {
          provide: PrismaService,
          useValue: {
            cV: { create: jest.fn(), findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = module.get<CVController>(CVController);
    service = module.get<CVService>(CVService);
  });

  describe('CV CRUD Operations', () => {
    it('should create a CV', async () => {
      const createCVDto = {
        title: 'My CV',
        data: {
          personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
          experience: [],
          education: [],
          skills: [],
        },
      };
      const userId = 'user-123';

      mockCVService.createCV.mockResolvedValue({
        id: 'cv-123',
        ...createCVDto,
        userId,
      });

      const result = await controller.createCV(createCVDto, { user: { id: userId } });

      expect(mockCVService.createCV).toHaveBeenCalledWith(userId, createCVDto.data, undefined);
      expect(result.id).toBe('cv-123');
    });

    it('should get CV by id', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const cvData = {
        id: cvId,
        userId,
        title: 'My CV',
        data: {},
      };

      mockCVService.getCV.mockResolvedValue(cvData);

      const result = await controller.getCV(cvId, { user: { id: userId } });

      expect(mockCVService.getCV).toHaveBeenCalledWith(cvId, userId);
      expect(result.id).toBe(cvId);
    });

    it('should list user CVs', async () => {
      const userId = 'user-123';
      const cvs = [
        { id: 'cv-1', title: 'CV 1' },
        { id: 'cv-2', title: 'CV 2' },
      ];

      mockCVService.getUserCVs.mockResolvedValue({
        data: cvs,
        total: 2,
        page: 1,
        limit: 10,
      });

      const result = await controller.getUserCVs(1, 10, { user: { id: userId } });

      expect(mockCVService.getUserCVs).toHaveBeenCalledWith(userId, 10, 0);
      expect(result.data).toHaveLength(2);
    });

    it('should update CV', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const updateCVDto = {
        data: { personalInfo: { fullName: 'Jane Doe' } },
      };

      const updated = {
        id: cvId,
        ...updateCVDto,
        userId,
      };

      mockCVService.updateCV.mockResolvedValue(updated);

      const result = await controller.updateCV(cvId, updateCVDto, { user: { id: userId } });

      expect(mockCVService.updateCV).toHaveBeenCalledWith(cvId, userId, updateCVDto.data);
      expect(result.id).toBe(cvId);
    });

    it('should delete CV', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';

      mockCVService.deleteCV.mockResolvedValue({ success: true });

      const result = await controller.deleteCV(cvId, { user: { id: userId } });

      expect(mockCVService.deleteCV).toHaveBeenCalledWith(cvId, userId);
      expect(result.success).toBe(true);
    });
  });

  describe('Import and Export Operations', () => {
    it('should import CV from file', async () => {
      const userId = 'user-123';
      const file = {
        fieldname: 'file',
        originalname: 'resume.json',
        mimetype: 'application/json',
        buffer: Buffer.from('{}'),
      } as any;

      mockCVService.importCV.mockResolvedValue({
        id: 'cv-123',
        title: 'Imported CV',
        data: {},
      });

      const result = await controller.importCV(
        { format: 'auto' },
        file,
        { user: { id: userId } }
      );

      expect(mockCVService.importCV).toHaveBeenCalled();
      expect(result.id).toBe('cv-123');
    });

    it('should export CV to PDF', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';

      const pdfBuffer = Buffer.from('PDF content');
      mockCVService.renderToPDF.mockResolvedValue(pdfBuffer);

      const result = await controller.exportPDF(cvId, {}, { user: { id: userId } });

      expect(mockCVService.renderToPDF).toHaveBeenCalledWith(cvId, userId, undefined);
    });

    it('should export CV to HTML', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';

      const htmlContent = '<html><body>CV</body></html>';
      mockCVService.renderToHTML.mockResolvedValue(htmlContent);

      const result = await controller.exportHTML(cvId, {}, { user: { id: userId } });

      expect(mockCVService.renderToHTML).toHaveBeenCalledWith(cvId, userId, undefined);
    });

    it('should export CV to JSON', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const cvData = { id: cvId, data: {} };

      mockCVService.exportCV.mockResolvedValue(cvData);

      const result = await controller.exportJSON(cvId, { user: { id: userId } });

      expect(mockCVService.exportCV).toHaveBeenCalledWith(cvId, userId, 'json');
    });
  });

  describe('Template Operations', () => {
    it('should get templates list', async () => {
      const templates = [
        { id: 'template-1', name: 'Awesome CV' },
        { id: 'template-2', name: 'Modern CV' },
      ];

      mockCVService.getParsers.mockResolvedValue(templates);

      const result = await controller.getTemplates();

      expect(result).toHaveLength(2);
    });

    it('should change template', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const templateId = 'template-2';

      mockCVService.changeTemplate.mockResolvedValue({
        id: cvId,
        templateId,
      });

      const result = await controller.changeTemplate(
        cvId,
        { templateId },
        { user: { id: userId } }
      );

      expect(mockCVService.changeTemplate).toHaveBeenCalledWith(cvId, userId, templateId);
    });
  });

  describe('Publishing Operations', () => {
    it('should publish CV', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const publicToken = 'public-token-123';

      mockCVService.publishCV.mockResolvedValue({
        id: cvId,
        publicToken,
        isPublished: true,
      });

      const result = await controller.publishCV(cvId, {}, { user: { id: userId } });

      expect(mockCVService.publishCV).toHaveBeenCalledWith(cvId, userId);
      expect(result.publicToken).toBe(publicToken);
    });

    it('should get public CV without auth', async () => {
      const publicToken = 'public-token-123';
      const cvData = {
        id: 'cv-123',
        personalInfo: { fullName: 'John Doe' },
      };

      mockCVService.getPublicCV.mockResolvedValue(cvData);

      const result = await controller.getPublicCV(publicToken);

      expect(mockCVService.getPublicCV).toHaveBeenCalledWith(publicToken);
      expect(result.id).toBe('cv-123');
    });

    it('should get public CV as PDF', async () => {
      const publicToken = 'public-token-123';
      const pdfBuffer = Buffer.from('PDF content');

      mockCVService.renderToPDF.mockResolvedValue(pdfBuffer);

      const result = await controller.getPublicCVPDF(publicToken);

      expect(mockCVService.renderToPDF).toHaveBeenCalled();
    });
  });

  describe('Version Operations', () => {
    it('should get CV versions', async () => {
      const cvId = 'cv-123';
      const userId = 'user-123';
      const versions = [
        { id: 'v1', versionNumber: 1, createdAt: new Date() },
        { id: 'v2', versionNumber: 2, createdAt: new Date() },
      ];

      mockCVService.getCVVersions.mockResolvedValue(versions);

      const result = await controller.getCVVersions(cvId, { user: { id: userId } });

      expect(mockCVService.getCVVersions).toHaveBeenCalledWith(cvId, userId);
      expect(result).toHaveLength(2);
    });
  });

  describe('Statistics Operations', () => {
    it('should get CV statistics', async () => {
      const userId = 'user-123';
      const stats = {
        totalCVs: 5,
        totalVersions: 15,
        mostUsedTemplate: 'template-1',
        lastModified: new Date(),
      };

      mockCVService.getCVStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics({ user: { id: userId } });

      expect(mockCVService.getCVStatistics).toHaveBeenCalledWith(userId);
      expect(result.totalCVs).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle CV not found', async () => {
      const cvId = 'non-existent';
      const userId = 'user-123';

      mockCVService.getCV.mockRejectedValue(new Error('CV not found'));

      await expect(controller.getCV(cvId, { user: { id: userId } })).rejects.toThrow(
        'CV not found'
      );
    });

    it('should handle unauthorized access', async () => {
      const cvId = 'cv-123';
      const userId = 'other-user';

      mockCVService.getCV.mockRejectedValue(new Error('Unauthorized'));

      await expect(controller.getCV(cvId, { user: { id: userId } })).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('should handle invalid file format', async () => {
      const userId = 'user-123';
      const file = {
        fieldname: 'file',
        originalname: 'resume.txt',
        buffer: Buffer.from('invalid'),
      } as any;

      mockCVService.importCV.mockRejectedValue(new Error('Unsupported file format'));

      await expect(
        controller.importCV({ format: 'auto' }, file, { user: { id: userId } })
      ).rejects.toThrow('Unsupported file format');
    });
  });
});
