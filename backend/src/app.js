require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Import configurations
const prisma = require('./config/database');
const { initSocket } = require('./config/socket');
const { errorMiddleware } = require('./middlewares/error.middleware');

// Import routes
const routes = require('./routes');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            process.env.NGROK_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:5173'
        ];

        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Auto-allow ngrok domains
        if (origin.endsWith('.ngrok-free.app')) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'CaffeeOS API',
        version: '1.0.0',
        status: 'running',
        docs: '/api/v1/health',
    });
});

// Error handling middleware
app.use(errorMiddleware);

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ☕ CaffeeOS Backend Server                               ║
║                                                            ║
║   Local:    http://localhost:${PORT}                         ║
║   API:      http://localhost:${PORT}/api/v1                  ║
║   Health:   http://localhost:${PORT}/api/v1/health           ║
║                                                            ║
║   Socket.io: Enabled                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

startServer();

module.exports = { app, server, io };
