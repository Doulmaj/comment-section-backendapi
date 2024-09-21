const pool = require('../db');

async function likesPost(req, res, next) {
    const userId = req.auth.userId;
    const messageId = parseInt(req.params.id);
    if (!messageId) {
        return res.status(400).json({ error: 'this request must contain the id of the message to react to' });
    }
    //Verifier si le message est dans la DB
    try {
        let [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [messageId]);
        if (!rows) {
            return res.status(404).json({ error: 'message not found' });
        } else {
            rows = rows[0];
            try {
                let [likeReaction] = await pool.query('SELECT id, userId, messageId, likes FROM likes WHERE userId = ? AND messageId = ?', [userId, messageId]);
                if (!likeReaction[0]) {
                    //Dans ce cas l'utilisateur n'a pas encore émis aucune réction sur un message
                    try {
                        const [result] = await pool.query('INSERT INTO likes (userId, messageId, likes) VALUES (?,?,?) ', [userId, messageId, 1]);
                        if (!result.insertId) {
                            return res.status(500).json({ error: 'error while handling the like post' });
                        } else {
                            try {
                                const [messageUpdate] = await pool.query('UPDATE messages SET likes = ? WHERE id = ?', [rows.likes + 1, messageId]);
                                return res.status(201).json({
                                    message: 'Your like rection has been updated succesfully',
                                });
                            } catch (error) {
                                return res.status(500).json({ error });
                            }
                        }
                    } catch (error) {
                        return res.status(500).json({ error });
                    }
                } else {
                    likeReaction = likeReaction[0];
                    //Dans ce cas, l'utilisateur a déjà émis une réaction par rapport à un message
                    if (likeReaction.likes !== 0 && likeReaction.likes !== 1 && likeReaction.likes !== null) return res.status(500).json({ error: 'Unkown reaction in the table ' });

                    if (likeReaction.likes === 1) {
                        return res.status(403).json({ error: 'Message already liked' });
                    } else {
                        let likesCount = rows.likes + 1;
                        let dislikesCount;
                        if (likeReaction.likes === null) {
                            dislikesCount = rows.dislikes;
                        } else {
                            //likeReaction === 0
                            dislikesCount = rows.dislikes - 1;
                        }
                        try {
                            const [result] = await pool.query('UPDATE likes SET likes = ? WHERE id = ?', [1, likeReaction.id]);
                            if (!result.affectedRows) {
                                return res.status(500).json({ error: 'error while handling the like post' });
                            } else {
                                try {
                                    const [messageUpdate] = await pool.query('UPDATE messages SET likes = ?, dislikes = ? WHERE id = ?', [likesCount, dislikesCount, messageId]);
                                    return res.status(201).json({
                                        message: 'Your like rection has been updated succesfully',
                                    });
                                } catch (error) {
                                    return res.status(500).json({ error });
                                }
                            }
                        } catch (error) {
                            return res.status(500).json({ error });
                        }
                    }
                }
            } catch (error) {
                return res.status(500).json({ error: error.message, stack: error.stack });
            }
        }
    } catch (error) {
        return res.status(500).json({ error });
    }
}

async function dislikesPost(req, res, next) {
    const userId = req.auth.userId;
    const messageId = parseInt(req.params.id);
    if (!messageId) {
        return res.status(400).json({ error: 'this request must contain the id of the message to react to' });
    }
    //Verifier si le message est dans la DB
    try {
        let [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [messageId]);
        if (!rows) {
            return res.status(404).json({ error: 'message not found' });
        } else {
            rows = rows[0];
            try {
                let [likeReaction] = await pool.query('SELECT id, userId, messageId, likes FROM likes WHERE userId = ? AND messageId = ?', [userId, messageId]);
                if (!likeReaction[0]) {
                    //Dans ce cas l'utilisateur n'a pas encore émis aucune réction sur un message
                    try {
                        const [result] = await pool.query('INSERT INTO likes (userId, messageId, likes) VALUES (?,?,?) ', [userId, messageId, 0]);
                        if (!result.insertId) {
                            return res.status(500).json({ error: 'error while handling the like post' });
                        } else {
                            try {
                                const [messageUpdate] = await pool.query('UPDATE messages SET dislikes = ? WHERE id = ?', [rows.dislikes + 1, messageId]);
                                return res.status(201).json({
                                    message: 'Your dislike rection has been updated succesfully',
                                });
                            } catch (error) {
                                return res.status(500).json({ error });
                            }
                        }
                    } catch (error) {
                        return res.status(500).json({ error });
                    }
                } else {
                    likeReaction = likeReaction[0];
                    //Dans ce cas, l'utilisateur a déjà émis une réaction par rapport à un message
                    if (likeReaction.likes !== 0 && likeReaction.likes !== 1 && likeReaction.likes !== null) return res.status(500).json({ error: 'Unkown reaction in the table ' });

                    if (likeReaction.likes === 0) {
                        return res.status(403).json({ error: 'Message already disliked' });
                    } else {
                        let dislikesCount = rows.dislikes + 1;
                        let likesCount;
                        if (likeReaction.likes === null) {
                            likesCount = rows.likes;
                        } else {
                            //(likeReaction === 1) le message avait déjà été liké
                            likesCount = rows.likes - 1;
                        }
                        try {
                            const [result] = await pool.query('UPDATE likes SET likes = ? WHERE id = ?', [0, likeReaction.id]);
                            if (!result.affectedRows) {
                                return res.status(500).json({ error: 'error while handling the dislike post' });
                            } else {
                                try {
                                    const [messageUpdate] = await pool.query('UPDATE messages SET likes = ? , dislikes = ? WHERE id = ?', [likesCount, dislikesCount, messageId]);
                                    return res.status(201).json({
                                        message: 'Your dislike rection has been updated succesfully',
                                    });
                                } catch (error) {
                                    return res.status(500).json({ error });
                                }
                            }
                        } catch (error) {
                            return res.status(500).json({ error });
                        }
                    }
                }
            } catch (error) {
                return res.status(500).json({ error });
            }
        }
    } catch (error) {
        return res.status(500).json({ error });
    }
}

//Pour retirer une réction ( retirer son like ou son dislike tout court)
async function nullifyReaction(req, res, next) {
    const userId = req.auth.userId;
    const messageId = parseInt(req.params.id);
    if (!messageId) {
        return res.status(400).json({ error: 'this request must contain the id of the message to react to' });
    }
    //Verifier si le message est dans la DB
    try {
        let [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [messageId]);
        if (!rows) {
            return res.status(404).json({ error: 'message not found' });
        } else {
            rows = rows[0];
            try {
                let [likeReaction] = await pool.query('SELECT id, userId, messageId, likes FROM likes WHERE userId = ? AND messageId = ?', [userId, messageId]);
                if (!likeReaction[0]) {
                    return res.status(400).json({ error: "The user haven't reacted to this message so he can't nullify his reaction" });
                } else {
                    likeReaction = likeReaction[0];
                    if (likeReaction.likes === null) {
                        return res.status(400).json({ error: "This message had no reaction from the user, so i can't be nullified" });
                    } else {
                        let likesCount, dislikesCount;
                        if (likeReaction.likes === 1) {
                            likesCount = rows.likes - 1;
                            dislikesCount = rows.dislikes;
                        }
                        if (likeReaction.likes === 0) {
                            likesCount = rows.likes;
                            dislikesCount = rows.dislikes - 1;
                        }
                        try {
                            const [result] = await pool.query('UPDATE likes SET likes = ? WHERE id = ?', [null, likeReaction.id]);
                            if (!result.affectedRows) {
                                return res.status(500).json({ error: 'error while retiring the user reaction' });
                            } else {
                                try {
                                    const [messageUpdate] = await pool.query('UPDATE messages SET likes = ?, dislikes = ? WHERE id = ?', [likesCount, dislikesCount, messageId]);
                                    return res.status(201).json({
                                        message: 'Your rection has been removed succesfully',
                                    });
                                } catch (error) {
                                    return res.status(500).json({ error });
                                }
                            }
                        } catch (error) {
                            return res.status(500).json({ error });
                        }
                    }
                }
            } catch (error) {
                return res.status(500).json({ error });
            }
        }
    } catch (error) {
        return res.status(500).json({ error });
    }
}

module.exports = {
    likesPost,
    dislikesPost,
    nullifyReaction,
};
