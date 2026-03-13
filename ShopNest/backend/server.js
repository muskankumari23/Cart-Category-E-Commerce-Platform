const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'shopnest_super_secret_key_123'; // Replace with env variable in production

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'shopnest.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Initialize tables
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isEmailVerified INTEGER DEFAULT 0,
            isPhoneVerified INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            }
        });
        
        // OTP store mapping phone -> OTP code 
        db.run(`CREATE TABLE IF NOT EXISTS otps (
            phone TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            expiresAt DATETIME NOT NULL
        )`);
    }
});

// Helper for sending responses
const sendResponse = (res, status, success, message, data = null) => {
    return res.status(status).json({ success, message, data });
};

// =======================
// AUTH ROUTES
// =======================

// 1. Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;
        
        // Basic validation
        if (!fullName || !email || !phone || !password) {
            return sendResponse(res, 400, false, "All fields are required.");
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into database
        const sql = `INSERT INTO users (fullName, email, phone, password) VALUES (?, ?, ?, ?)`;
        db.run(sql, [fullName, email, phone, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.email')) {
                    return sendResponse(res, 400, false, "Email already exists.");
                } else if (err.message.includes('UNIQUE constraint failed: users.phone')) {
                    return sendResponse(res, 400, false, "Phone number already exists.");
                }
                console.error(err);
                return sendResponse(res, 500, false, "Database error occurred.");
            }
            
            // Mock Email Verification Logic
            console.log(`\n======================================`);
            console.log(`[EMAIL DISPATCH SYSTEM - SIMULATION]`);
            console.log(`To: ${email}`);
            console.log(`Subject: Verify your ShopNest Account`);
            console.log(`Body: Click the link to verify: http://localhost:${PORT}/api/auth/verify-email?email=${encodeURIComponent(email)}`);
            console.log(`======================================\n`);

            return sendResponse(res, 201, true, "Registration successful. Please check your email to verify your account.");
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Mock Email Verification (GET for clickability via console link)
app.get('/api/auth/verify-email', (req, res) => {
    const { email } = req.query;
    if (!email) return res.send("Invalid verification link.");

    db.run(`UPDATE users SET isEmailVerified = 1 WHERE email = ?`, [email], function(err) {
        if (err) return res.send("Error verifying email.");
        if (this.changes === 0) return res.send("User not found.");
        
        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #22C55E;">Email Verified Successfully!</h1>
                <p>You can now close this tab and log in to ShopNest.</p>
                <script>setTimeout(() => { window.close(); }, 3000);</script>
            </div>
        `);
    });
});

// 3. Login with Email
app.post('/api/auth/login-email', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendResponse(res, 400, false, "Email and password are required.");
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return sendResponse(res, 500, false, "Database error.");
        if (!user) return sendResponse(res, 404, false, "Invalid email or password.");
        
        if (!user.isEmailVerified) {
            return sendResponse(res, 403, false, "Please verify your email address before logging in.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return sendResponse(res, 400, false, "Invalid email or password.");

        const token = jwt.sign({ id: user.id, enum: user.email }, JWT_SECRET, { expiresIn: '7d' });

        return sendResponse(res, 200, true, "Login successful.", {
            token,
            user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
        });
    });
});

// 4. Send OTP (Phone Login)
app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    
    if (!phone) return sendResponse(res, 400, false, "Phone number is required.");

    // Check if phone exists
    db.get(`SELECT * FROM users WHERE phone = ?`, [phone], (err, user) => {
        if (err) return sendResponse(res, 500, false, "Database error.");
        if (!user) return sendResponse(res, 404, false, "Phone number not registered.");

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Expiry in 5 mins
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        db.run(`INSERT OR REPLACE INTO otps (phone, otp, expiresAt) VALUES (?, ?, ?)`, [phone, otp, expiresAt], (err) => {
            if (err) return sendResponse(res, 500, false, "Failed to generate OTP.");

            // Mock SMS API Request
            console.log(`\n======================================`);
            console.log(`[SMS DISPATCH SYSTEM - SIMULATION]`);
            console.log(`To: ${phone}`);
            console.log(`Message: ${otp} is your ShopNest verification code. Valid for 5 minutes.`);
            console.log(`======================================\n`);

            return sendResponse(res, 200, true, "OTP sent successfully.");
        });
    });
});

// 5. Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) return sendResponse(res, 400, false, "Phone and OTP are required.");

    db.get(`SELECT * FROM otps WHERE phone = ?`, [phone], (err, record) => {
        if (err) return sendResponse(res, 500, false, "Database error.");
        if (!record) return sendResponse(res, 400, false, "No pending OTP request found.");

        const now = new Date().toISOString();
        if (now > record.expiresAt) {
            return sendResponse(res, 400, false, "OTP has expired.");
        }

        if (record.otp !== otp) {
            return sendResponse(res, 400, false, "Invalid OTP.");
        }

        // OTP Valid - Get user and generate token
        db.get(`SELECT * FROM users WHERE phone = ?`, [phone], (err, user) => {
            if (err || !user) return sendResponse(res, 500, false, "Error retrieving user data.");

            // Mark phone as verified if it wasn't
            if (!user.isPhoneVerified) {
                db.run(`UPDATE users SET isPhoneVerified = 1 WHERE phone = ?`, [phone]);
            }
            
            // Delete OTP record since it's used
            db.run(`DELETE FROM otps WHERE phone = ?`, [phone]);

            const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

            return sendResponse(res, 200, true, "Login successful.", {
                token,
                user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
            });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`ShopNest Auth Backend running on http://localhost:${PORT}`);
});
