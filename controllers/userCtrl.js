const bcrypt = require('bcrypt');
const jwtUtils = require('../utils/jwtUtils');
const pool = require('../db');
const { json } = require('express');
require('dotenv').config();

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

async function register(req, res, next) {
    const defaultImageUrl = `${req.protocol}://${req.get('host')}/databases/usersImages/Default.png`;
    let object, imageUrl;
    if (req.file) {
        object = req.body;
        imageUrl = `${req.protocol}://${req.get('host')}/databases/usersImages/${req.file.filename}`;
    } else {
        object = req.body;
        imageUrl = defaultImageUrl;
    }

    const username = object.username.trim();
    const password = object.password;
    const email = object.email.trim();
    const description = object.description.trim();
    if (username == null || password == null || email == null) {
        return res.status(400).json({ error: 'missing parameters' });
    }

    if (username.length < 3 || username.length > 100) {
        return res.status(400).json({ error: 'username must be 3 - 100 length' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'invalid mail address' });
    }
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: 'password must at least have 8 caracters, including at least a lowercase letter, an uppercase letter, a special caracter and at least on digit',
        });
    }

    try {
        const [row] = await pool.query('SELECT username FROM users WHERE username = ?', [username]);
        if (row.length > 0) {
            return res.status(403).json({ error: 'username already in use' });
        }
    } catch (error) {
        return res.status(500).json({ error });
    }

    try {
        const [row] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
        if (row.length > 0) {
            return res.status(403).json({ error: 'email already in use' });
        }
    } catch (error) {
        return res.status(500).json({ error });
    }

    const cryptedPassword = await bcrypt.hash(password, 12);
    try {
        const [result] = await pool.query('INSERT INTO users (username, email, password, description, profil) VALUES(?,?,?,?,?)', [username, email, cryptedPassword, description, imageUrl]);
        res.status(201).json({
            message: 'user added succesfully',
            userId: result.insertId,
        });
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

async function login(req, res, next) {
    const username = req.body.username;
    const password = req.body.password;
    try {
        const [rows] = await pool.query('SELECT id,username,email,password,description, profil,isAdmin FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            res.status(400).json({ error: 'wrong username or password' });
        } else {
            const user = rows[0];
            try {
                const userId = user.id;
                const valid = await bcrypt.compare(password, user.password);
                if (!valid) {
                    res.status(400).json({
                        error: 'wrong username or password',
                    });
                } else {
                    try {
                        const [session] = await pool.query('SELECT * FROM sessions WHERE userId = ? and validity = ?', [userId, 1]);
                        if (session.length === 1) {
                            //Dans ce cas une session utilisatrice est déjà en cour donc il faut l'arrêter d'abord
                            try {
                                //on annule la session en cour
                                const [result] = await pool.query('UPDATE sessions SET validity = ? WHERE userId = ?', [0, userId]);
                                if (result.affectedRows <= 0) {
                                    return res.status(500).json({ error: 'Error while stopping user previous session' });
                                }
                            } catch (error) {
                                return res.status(500).json({ error });
                            }
                        }
                        //Enfin, je créée une nouvelle session utilisatrice avec un nouveau token et j'enregistre ses informations
                        try {
                            const token = jwtUtils.generateTokenForUser(user);
                            const [newSession] = await pool.query('INSERT INTO sessions (token, validity, userId ) VALUES (?,?,?) ', [token, 1, userId]);
                            if (newSession.affectedRows) {
                                return res.status(200).json({ token: token });
                            } else {
                                return res.status(500).json({ error: "error while registering user's connection parameters" });
                            }
                        } catch (error) {
                            return res.status(500).json({ error });
                        }
                    } catch (error) {}
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getProfile(req, res, next) {
    let userId = parseInt(req.auth.userId);
    try {
        const [rows] = await pool.query('SELECT username, email, description, profil, isAdmin FROM users WHERE id = ?', [userId]);
        if (!rows[0]) {
            return res.status(404).json({ error: 'user not found' });
        } else {
            return res.status(200).json(rows[0]);
        }
    } catch (error) {
        return res.status(500).json({ error });
    }
}

async function updateUserProfile(req, res, next) {
    let userId = parseInt(req.auth.userId);
    try {
        const [rows] = await pool.query('SELECT username, email, description, profil, isAdmin FROM users WHERE id = ?', [userId]);
        if (!rows[0]) {
            return res.status(404).json({ error: 'user not found' });
        } else {
            let oldUser = rows[0];
            let object, imageUrl;
            defaultImageUrl = oldUser.profil;
            if (req.file) {
                object = req.body;
                imageUrl = `${req.protocol}://${req.get('host')}/databases/usersImages/${req.file.filename}`;
            } else {
                object = req.body;
                imageUrl = defaultImageUrl;
            }
            let email = object.email.trim() || oldUser.email;
            let description = object.description.trim() || oldUser.description;
            let profil = imageUrl == defaultImageUrl ? defaultImageUrl : imageUrl;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'invalid mail address' });
            }
            if (email === oldUser.email && description === oldUser.description && profil === oldUser.profil) {
                return res.status(400).json({ error: 'missing parameters' });
            }

            try {
                const [row] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
                if (row.length > 0) {
                    return res.status(403).json({ error: 'email already in use' });
                }
            } catch (error) {
                return res.status(500).json({ error });
            }

            try {
                const [rows] = await pool.query('UPDATE users SET email = ?, description = ?, profil = ? WHERE id = ?', [email, description, profil, userId]);
                if (rows.affectedRows > 0) {
                    return res.status(200).json({ message: 'user profile has been updated' });
                } else {
                    return res.status(404).json({ message: 'user not found' });
                }
            } catch (error) {
                return res.status(500).json({ error });
            }
        }
    } catch (error) {
        return res.status(500).json({ error });
    }
}
async function logout(req, res, next) {
    let userId = req.auth.userId;
    console.log(typeof userId);
    try {
        const [rows] = await pool.query('SELECT * FROM sessions WHERE userId = ? and validity = ?', [userId, 1]);
        if (!rows[0]) {
            return res.status(401).json({ error: 'No ongoing session for this user' });
        }
        if (rows.length > 1) {
            return res.status(500).json({ error: 'internal server error' });
        }
        if (rows.length === 1) {
            //Dans ce cas l'utilisteur a une session valide en cour
            try {
                //on annule la session en cour
                const [result] = await pool.query('UPDATE sessions SET validity = ? WHERE userId = ?', [0, userId]);
                if (result.affectedRows > 0) {
                    return res.status(200).json({ message: 'Successful log out' });
                } else {
                    return res.status(500).json({ error: 'Error while logging out' });
                }
            } catch (error) {
                return res.status(500).json({ error: error.message, stack: error.stack });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
}

module.exports = {
    register,
    login,
    getProfile,
    updateUserProfile,
    logout,
};
