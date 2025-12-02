const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform';

      console.log('📦 Connecting to MongoDB...');

      mongoose.set('strictQuery', false);

      const options = {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        socketTimeoutMS: 45000,
        family: 4
      };

      this.connection = await mongoose.connect(mongoUri, options);

      console.log('✅ MongoDB Connected Successfully');
      console.log(`   Database: ${mongoose.connection.db.databaseName}`);

      mongoose.connection.on('error', error => {
        console.error('❌ MongoDB Connection Error:', error.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected - attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
