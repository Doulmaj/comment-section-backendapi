const pool = require('../db');

async function createMessage(req, res, next) {
    let elements = req.body.elements; // elements est un tableau d'objets { type: 'text' | 'image', content: string }
    const files = req.files;
    let userId = req.auth.userId;
    const answerTo = req.params.id; //Dans le cas où le message est une réponse à un autre message

    //S'assurer que elements est une liste
    try {
        elements = elements.trim();
        if (elements.startsWith('[') && elements.endsWith(']')) {
            elements = JSON.parse(elements);
            for (const element of elements) {
                if (element.type !== 'text' && element.type !== 'image') {
                    return res.status(400).json({
                        error: "wrong parameters (the key 'type' can only have for value : 'image' or 'text') ",
                    });
                }
                if (element.content.trim() === '') {
                    return res.status(400).json({
                        error: "wrong paramaters (the key 'content') cannot be empty ",
                    });
                }
            }

            try {
                const [rows] = await pool.query('INSERT INTO messages  (content, userId) VALUES (?,?) ', ['New message', userId]);
                let messageId = rows.insertId;
                const messageElements = [];
                elements.forEach((element) => {
                    if (element.type === 'image') {
                        const file = files.find((file) => file.originalname === element.content);
                        messageElements.push([messageId, 'image', `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`]);
                    } else {
                        messageElements.push([messageId, 'text', element.content]);
                    }
                });

                try {
                    const [rows] = await pool.query('INSERT INTO message_elements (messageId, elementType, content) VALUES ? ', [messageElements]);
                    if (!answerTo) {
                        res.status(201).json({
                            message: 'Message uploaded succesfully',
                        });
                    } else {
                        //Traitement dans le cas où le message est en faite une réponse

                        //Verifier si le message auquel répondre existe dans database
                        try {
                            const [message] = await pool.query('SELECT * FROM messages WHERE id = ?', [answerTo]);
                            if (!message) {
                                return res.status(404).json({ error: 'message to answer not found' });
                            } else {
                                try {
                                    const [row] = await pool.query('UPDATE messages SET replyTo = ? WHERE id = ? ', [answerTo, messageId]);
                                    if (row.affectedRows <= 0) {
                                        res.status(500).json({
                                            error: 'error while handling the answer message',
                                        });
                                    } else {
                                        res.status(201).json({
                                            message: 'Your answer has been uploaded',
                                        });
                                    }
                                } catch (error) {
                                    res.status(500).json({ error: error.message, stack: error.stack });
                                }
                            }
                        } catch (error) {
                            return res.status(500).json({ error });
                        }
                    }
                } catch (error) {
                    res.status(500).json({ error: error.message, stack: error.stack });
                }
            } catch (error) {
                res.status(500).json({ error: error.message, stack: error.stack });
            }
        } else {
            return res.status(400).json({ error: 'Wrong parameter ( elements should be an array )' });
        }
    } catch (error) {
        return res.status(400).json({ error: 'Wrong parameter ( elements should be an array )' });
    }
}

async function getOneMessage(req, res, next) {
    const messageId = req.params.id;
    if (!messageId) {
        return res.status(400).json({ error: 'this request must contain the id of the message to get' });
    }
    try {
        const [rows] = await pool.query('SELECT elementType, content FROM message_elements WHERE messageId = ? ORDER BY id ', [messageId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const messageContent = rows.map((row) => ({
            type: row.elementType,
            content: row.content,
        }));

        try {
            let [message] = await pool.query('SELECT likes, dislikes, userId, replyTo FROM messages WHERE id = ? ', [messageId]);
            if (message.length === 0) {
                return res.status(404).json({ error: 'Message not found' });
            }
            message = message[0];
            try {
                const [user] = await pool.query('SELECT username FROM users WHERE id = ?', [message.userId]);
                if (!user) {
                    return res.status(404).json({ error: 'user not found ' });
                } else {
                    return res.status(200).json({
                        message: 'message retrieved successfully',
                        content: messageContent,
                        likes: message.likes,
                        dislikes: message.dislikes,
                        sender: user[0].username,
                        replyTo: message.replyTo,
                        id: messageId,
                    });
                }
            } catch (error) {
                return res.status(500).json({ error: error.message, stack: error.stack });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message, stack: error.stack });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}

async function getAllMessages(req, res, next) {
    try {
        const [messages] = await pool.query('SELECT id, likes, dislikes, userId, replyTo FROM messages ORDER BY id ');
        if (messages.length === 0) {
            return res.status(404).json({ message: 'No messages found' });
        }
        const messagePromises = messages.map(async (message) => {
            try {
                const [rows] = await pool.query('SELECT elementType, content FROM message_elements WHERE messageId = ? ORDER BY id ', [message.id]);

                if (rows.length === 0) {
                    return res.status(404).json({ error: 'Message not found' });
                }

                const messageContent = rows.map((row) => ({
                    type: row.elementType,
                    content: row.content,
                }));
                try {
                    const [user] = await pool.query('SELECT username FROM users WHERE id = ?', [message.userId]);
                    if (!user) {
                        res.status(404).json({ error: 'user not found ' });
                    } else {
                        return {
                            message: 'message retrieved successfully',
                            content: messageContent,
                            likes: message.likes,
                            dislikes: message.dislikes,
                            sender: user[0].username,
                            replyTo: message.replyTo, //id du message au quelle on répond
                            id: message.id,
                        };
                    }
                } catch (error) {
                    res.status(500).json({ error });
                }
            } catch (error) {
                res.status(500).json({ error });
            }
        });
        //Ajouter la colonne dislikes
        const allMessages = await Promise.all(messagePromises);
        res.status(200).json({ messages: allMessages });
    } catch (error) {
        res.status(500).json({ error });
    }
}

module.exports = {
    createMessage,
    getOneMessage,
    getAllMessages,
};
