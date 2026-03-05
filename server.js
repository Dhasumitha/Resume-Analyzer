const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global process error handlers to keep server alive
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// =====================================================
// SUPABASE SETUP (with fallback)
// =====================================================
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;
let supabaseAvailable = false;

// Local users store (fallback when Supabase is unreachable)
const LOCAL_USERS_FILE = path.join(__dirname, 'local_users.json');

function loadLocalUsers() {
    try {
        if (fs.existsSync(LOCAL_USERS_FILE)) {
            return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading local users:', e.message);
    }
    return {};
}

function saveLocalUsers(users) {
    try {
        fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error saving local users:', e.message);
    }
}

// Try to initialize Supabase
async function initSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('⚠️  Supabase credentials not found in .env. Using local auth fallback.');
        return;
    }

    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        // Test connection with a simple request
        const { error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
        supabaseAvailable = true;
        console.log('✅ Supabase connected successfully.');
    } catch (e) {
        supabaseAvailable = false;
        supabase = null;
        console.log('⚠️  Supabase is unreachable (' + (e.message || 'connection failed') + ').');
        console.log('   Using local auth fallback. Users will be stored in local_users.json.');
    }
}

// Generate a simple token for local auth
function generateLocalToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// OpenAI Setup
let openai;
if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('supabase')) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// Routes

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =====================================================
// AUTH: SIGNUP
// =====================================================
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Input validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        // Try Supabase first
        if (supabaseAvailable && supabase) {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: 'Software Engineer'
                        }
                    }
                });

                if (error) {
                    // Only return Supabase error for real validation issues
                    // For connection/infrastructure errors, fall through to local auth
                    const isConnectionError = error.message && (
                        error.message.toLowerCase().includes('fetch failed') ||
                        error.message.toLowerCase().includes('network') ||
                        error.message.toLowerCase().includes('timeout') ||
                        error.message.toLowerCase().includes('econnrefused') ||
                        error.message.toLowerCase().includes('enotfound')
                    );
                    if (!isConnectionError) {
                        return res.status(400).json({ message: error.message });
                    }
                    console.log('⚠️  Supabase signup connection error, falling back to local auth:', error.message);
                    // Fall through to local auth below
                } else {
                    // Supabase signup succeeded
                    return res.status(201).json({
                        message: 'User created successfully',
                        user: {
                            username: fullName,
                            email: email,
                            role: 'Software Engineer'
                        },
                        session: data.session || { access_token: 'supabase-pending-' + Date.now() }
                    });
                }
            } catch (e) {
                console.error('Supabase signup error, falling back to local:', e.message);
                // Fall through to local auth
            }
        }

        // Local fallback auth
        const users = loadLocalUsers();

        if (users[email]) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const token = generateLocalToken();

        users[email] = {
            fullName,
            email,
            password, // In production, hash this! For demo purposes only.
            role: 'Software Engineer',
            token,
            createdAt: new Date().toISOString()
        };

        saveLocalUsers(users);

        console.log(`✅ Local signup: ${email} (${fullName})`);

        return res.status(201).json({
            message: 'User created successfully',
            user: {
                username: fullName,
                email: email,
                role: 'Software Engineer'
            },
            session: {
                access_token: token
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: 'An error occurred during signup. Please try again.' });
    }
});

// =====================================================
// AUTH: LOGIN
// =====================================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Try Supabase first
        if (supabaseAvailable && supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    // Check if it's a connection error - if so, fall through to local auth
                    const isConnectionError = error.message && (
                        error.message.toLowerCase().includes('fetch failed') ||
                        error.message.toLowerCase().includes('network') ||
                        error.message.toLowerCase().includes('timeout') ||
                        error.message.toLowerCase().includes('econnrefused') ||
                        error.message.toLowerCase().includes('enotfound')
                    );
                    if (!isConnectionError) {
                        // Real auth error (wrong password, user not found, etc.)
                        // Still try local auth as the user may exist locally
                        console.log('Supabase auth rejected, trying local auth...');
                    } else {
                        console.log('⚠️  Supabase login connection error, falling back to local auth:', error.message);
                    }
                    // Fall through to local auth in both cases
                } else {
                    // Supabase login succeeded
                    const { user } = data;

                    return res.json({
                        message: 'Login successful',
                        user: {
                            username: user.user_metadata.full_name || email.split('@')[0],
                            email: user.email,
                            role: user.user_metadata.role || 'Software Engineer'
                        },
                        session: data.session
                    });
                }
            } catch (e) {
                console.error('Supabase login error, falling back to local:', e.message);
                // Fall through to local auth
            }
        }

        // Local fallback auth
        const users = loadLocalUsers();

        if (!users[email]) {
            return res.status(401).json({ message: 'No account found with this email. Please sign up first.' });
        }

        if (users[email].password !== password) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Refresh token on login
        const token = generateLocalToken();
        users[email].token = token;
        saveLocalUsers(users);

        console.log(`✅ Local login: ${email}`);

        return res.json({
            message: 'Login successful',
            user: {
                username: users[email].fullName,
                email: email,
                role: users[email].role || 'Software Engineer'
            },
            session: {
                access_token: token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'An error occurred during login. Please try again.' });
    }
});

// =====================================================
// HELPER: Get user from request
// =====================================================
async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];

    // Try Supabase
    if (supabaseAvailable && supabase) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) return user;
        } catch (e) {
            // Fall through to local
        }
    }

    // Local fallback: find user by token
    const users = loadLocalUsers();
    for (const email in users) {
        if (users[email].token === token) {
            return {
                id: email,
                email: email,
                user_metadata: {
                    full_name: users[email].fullName,
                    role: users[email].role
                }
            };
        }
    }

    return null;
}

// =====================================================
// PROFILE: Update
// =====================================================
app.post('/api/user/profile', async (req, res) => {
    const { email, username, role } = req.body;

    const user = await getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized. Please log in again.' });
    }

    // Try Supabase first
    if (supabaseAvailable && supabase) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: username, role: role })
                .eq('id', user.id);

            if (!error) {
                return res.json({
                    message: 'Profile updated successfully',
                    user: { username, email, role }
                });
            }
        } catch (e) {
            console.error('Supabase profile update error:', e.message);
        }
    }

    // Local fallback
    const users = loadLocalUsers();
    const userEmail = user.email || email;

    if (users[userEmail]) {
        users[userEmail].fullName = username;
        users[userEmail].role = role;
        saveLocalUsers(users);
    }

    res.json({
        message: 'Profile updated successfully',
        user: { username, email, role }
    });
});

// =====================================================
// RESUME: Upload & Analyze
// =====================================================
app.post('/api/resume/analyze', upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const { jobRole } = req.body;
    const user = await getUserFromRequest(req);

    const filePath = req.file.path;
    let resumeText = '';

    try {
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            resumeText = data.text;
        } else {
            resumeText = fs.readFileSync(filePath, 'utf8');
        }

        // Cleanup uploaded file
        fs.unlinkSync(filePath);

        // AI Analysis
        if (!openai) {
            // Mock response if no valid API key
            return res.json({
                score: 85,
                summary: "This is a mock analysis. Add a valid OPENAI_API_KEY to .env for real AI analysis.",
                details: {
                    compatibility: "High",
                    skills: ["Mock Skill 1", "Mock Skill 2"],
                    improvements: ["Add more keywords", "Fix formatting"]
                }
            });
        }

        const prompt = `
        Analyze the following resume for the role of "${jobRole}".
        Resume Text: "${resumeText.substring(0, 3000)}..." (truncated)
        
        Provide a JSON response with:
        - score (0-100)
        - summary (string)
        - skills (array of strings, found in resume)
        - missingSkills (array of strings, relevant to role but missing)
        - improvements (array of strings)
        - atsCompatibility (0-100)
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        const analysis = completion.choices[0].message.content;

        let analysisData;
        try {
            analysisData = JSON.parse(analysis);
        } catch (e) {
            analysisData = {
                score: 70,
                summary: analysis,
                skills: [],
                missingSkills: [],
                improvements: ["Could not parse detailed AI response."]
            };
        }

        // Save to Supabase if available
        if (user && supabaseAvailable && supabase) {
            try {
                await supabase
                    .from('resumes')
                    .insert({
                        user_id: user.id,
                        file_name: req.file.originalname,
                        file_size: req.file.size,
                        job_role: jobRole,
                        score: analysisData.score || 0,
                        analysis_data: analysisData
                    });
            } catch (e) {
                console.error('Error saving resume to DB:', e.message);
            }
        }

        res.json(analysisData);

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: 'Error analyzing resume' });
    }
});

// =====================================================
// START SERVER
// =====================================================
async function startServer() {
    await initSupabase();

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`   Auth mode: ${supabaseAvailable ? 'Supabase' : 'Local Fallback'}`);
        console.log(`   OpenAI: ${openai ? 'Configured' : 'Not configured (mock analysis)'}\n`);
    });
}


// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

startServer();
