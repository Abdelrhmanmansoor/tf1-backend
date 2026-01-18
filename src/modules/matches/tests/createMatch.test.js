// Mock Mongoose model Location
const mockLocationFindById = jest.fn();
jest.mock('../../../models/Location', () => ({
  findById: mockLocationFindById
}));

const mockValidateCity = jest.fn();
const mockValidateArea = jest.fn();
jest.mock('../services/locationService', () => ({
  validateCity: (...args) => mockValidateCity(...args),
  validateArea: (...args) => mockValidateArea(...args),
}));

const mockCreateMatch = jest.fn();
jest.mock('../services/matchService', () => ({
  createMatch: (...args) => mockCreateMatch(...args),
}));

jest.resetModules();

const matchController = require('../controllers/matchController');

describe('MatchController.createMatch', () => {
  let req, res;

  beforeEach(() => {
    req = {
      matchUser: { _id: '507f1f77bcf86cd799439011' }, // Valid ObjectId string
      body: {
        title: 'Test Match',
        sport: 'football',
        city: 'Riyadh',
        area: 'Al Malqa',
        location: 'KSU',
        date: '2026-06-01',
        time: '18:00',
        level: 'intermediate',
        max_players: 10,
        notes: 'Test notes',
        venue: 'Field 1',
        location_id: '507f1f77bcf86cd799439012' // Valid ObjectId string
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockCreateMatch.mockResolvedValue({
      _id: '507f1f77bcf86cd799439014',
      title: 'Test Match',
      venue: 'Field 1',
    });

  });

  it('should create a match with new format and include venue', async () => {
    // Mock Location.findById results
    mockLocationFindById.mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439012',
        level: 'city',
        name_en: 'Riyadh',
        parent_id: '507f1f77bcf86cd799439013'
    });
    // Second call for parent (region)
    mockLocationFindById.mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439013',
        name_en: 'Riyadh Region'
    });

    await matchController.createMatch(req, res);

    // Verify Location lookup was called
    expect(mockLocationFindById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');

    // Verify matchService.createMatch was called with correct data
    expect(mockCreateMatch).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011', // userId
        expect.objectContaining({
            venue: 'Field 1',
            location_id: '507f1f77bcf86cd799439012',
            owner_id: '507f1f77bcf86cd799439011',
            sport: 'football'
        }),
        true // isNewFormat
    );

    // Verify response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
    }));
  });

  it('should create match without location_id (using default values)', async () => {
    req.body.location_id = undefined;

    mockValidateCity.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439013',
      name_en: 'Riyadh',
      name_ar: 'الرياض',
    });
    mockValidateArea.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439012',
      name_en: 'Al Malqa',
      name_ar: 'الملقا',
    });
    
    await matchController.createMatch(req, res);

    // Verify matchService.createMatch was called
    expect(mockCreateMatch).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
            city: 'Riyadh',
            area: 'Al Malqa',
            location: 'KSU'
        }),
        true
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
    }));
  });
});
