const ChatMessage = require('../models/ChatMessage');
const Match = require('../models/Match');
const Participation = require('../models/Participation');

class ChatService {
  async sendMessage(matchId, userId, body, teamId = null) {
    // Check if match exists
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Check if user is a participant
    const participation = await Participation.findOne({
      match_id: matchId,
      user_id: userId
    });

    if (!participation) {
      throw new Error('Only participants can send messages');
    }

    // Create message
    const message = await ChatMessage.create({
      match_id: matchId,
      team_id: teamId,
      user_id: userId,
      body
    });

    // Populate user info
    await message.populate('user_id', 'display_name email');

    // Socket.io broadcast
    if (global.io) {
      const room = teamId ? `matches:${matchId}:team:${teamId}` : `matches:${matchId}`;
      global.io.to(room).emit('chat_message', {
        match_id: matchId,
        team_id: teamId,
        message: message
      });
    }

    return message;
  }

  async getMatchMessages(matchId, teamId = null, limit = 100) {
    const query = { match_id: matchId };
    
    if (teamId) {
      query.team_id = teamId;
    } else {
      // Only get messages without team_id (public chat)
      query.team_id = null;
    }

    const messages = await ChatMessage.find(query)
      .populate('user_id', 'display_name email')
      .sort({ created_at: -1 })
      .limit(limit);

    return messages.reverse();
  }
}

module.exports = new ChatService();
