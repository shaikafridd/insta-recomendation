const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

const startServer = async () => {
  try {
    // Initialize MongoDB Connection
    await connectDB();

    // Start Express listener
    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Reels Interest-Recommender API Server is running!`);
      console.log(`📡 Port: ${env.PORT}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health Check: http://localhost:${env.PORT}/health`);
      console.log(`====================================================`);
    });

    // Graceful shutdown
    const handleShutdown = () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
};

startServer();
