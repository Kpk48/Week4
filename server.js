// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const progressRoutes = require('./routes/progress');
const userRoutes = require('./routes/users');           // NEW
const analyticsRoutes = require('./routes/analytics');   // NEW

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    // Add your production frontend URL here
].filter(Boolean);

const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // In development, allow any origin to simplify local testing
        if ((process.env.NODE_ENV || 'development') !== 'production') {
            return callback(null, true);
        }

        // In production: allow explicit list and localhost variants
        if (allowedOrigins.includes(origin) || localhostRegex.test(origin)) {
            return callback(null, true);
        }

        console.log('Blocked by CORS:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly enable preflight across all routes
app.options('*', cors());

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Smart Learning Platform API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            courses: '/api/courses',
            enrollments: '/api/enrollments',
            progress: '/api/progress',
            users: '/api/users',
            analytics: '/api/analytics'
        },
        documentation: 'See README.md for API documentation'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);           // NEW
app.use('/api/analytics', analyticsRoutes);   // NEW

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: {
                message: 'CORS policy: Access denied',
                origin: req.headers.origin
            }
        });
    }

    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// Serve static frontend (Vite build if available), then legacy public
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Legacy demo under /public
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback for client routes (only when dist exists)
if (fs.existsSync(distPath)) {
    app.get(/^(?!\/api|\/health).*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// 404 handler (after static and SPA fallback)
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            path: req.path,
            method: req.method
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Smart Learning Platform API`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
    console.log(`\nAvailable routes:`);
    console.log(`  GET  /health`);
    console.log(`  GET  /api`);
    console.log(`  POST /api/auth/login`);
    console.log(`  POST /api/auth/register`);
    console.log(`  GET  /api/courses`);
    console.log(`  GET  /api/users`);
    console.log(`  GET  /api/analytics`);
    console.log(`\nFrontend available at: http://localhost:${PORT}/`);
});