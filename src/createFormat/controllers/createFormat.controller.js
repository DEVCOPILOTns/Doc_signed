const {countPendingandSigned } = require('../../pending/models/pending.model');
const { saveFormat, saveStages, getFormatsByUser, getFormatById, updateFormat, changeStagesByFormatId, updateStage, updateFormatStageCount, changeFormatStatus, getapplicationByFormatId} = require('../models/createFormat.model');
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
        
        // Actualizar cantidad de firmantes basado en etapas activas
        await updateFormatStageCount(id_formato);
        
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

        const solicitudesByFormat =  await getapplicationByFormatId(id_formato);
        console.log('Solicitudes asociadas al formato:', solicitudesByFormat);
        if (solicitudesByFormat && solicitudesByFormat.length > 0) {
            return res.status(200).json({ 
                type: 'warning',
                message: 'No se puede modificar un formato asociado a solicitudes existentes',
                error: 'No se puede modificar un formato asociado a solicitudes existentes' 
            });
        }

        // Obtener el estado actual del formato
        const { countActiveStages } = require('../models/createFormat.model');
        const etapasActualesActivas = await countActiveStages(id_formato);
        const etapasAEliminar = req.body.etapasEliminar ? req.body.etapasEliminar.length : 0;
        const etapasNuevas = req.body.etapas ? req.body.etapas.filter(e => !e.id_registro_etapa).length : 0;
        const etapasQueQuedaranActivas = etapasActualesActivas - etapasAEliminar + etapasNuevas;

        // Validar que no se eliminen todas las etapas
        if (etapasQueQuedaranActivas <= 0) {
            return res.status(400).json({ error: 'Un formato debe tener al menos una etapa activa' });
        }

        // Desactivar las etapas que fueron eliminadas PRIMERO
        if (req.body.etapasEliminar && req.body.etapasEliminar.length > 0) {
            for (const id_etapa of req.body.etapasEliminar) {
                await changeStagesByFormatId(id_etapa);
            }
        }

        // Procesar etapas (actualizar existentes e insertar nuevas)
        if (req.body.etapas && req.body.etapas.length > 0) {
            for (const etapa of req.body.etapas) {
                if (etapa.id_registro_etapa) {
                    // Actualizar etapa existente
                    await updateStage(
                        etapa.id_registro_etapa,
                        etapa.orden,
                        etapa.idFirmante,
                        etapa.palabraClave
                    );
                } else {
                    // Insertar nueva etapa
                    await saveStages(id_formato, [etapa]);
                }
            }
        }
        
        // Actualizar cantidad de firmantes basado en etapas activas DESPUÉS de cambiar etapas
        await updateFormatStageCount(id_formato);

        // Actualizar datos del formato DESPUÉS de actualizar cantidad de firmantes
        await updateFormat(
            id_formato,
            req.body.nombreFormato, 
            req.body.descripcion, 
            req.body.estado, 
            req.body.cantidadFirmantes
        );
        
        res.status(200).send('Formato actualizado exitosamente');
    } catch (error) {
        console.error('Error al actualizar el formato:', error);
        res.status(500).send('Error al actualizar el formato: ' + error.message);
    }
}

async function disableFormat(req, res) {
    try {
        const id_formato = parseInt(req.params.id);
        
        if (isNaN(id_formato)) {
            return res.status(400).json({ error: 'ID de formato inválido' });
        }

        console.log('Inhabilitando formato ID:', id_formato);
        await changeFormatStatus(id_formato, 'inactivo');

        res.status(200).json({ message: 'Formato inhabilitado exitosamente' });
    } catch (error) {
        console.error('Error al inhabilitar el formato:', error);
        res.status(500).json({ error: 'Error al inhabilitar el formato: ' + error.message });
    }
}

async function activateFormat(req, res) {
    try {
        const id_formato = parseInt(req.params.id);
        if (isNaN(id_formato)) {
            return res.status(400).json({ error: 'ID de formato inválido' });
        }
        console.log('Activando formato ID:', id_formato);
        await changeFormatStatus(id_formato, 'activo');
        res.status(200).json({ message: 'Formato activado exitosamente' });
    } catch (error) {
        console.error('Error al activar el formato:', error);
        res.status(500).json({ error: 'Error al activar el formato: ' + error.message });
    }
}

module.exports = {
    createFormatRender,
    uploadFormat,
    getSigners,
    getFormat,
    updateFormatData,
    disableFormat,
    activateFormat
};
