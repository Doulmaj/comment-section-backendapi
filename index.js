const express = require('express');
const path = require('path');
const userRouter = require('./routes/user');
const messageRouter = require('./routes/message');
const app = express();
require('dotenv').config();
const port = parseInt(process.env.PORT) || 8080;

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res, next) => {
    res.status(200).send(`<h1>Serveur fonctionnant sur le port ${port}</h1>`);
});

app.use('/users', userRouter);
app.use('/messages', messageRouter);
// Cela indique à Express qu'il faut gérer la ressource images de manière statique (un sous-répertoire de notre répertoire de base, __dirname) à chaque fois qu'elle reçoit une requête vers la route /images.
app.use('/databases/usersImages', express.static(path.join(__dirname, 'databases/usersImages')));
app.use('/databases/messagesImages', express.static(path.join(__dirname, 'databases/messagesImages')));

/* To avoid the cors error */
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

/* Error handler middleware */
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(err.message, err.stack);
    res.status(statusCode).json({ message: err.message });
    return;
});

app.listen(port, () => {
    console.log(`Server for comment section running on http://localhost:${port}`);
});
