const matchService = require('../services/matchService');
const matchController = require('../controllers/matchController');

// Mock Mongoose model Location
const mockLocationFindById = jest.fn();
jest.mock('../../../models/Location', () => ({
  findById: mockLocationFindById
}));

describe('MatchController.createMatch', () => {
  let req, res;
  let createMatchSpy;

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
    
    // Spy on matchService.createMatch
    createMatchSpy = jest.spyOn(matchService, 'createMatch').mockImplementation(async () => ({
        _id: '507f1f77bcf86cd799439014',
        title: 'Test Match',
        venue: 'Field 1'
    }));

    jest.clearAllMocks();
  });

  afterEach(() => {
    createMatchSpy.mockRestore();
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
    expect(createMatchSpy).toHaveBeenCalledWith(
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

  it('should return 400 if location_id is missing in new format', async () => {
    req.body.location_id = undefined;
    
    await matchController.createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'location_id is required'
    }));
  });
});
