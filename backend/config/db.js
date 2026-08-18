const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

// Set reliable public DNS resolvers to handle MongoDB Atlas SRV lookup on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS cannot be set in some sandbox environments
}

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = {
  connectDB,
  getConnectionStatus: () => isConnected || mongoose.connection.readyState === 1
};
