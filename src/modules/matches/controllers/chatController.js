const chatService = require('../services/chatService');

class ChatController {
  async getMessages(req, res) {
    try {
      const { id } = req.params;
      const { team_id, limit } = req.query;

      const messages = await chatService.getMatchMessages(
        id,
        team_id || null,
        limit ? parseInt(limit) : 100
      );

      res.status(200).json({
        success: true,
        data: { messages }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving messages'
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;
      const { body, team_id } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message body is required'
        });
      }

      const message = await chatService.sendMessage(
        id,
        userId,
        body.trim(),
        team_id || null
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error sending message'
      });
    }
  }
}

module.exports = new ChatController();
