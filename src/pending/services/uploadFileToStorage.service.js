const fs = require('fs').promises;
const path = require('path');

async function uploadFileToStorage(fileBuffer, fileName, req) {
    try {
        // Crear carpeta de documentos firmados si no existe
        const uploadPath = path.join(__dirname, '../../../uploads/signed');
        try {
            await fs.access(uploadPath);
        } catch {
            await fs.mkdir(uploadPath, { recursive: true });
        }

        // Generar nombre único para el archivo - mantener el nombre original
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        
        // Verificar si el nombre ya tiene "-firmado" o similar, para evitar duplicados
        let uniqueFileName = fileName;
        
        // Si el archivo no tiene extensión o necesita un sufijo único
        if (!ext) {
            uniqueFileName = `${baseName}-${Date.now()}`;
        } else {
            // Buscar si ya existe un archivo con ese nombre
            let counter = 0;
            let testFileName = fileName;
            let filePath = path.join(uploadPath, testFileName);
            
            try {
                while (await fs.access(filePath).then(() => true).catch(() => false)) {
                    counter++;
                    testFileName = `${baseName}-${counter}${ext}`;
                    filePath = path.join(uploadPath, testFileName);
                }
                uniqueFileName = testFileName;
            } catch (err) {
                // Si hay error, usar el nombre original con timestamp
                uniqueFileName = `${baseName}-${Date.now()}${ext}`;
            }
        }
        
        const filePath = path.join(uploadPath, uniqueFileName);

        // Guardar el archivo
        await fs.writeFile(filePath, fileBuffer);

        // Construir la URL dinámicamente basada en la solicitud HTTP
        // Funciona tanto en localhost como en dominio de producción
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const publicUrl = `${protocol}://${host}/uploads/signed/${uniqueFileName}`;

        return {
            publicUrl,
            filePath
        };
    } catch (error) {
        console.error('Error al guardar el archivo firmado:', error);
        throw new Error('Error al guardar el archivo firmado');
    }
}

module.exports = { uploadFileToStorage };