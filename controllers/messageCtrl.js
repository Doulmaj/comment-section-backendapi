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
        const userId = req.auth.userId;
        const [messages] = await pool.query('SELECT id, likes, dislikes, userId, replyTo FROM messages ORDER BY id ');
        if (messages.length === 0) {
            return res.status(404).json({ message: 'No messages found' });
        }

        let validityError = {}; //Variable permettant gérer le cas où il y'a des erreurs de type message non trouvé (erreur 404)

        // On utilise map pour créer un tableau de promesses, chaque promesse correspondant à une requête pour récupérer le contenu d'un message
        const messagePromises = messages.map(async (message) => {
            try {
                const [rows] = await pool.query('SELECT elementType, content FROM message_elements WHERE messageId = ? ORDER BY id ', [message.id]);

                if (rows.length === 0) {
                    validityError.error = 'Message not found';
                }

                const messageContent = rows.map((row) => ({
                    type: row.elementType,
                    content: row.content,
                }));
                try {
                    const [user] = await pool.query('SELECT username, id FROM users WHERE id = ?', [message.userId]);
                    if (user.length === 0) {
                        validityError.error = 'user not found';
                    } else {
                        let myReaction;
                        if (userId === null) myReaction = null;
                        else {
                            const [reaction] = await pool.query('SELECT * FROM likes WHERE userId = ? AND messageId = ?', [userId, message.id]);
                            if (reaction.length === 0) {
                                myReaction = null;
                            } else {
                                myReaction = reaction[0].likes;
                            }
                        }
                        return {
                            message: 'message retrieved successfully',
                            content: messageContent,
                            likes: message.likes,
                            dislikes: message.dislikes,
                            myReaction: myReaction,
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

        // Fonction pour construire l'arbre de commentaires
        function buildCommentTree(comments) {
            const map = {}; // Un objet pour faire une correspondance rapide : id → commentaire
            const roots = []; // Ici, on stocke les commentaires racine (ceux qui ont parent_id = null)

            // Étape A : on ajoute un champ `children` vide à chaque commentaire
            comments.forEach((comment) => {
                comment.children = [];
                map[comment.id] = comment; // Ex : map[2] = commentaire avec id = 2
            });

            // Étape B : on place chaque commentaire dans son parent
            comments.forEach((comment) => {
                if (comment.replyTo) {
                    // replyTo est l'id du commentaire auquel on répond
                    const parent = map[comment.replyTo]; // On cherche son parent dans la map
                    if (parent) {
                        parent.children.push(comment); // On ajoute cette réponse dans les `children` du parent
                    }
                } else {
                    // C’est un commentaire de niveau racine
                    roots.push(comment);
                }
            });

            return roots;
        }

        // Variable contenant tous les messages récupérés
        // On utilise Promise.all pour attendre que toutes les promesses soient résolues avant de continuer
        const allMessages = await Promise.all(messagePromises);
        if (Object.keys(validityError).length === 0) {
            const tree = buildCommentTree(allMessages);
            return res.status(200).json({ messages: tree });
        } else {
            return res.status(404).json({ error: validityError.error });
        }
    } catch (error) {
        res.status(500).json({ error });
    }
}

async function getProfileStatAndMessages(req, res, next) {
    let userId = parseInt(req.auth.userId);
    try {
        const [messages] = await pool.query('SELECT id, likes, dislikes, userId, replyTo FROM messages WHERE userId= ? ', [userId]);
        if (messages.length === 0) {
            return res.status(404).json({ message: 'User has not sent a message yet' });
        }

        let validityError = {};

        const messagePromises = messages.map(async (message) => {
            const [rows] = await pool.query('SELECT elementType, content FROM message_elements WHERE messageId = ? ORDER BY id ', [message.id]);

            if (rows.length === 0) {
                validityError.error = `Message ${message.id} not found`;
            }

            const messageContent = rows.map((row) => ({
                type: row.elementType,
                content: row.content,
            }));

            let userYouReplyTo = null;
            if (message.replyTo !== null) {
                const [IdUserReplyTo] = await pool.query('SELECT userId FROM messages WHERE id = ? ', [message.replyTo]);
                if (IdUserReplyTo.length === 0) {
                    validityError.error = `There is no sender of the message ${message.replyTo}`;
                    return;
                }
                const [userReply] = await pool.query('SELECT username FROM users WHERE id = ?', [IdUserReplyTo[0].userId]);
                if (userReply.length === 0) {
                    validityError.error = `User you replied to on message ${message.id} not found`;
                    return;
                }
                userYouReplyTo = userReply[0].username;
            }
            let myReaction;
            if (userId === null) myReaction = null;
            else {
                const [reaction] = await pool.query('SELECT * FROM likes WHERE userId = ? AND messageId = ?', [userId, message.id]);
                if (reaction.length === 0) {
                    myReaction = null;
                } else {
                    myReaction = reaction[0].likes;
                }
            }

            return {
                message: 'message retrieved successfully',
                content: messageContent,
                likes: message.likes,
                dislikes: message.dislikes,
                myReaction: myReaction,
                userYouReplyTo: userYouReplyTo,
                replyTo: message.replyTo,
                id: message.id,
            };
        });

        const allMessages = await Promise.all(messagePromises);
        let totalLikes = 0,
            totalDislikes = 0,
            totalComments = allMessages.length;

        allMessages.forEach((message) => {
            totalLikes += message.likes;
            totalDislikes += message.dislikes;
        });

        if (Object.keys(validityError).length === 0) {
            return res.status(200).json({
                messages: allMessages,
                totalComments: totalComments,
                totalLikes: totalLikes,
                totalDislikes: totalDislikes,
            });
        } else {
            return res.status(404).json({ error: validityError.error });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}

module.exports = {
    createMessage,
    getOneMessage,
    getAllMessages,
    getProfileStatAndMessages,
};
