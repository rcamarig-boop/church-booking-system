const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 1. IMPROVED CORS: Allows your Netlify app and local testing
const allowedOrigins = ["https://church-booking.netlify.app", "http://localhost:3000"];
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// 2. TEMPORARY DATABASE (Resets when server restarts)
const users = [
    { id: "1", name: "Admin User", email: "admin@church.com", password: "password123" }
];

const PORT = process.env.PORT || 3000;

// 3. WORKING LOGIN LOGIC
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Find user in our "database"
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        return res.json({
            user: { id: user.id, name: user.name, email: user.email },
            token: "mock-jwt-token-" + Date.now() // Fake token for frontend
        });
    }

    res.status(401).json({ error: "Invalid email or password" });
});

// 4. WORKING REGISTER LOGIC
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ error: "User already exists" });
    }

    const newUser = { id: Date.now().toString(), name, email, password };
    users.push(newUser); // Saves user to the local array

    res.status(201).json({ message: "User registered successfully", user: { id: newUser.id, name } });
});

app.get('/api/bookings', (req, res) => {
    res.json([]);
});

app.get('/', (req, res) => {
    res.send('Church Booking System API is Running');
});

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.userId);
    });
});

server.listen(PORT, () => {
    console.log(`Server is now listening on port ${PORT}`);
});

app.get('/api/bookings', (req, res) => {
    res.json([]);
});

app.get('/', (req, res) => {
    res.send('Church Booking System API is Running');
});

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.userId);
    });
});

server.listen(PORT, () => {
    console.log(`Server is now listening on port ${PORT}`);
});
