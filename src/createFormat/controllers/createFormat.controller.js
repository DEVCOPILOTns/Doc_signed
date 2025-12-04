const {countPendingandSigned } = require('../../pending/models/pending.model');

async function createFormatRender(req, res) {
    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);

    return res.render('createFormat/views/createFormatIndex', { 
        pendingData,
        pendingDocuments: pendingData?.pendientes || 0
    });
}

async function uploadFormat(req, res) {
    try {
        
        // Lógica para manejar la subida de formatos personalizados
    } catch (error) {
        console.error('Error al subir el formato:', error);
        res.status(500).send('Error al subir el formato');
    }
}

module.exports = {
    createFormatRender,
    uploadFormat
};