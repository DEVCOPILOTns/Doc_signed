const {countPendingandSigned } = require('../../pending/models/pending.model');
const { saveFormat, saveStages, getFormatsByUser, getFormatById, updateFormat, deleteStagesByFormatId } = require('../models/createFormat.model');
const { getSignerUsers } = require('../../masiveSign/models/request.model');

async function createFormatRender(req, res) {
    const formats = await getFormatsByUser(req.user.id_registro_usuarios);
    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);
    const signerUsers = await getSignerUsers();
    return res.render('createFormat/views/createFormatIndex', { 
        pendingData,
        pendingDocuments: pendingData?.pendientes || 0,
        signerUsers: signerUsers,
        formats: formats || []
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

async function getFormat(req, res) {
    try {
        const id_formato = parseInt(req.params.id);
        
        if (isNaN(id_formato)) {
            return res.status(400).json({ error: 'ID de formato inválido' });
        }
        console.log('ID de formato solicitado:', id_formato);
        const formato = await getFormatById(id_formato);
        
        
        if (!formato) {
            return res.status(404).json({ error: 'Formato no encontrado' });
        }

        const signerUsers = await getSignerUsers();
        
        res.json({
            ...formato,
            signerUsers
        });
    } catch (error) {
        console.error('Error al obtener el formato:', error);
        res.status(500).json({ error: 'Error al obtener el formato' });
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

async function updateFormatData(req, res) {
    try {
        const id_formato = parseInt(req.params.id);
        
        if (isNaN(id_formato)) {
            return res.status(400).json({ error: 'ID de formato inválido' });
        }

        // Actualizar datos del formato
        await updateFormat(
            id_formato,
            req.body.nombreFormato, 
            req.body.descripcion, 
            req.body.estado, 
            req.body.cantidadFirmantes
        );

        // Eliminar etapas anteriores
        await deleteStagesByFormatId(id_formato);

        // Guardar nuevas etapas
        if (req.body.etapas && req.body.etapas.length > 0) {
            await saveStages(id_formato, req.body.etapas);
        }
        
        res.status(200).send('Formato actualizado exitosamente');
    } catch (error) {
        console.error('Error al actualizar el formato:', error);
        res.status(500).send('Error al actualizar el formato: ' + error.message);
    }
}

module.exports = {
    createFormatRender,
    uploadFormat,
    getSigners,
    getFormat,
    updateFormatData
};
