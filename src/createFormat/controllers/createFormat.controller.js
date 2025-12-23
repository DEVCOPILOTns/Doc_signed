const {countPendingandSigned } = require('../../pending/models/pending.model');
const { saveFormat, saveStages } = require('../models/createFormat.model');
const { getSignerUsers } = require('../../masiveSign/models/request.model');

async function createFormatRender(req, res) {

    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);
    const signerUsers = await getSignerUsers();
    return res.render('createFormat/views/createFormatIndex', { 
        pendingData,
        pendingDocuments: pendingData?.pendientes || 0,
        signerUsers: signerUsers
    });
}

async function getSigners(req, res) {
    try {
        const signerUsers = await getSignerUsers();
        res.json(signerUsers);
    } catch (error) {
        console.error('Error al obtener firmantes:', error);
        res.status(500).json({ error: 'Error al obtener firmantes' });
    }
}

async function uploadFormat(req, res) {
    try {
        // Insertar el formato y obtener su ID
        const id_formato = await saveFormat(
            req.user.id_registro_usuarios, 
            req.body.nombreFormato, 
            req.body.descripcion, 
            req.body.estado, 
            req.body.cantidadFirmantes
        );
        
        
        // Guardar cada etapa
        if (req.body.etapas && req.body.etapas.length > 0) {
            await saveStages(id_formato, req.body.etapas);
        }
        
        res.status(200).send('Formato creado exitosamente');
    } catch (error) { 
        console.error('Error al subir el formato:', error);
        res.status(500).send('Error al subir el formato');
    }
}

module.exports = {
    createFormatRender,
    uploadFormat,
    getSigners
};
