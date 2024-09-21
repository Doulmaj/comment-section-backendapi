const multer = require('multer');

const MIME_TYPE = {
    'image/jpg': 'jpeg',
    'image/jpeg': 'jpg',
    'image/png': 'png',
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './databases/usersImages');
    },
    filename: (req, file, callback) => {
        const name = file.originalname.split(' ').join('_');
        const extension = MIME_TYPE[file.mimetype];
        callback(null, name + Date.now() + '.' + extension);
    },
});

// Configurer Multer avec les restrictions de taille et de type de fichier
const upload = multer({
    storage: storage,
    limits: 5 * 1024 * 1024, //Limite de 5 Mo
    fileFilter: (req, file, callback) => {
        if (MIME_TYPE[file.mimetype]) callback(null, true);
        else callback(new Error('Invalid type'), false);
    },
});

module.exports = upload;
