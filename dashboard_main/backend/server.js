// Try loading environment variables, but don't fail if dotenv isn't available
try {
    require('dotenv').config();
} catch (e) {
    console.log('dotenv not found, using environment variables from the system');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Check if routes exist before requiring them
let authRoutes, userDataRoutes, contactRoutes, chatbotRoutes, repbotRoutes;
try {
    authRoutes = require('./routes/auth');
    userDataRoutes = require('./routes/user-data');
    contactRoutes = require('./routes/contact');
    chatbotRoutes = require('./routes/chatbot');
    repbotRoutes = require('./routes/repbot');
} catch (e) {
    console.error('Error loading routes:', e.message);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for larger payloads

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000', 
    'http://localhost:4173',
    'https://new-5t2n.onrender.com',
    'https://www.rapidroutines-dashboard.org',
    'https://rapidroutines-dashboard.org',
    'https://www.rapidroutines.org',
    'https://rapidroutines.org',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Check for MongoDB URI
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI environment variable is not defined');
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user-data', userDataRoutes); // Register the user-data routes
app.use('/api/contact', contactRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/repbot', repbotRoutes);

// Test route
app.get('/api', (req, res) => {
    res.send('RapidRoutines API is running');
});

// Paths for serving the full website and dashboard from one backend.
const websiteRootPath = path.resolve(__dirname, '../..');
const dashboardPathCandidates = [
    path.join(websiteRootPath, 'dashboard'),
    path.resolve(__dirname, '../dist'),
];
const dashboardBuildPath = dashboardPathCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

console.log('Website root path:', websiteRootPath);
console.log('Dashboard build path:', dashboardBuildPath || '(not found)');

if (!dashboardBuildPath) {
    console.warn('Warning: dashboard build output was not found. /dashboard routes may fail until dashboard is built.');
}

function resolvePublicPath(relativePath) {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(websiteRootPath, normalized);
    if (!fullPath.startsWith(websiteRootPath)) return null;
    return fullPath;
}

// Serve dashboard SPA assets first.
if (dashboardBuildPath) {
    app.use('/dashboard', express.static(dashboardBuildPath));
}

// Serve root website static files and assets (html, css, js, images, etc.).
app.use(express.static(websiteRootPath));

// Dashboard SPA fallback.
app.get('/dashboard', (req, res) => {
    if (!dashboardBuildPath) return res.status(503).send('Dashboard build not found');
    return res.sendFile(path.join(dashboardBuildPath, 'index.html'));
});
app.get('/dashboard/*', (req, res) => {
    if (!dashboardBuildPath) return res.status(503).send('Dashboard build not found');
    return res.sendFile(path.join(dashboardBuildPath, 'index.html'));
});

// Clean URL support for static root pages (e.g. /about -> /about.html).
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    const requestPath = req.path === '/' ? '/index.html' : req.path;
    const directCandidate = resolvePublicPath(requestPath);
    if (directCandidate && fs.existsSync(directCandidate) && fs.statSync(directCandidate).isFile()) {
        return res.sendFile(directCandidate);
    }

    if (!path.extname(requestPath)) {
        const htmlCandidate = resolvePublicPath(`${requestPath}.html`);
        if (htmlCandidate && fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
            return res.sendFile(htmlCandidate);
        }
    }

    const fallback = path.join(websiteRootPath, 'index.html');
    if (fs.existsSync(fallback)) {
        return res.sendFile(fallback);
    }

    return res.status(404).send('Not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoint available at http://localhost:${PORT}/api`);
});
