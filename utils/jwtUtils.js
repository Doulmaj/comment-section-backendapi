const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../db');
const TOKEN_SECRET = process.env.TOKEN_SECRET;

function generateTokenForUser(user) {
    return jwt.sign(
        {
            userId: user.id,
            isAdmin: user.isAdmin,
        },
        TOKEN_SECRET,
        {
            expiresIn: '1h', //validité du token 1h
        },
    );
}

/* middlexare de vérification de token */
async function tokenValidation(req, res, next) {
    let authorization = req.headers.authorization;
    let token;
    if (!authorization) {
        return res.status(401).json({ error: 'missing token' });
    }
    try {
        token = authorization.split(' ')[1];
        //verification token
        const decodedToken = jwt.verify(token, TOKEN_SECRET);
        const userId = decodedToken.userId;
        const isAdmin = decodedToken.isAdmin;

        //on vérifie si la session utilisatrice avec ce token est en cours
        try {
            const [rows] = await pool.query('SELECT * FROM sessions WHERE userId = ? and validity = ?', [userId, 1]);
            if (rows.length === 0) {
                return res.status(401).json({ error: 'No ongoing session for this user' });
            }
            if (rows.length > 1) {
                return res.status(500).json({ error: 'internal server error' });
            }
            if (rows.length === 1) {
                //Dans ce cas l'utilisateur a une session en cour et donc
                //Nous extrayons l'ID utilisateur de notre token et le rajoutons à l’objet Request afin que nos différentes routes puissent l’exploiter
                req.auth = {
                    userId: userId,
                    isAdmin: isAdmin,
                };
                next();
            }
        } catch (error) {
            return res.status(500).json({ error });
        }
    } catch (error) {
        return res.status(401).json({ error });
    }
}

//Middleware de vérification de la présence d'un token et de sa validation

async function tokenPresence(req, res, next) {
    let authorization = req.headers.authorization;
    let token;
    if (authorization === undefined) {
        req.auth = {
            userId: null,
            isAdmin: 0,
        };
        next();
        return;
    }
    try {
        token = authorization.split(' ')[1];
        //verification token
        const decodedToken = jwt.verify(token, TOKEN_SECRET);
        const userId = decodedToken.userId;
        const isAdmin = decodedToken.isAdmin;

        //on vérifie si la session utilisatrice avec ce token est en cours
        try {
            const [rows] = await pool.query('SELECT * FROM sessions WHERE userId = ? and validity = ?', [userId, 1]);
            if (rows.length === 0) {
                req.auth = {
                    userId: null,
                    isAdmin: 0,
                };
                next();
                return;
            }
            if (rows.length > 1) {
                return res.status(500).json({ error: 'internal server error' });
            }
            if (rows.length === 1) {
                //Dans ce cas l'utilisateur a une session en cour et donc
                //Nous extrayons l'ID utilisateur de notre token et le rajoutons à l’objet Request afin que nos différentes routes puissent l’exploiter
                req.auth = {
                    userId: userId,
                    isAdmin: isAdmin,
                };
                next();
                return;
            }
        } catch (error) {
            return res.status(500).json({ error });
        }
    } catch (error) {
        console.error(error);
        req.auth = {
            userId: null,
            isAdmin: 0,
        };
        next();
    }
}

module.exports = {
    generateTokenForUser,
    tokenValidation,
    tokenPresence,
};
