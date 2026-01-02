const User = require('../../modules/shared/models/User');

jest.mock('../../modules/shared/models/User', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn()
}));

describe('Age Group Supervisor Controller', () => {
  let ageGroupSupervisorController;
  let AgeGroup, PlayerRegistration;
  let req, res;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('../../models/admin', () => ({
      AgeGroup: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn(),
        distinct: jest.fn()
      },
      PlayerRegistration: {
        findOne: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn()
      },
      TrainingSession: {
        find: jest.fn(),
        countDocuments: jest.fn()
      },
      Match: {
        find: jest.fn(),
        countDocuments: jest.fn()
      }
    }));

    const models = require('../../models/admin');
    AgeGroup = models.AgeGroup;
    PlayerRegistration = models.PlayerRegistration;

    ageGroupSupervisorController = require('../ageGroupSupervisorController');
  });

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {
        _id: 'supervisorId',
        clubId: 'clubId'
      }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('approveRegistration', () => {
    it('should approve registration when valid', async () => {
      req.params.id = 'regId';
      req.body = { notes: 'Approved' };

      const mockRegistration = {
        _id: 'regId',
        status: 'pending',
        requestedAgeGroupId: 'groupId',
        age: 10,
        approve: jest.fn(),
        save: jest.fn()
      };

      const mockAgeGroup = {
        _id: 'groupId',
        playersCount: 10,
        maxPlayers: 20,
        ageRange: { min: 8, max: 12 }
      };

      PlayerRegistration.findOne.mockResolvedValue(mockRegistration);
      AgeGroup.findById.mockResolvedValue(mockAgeGroup);
      AgeGroup.findByIdAndUpdate.mockResolvedValue({});

      await ageGroupSupervisorController.approveRegistration(req, res);

      expect(PlayerRegistration.findOne).toHaveBeenCalled();
      expect(AgeGroup.findById).toHaveBeenCalledWith('groupId');
      expect(mockRegistration.approve).toHaveBeenCalled();
      expect(mockRegistration.save).toHaveBeenCalled();
      expect(AgeGroup.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject when group is full', async () => {
      req.params.id = 'regId';
      
      const mockRegistration = {
        _id: 'regId',
        status: 'pending',
        requestedAgeGroupId: 'groupId',
        age: 10
      };

      const mockAgeGroup = {
        _id: 'groupId',
        playersCount: 20,
        maxPlayers: 20,
        ageRange: { min: 8, max: 12 }
      };

      PlayerRegistration.findOne.mockResolvedValue(mockRegistration);
      AgeGroup.findById.mockResolvedValue(mockAgeGroup);

      await ageGroupSupervisorController.approveRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'GROUP_FULL' })
      }));
    });

    it('should reject when age is mismatch', async () => {
      req.params.id = 'regId';
      
      const mockRegistration = {
        _id: 'regId',
        status: 'pending',
        requestedAgeGroupId: 'groupId',
        age: 14 // Too old
      };

      const mockAgeGroup = {
        _id: 'groupId',
        playersCount: 10,
        maxPlayers: 20,
        ageRange: { min: 8, max: 12 }
      };

      PlayerRegistration.findOne.mockResolvedValue(mockRegistration);
      AgeGroup.findById.mockResolvedValue(mockAgeGroup);

      await ageGroupSupervisorController.approveRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'AGE_MISMATCH' })
      }));
    });
  });
});
