const teamService = require('../services/teamService');

class TeamController {
  async createTeam(req, res) {
    try {
      const userId = req.matchUser._id;
      const { name, logo_url } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Team name is required'
        });
      }

      const team = await teamService.createTeam(userId, name, logo_url);

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: { team }
      });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error creating team'
      });
    }
  }

  async getTeam(req, res) {
    try {
      const { id } = req.params;

      const team = await teamService.getTeam(id);

      res.status(200).json({
        success: true,
        data: { team }
      });
    } catch (error) {
      console.error('Get team error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Team not found'
      });
    }
  }

  async getMyTeams(req, res) {
    try {
      const userId = req.matchUser._id;

      const teams = await teamService.getUserTeams(userId);

      res.status(200).json({
        success: true,
        data: { teams }
      });
    } catch (error) {
      console.error('Get my teams error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving teams'
      });
    }
  }

  async addMember(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;
      const { user_id, role } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'user_id is required'
        });
      }

      const member = await teamService.addTeamMember(
        id,
        userId,
        user_id,
        role || 'player'
      );

      res.status(201).json({
        success: true,
        message: 'Team member added successfully',
        data: { member }
      });
    } catch (error) {
      console.error('Add team member error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error adding team member'
      });
    }
  }

  async removeMember(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id, user_id } = req.params;

      const result = await teamService.removeTeamMember(id, userId, user_id);

      res.status(200).json({
        success: true,
        message: 'Team member removed successfully',
        data: result
      });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error removing team member'
      });
    }
  }
}

module.exports = new TeamController();
