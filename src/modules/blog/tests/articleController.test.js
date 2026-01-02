const { uploadPortfolioImage } = require('../../../config/cloudinary');

// Mock mongoose FIRST
jest.mock('mongoose', () => {
  const mockArticle = jest.fn();
  mockArticle.find = jest.fn();
  mockArticle.findOne = jest.fn();
  mockArticle.findById = jest.fn();
  mockArticle.countDocuments = jest.fn();
  // Default implementation
  mockArticle.mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis()
  }));

  const mockSchemaInstance = {
    pre: jest.fn(),
    index: jest.fn(),
    methods: {},
    statics: {},
    virtual: jest.fn().mockReturnThis(),
    set: jest.fn()
  };

  const mockSchema = jest.fn(() => mockSchemaInstance);
  mockSchema.Types = { ObjectId: 'ObjectId' };

  return {
    model: jest.fn(() => mockArticle),
    Schema: mockSchema,
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true)
      }
    }
  };
});

jest.mock('../../../config/cloudinary', () => ({
  uploadPortfolioImage: jest.fn()
}));

// Require controller and model AFTER mocks
const articleController = require('../controllers/articleController');
const Article = require('../models/Article');
const mongoose = require('mongoose');

describe('Article Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'adminId', role: 'admin' },
      file: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
    
    // Reset default mock implementation
    Article.mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnThis()
    }));
    
    // Default static mocks with chaining support
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(this.data || []); }
    };
    // Helper to chain
    Article.find.mockReturnValue(mockQuery);
    Article.findOne.mockReturnValue(mockQuery);
    Article.findById.mockReturnValue(mockQuery);
    
    // Reset mongoose mock
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  describe('createArticle', () => {
    it('should create an article successfully', async () => {
      req.body = {
        title: 'New Article',
        content: 'Content here',
        titleAr: 'مقال جديد',
        contentAr: 'محتوى'
      };
      
      const mockSave = jest.fn().mockResolvedValue(true);
      Article.mockImplementation((data) => ({
        ...data,
        save: mockSave
      }));

      await articleController.createArticle(req, res, next);

      expect(Article).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Article',
        titleAr: 'مقال جديد'
      }));
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if title is missing', async () => {
      req.body = { content: 'Content' };
      
      await articleController.createArticle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_REQUIRED_FIELDS' }));
    });

    it('should return 403 if not admin', async () => {
      req.user.role = 'user';
      req.body = { title: 'T', content: 'C' };

      await articleController.createArticle(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getArticle', () => {
    it('should get article by slug', async () => {
      req.params.id = 'some-slug';
      // Mongoose ObjectId validation should fail for slug, causing fallback to slug query
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      const mockArticleData = { 
        title: 'Some Article', 
        isPublished: true, 
        views: 0, 
        save: jest.fn(), 
        author: { _id: 'authorId' } 
      };
      
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockArticleData)
      };
      
      Article.findOne.mockReturnValue(mockQuery);

      await articleController.getArticle(req, res);

      expect(Article.findOne).toHaveBeenCalledWith(expect.objectContaining({ slug: 'some-slug' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockArticleData }));
    });

    it('should increment views if published', async () => {
      req.params.id = 'some-slug';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      const mockSave = jest.fn();
      const mockArticleData = { 
        title: 'Some Article', 
        isPublished: true, 
        views: 0, 
        save: mockSave,
        author: { _id: 'authorId' }
      };
      
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockArticleData)
      };
      
      Article.findOne.mockReturnValue(mockQuery);

      await articleController.getArticle(req, res);

      expect(mockArticleData.views).toBe(1);
      expect(mockSave).toHaveBeenCalled();
    });
    
    it('should return 404 if not found', async () => {
      req.params.id = 'not-found';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null)
      };
      Article.findOne.mockReturnValue(mockQuery);

      await articleController.getArticle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('publishArticle', () => {
    it('should publish article', async () => {
      req.params.id = 'articleId';
      const mockSave = jest.fn();
      const mockArticleData = { 
        _id: 'articleId',
        status: 'draft', 
        isPublished: false, 
        save: mockSave 
      };

      Article.findById.mockResolvedValue(mockArticleData);

      await articleController.publishArticle(req, res);

      expect(mockArticleData.status).toBe('published');
      expect(mockArticleData.isPublished).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if not admin', async () => {
      req.user.role = 'user';
      req.params.id = 'articleId';
      Article.findById.mockResolvedValue({ _id: 'articleId' });

      await articleController.publishArticle(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
