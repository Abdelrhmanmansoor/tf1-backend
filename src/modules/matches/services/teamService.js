const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');

class TeamService {
  async createTeam(userId, name, logoUrl = null) {
    // Check if team name already exists
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      throw new Error('Team name already exists');
    }

    // Create team
    const team = await Team.create({
      name,
      logo_url: logoUrl,
      captain_id: userId,
      created_by: userId
    });

    // Add creator as captain member
    await TeamMember.create({
      team_id: team._id,
      user_id: userId,
      role: 'captain',
      status: 'active'
    });

    return team;
  }

  async getTeam(teamId) {
    const team = await Team.findById(teamId)
      .populate('captain_id', 'display_name email')
      .populate('created_by', 'display_name email');

    if (!team) {
      throw new Error('Team not found');
    }

    // Get team members
    const members = await TeamMember.find({ team_id: teamId })
      .populate('user_id', 'display_name email')
      .sort({ joined_at: 1 });

    return {
      ...team.toObject(),
      members
    };
  }

  async getUserTeams(userId) {
    const memberships = await TeamMember.find({ user_id: userId })
      .populate({
        path: 'team_id',
        populate: [
          { path: 'captain_id', select: 'display_name email' },
          { path: 'created_by', select: 'display_name email' }
        ]
      });

    return memberships.map(m => ({
      ...m.team_id.toObject(),
      role: m.role,
      status: m.status,
      joined_at: m.joined_at
    }));
  }

  async addTeamMember(teamId, captainId, userId, role = 'player') {
    // Verify team exists and user is captain
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.captain_id.toString() !== captainId.toString()) {
      throw new Error('Only the team captain can add members');
    }

    // Check if user already a member
    const existingMember = await TeamMember.findOne({
      team_id: teamId,
      user_id: userId
    });

    if (existingMember) {
      throw new Error('User is already a team member');
    }

    // Add member
    const member = await TeamMember.create({
      team_id: teamId,
      user_id: userId,
      role,
      status: 'active'
    });

    return member;
  }

  async removeTeamMember(teamId, captainId, userId) {
    // Verify team exists and user is captain
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.captain_id.toString() !== captainId.toString()) {
      throw new Error('Only the team captain can remove members');
    }

    // Cannot remove captain
    if (userId.toString() === team.captain_id.toString()) {
      throw new Error('Cannot remove the team captain');
    }

    // Remove member
    const result = await TeamMember.deleteOne({
      team_id: teamId,
      user_id: userId
    });

    if (result.deletedCount === 0) {
      throw new Error('Team member not found');
    }

    return { success: true };
  }
}

module.exports = new TeamService();
