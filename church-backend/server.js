const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Church Booking System API');
});

app.listen(PORT, () => {
    console.log(`Server is now listening on port ${PORT}`);
});