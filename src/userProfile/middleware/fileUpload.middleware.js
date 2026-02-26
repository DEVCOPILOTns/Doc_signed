const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta de uploads si no existe
const uploadPath = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
});

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB
    },
    fileFilter: (req, file, cb) => {
        // Validar tipo de archivo
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
});

// Exportar middleware para un único archivo
module.exports = upload.single('files');
