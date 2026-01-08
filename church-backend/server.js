const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://church-booking.netlify.app",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === "admin@church.com" && password === "password123") {
        return res.json({
            user: { id: "1", name: "Admin User", email: email },
            token: "mock-jwt-token-123"
        });
    }

    res.status(401).json({ error: "Invalid email or password" });
});

app.post('/api/auth/register', (req, res) => {
    res.status(200).json({ message: "Registration endpoint ready" });
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
