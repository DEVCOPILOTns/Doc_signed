const { sql, poolPromise } = require('../../../db.js');

async function saveFormat(id_usuario, nombreFormato, descripcion, estado, cantidadFirmantes) {
    try {
        let pool = await poolPromise;
        let result = await pool.request()
            .input('id_usuario', sql.Int, id_usuario)
            .input('nombreFormato', sql.VarChar, nombreFormato)
            .input('descripcion', sql.VarChar, descripcion)
            .input('estado', sql.VarChar, estado)
            .input('cantidadFirmantes', sql.Int, cantidadFirmantes || 0)
            .query('INSERT INTO formatos (usuario_responsable, fecha_creacion, nombre_formato, descripcion, estado, cantidad_firmantes) VALUES (@id_usuario, GETDATE(), @nombreFormato, @descripcion, @estado, @cantidadFirmantes); SELECT SCOPE_IDENTITY() as id');
        return result.recordset[0].id;
    } catch (error) {
        console.error('Error en saveFormat:', error);
        throw error;
    }
}

async function saveStages(id_formato, etapas) {
    try {
        let pool = await poolPromise;
        for (let etapa of etapas) {
            await pool.request()
                .input('id_formato', sql.Int, id_formato)
                .input('orden', sql.Int, etapa.orden)
                .input('id_firmante', sql.Int, etapa.idFirmante)
                .input('palabra_clave', sql.VarChar, etapa.palabraClave)
        
                .query('INSERT INTO etapas_firma (formato_id, orden, id_firmante, palabra_clave) VALUES (@id_formato, @orden, @id_firmante, @palabra_clave)');
        }
    } catch (error) {
        console.error('Error al guardar las etapas:', error);
        throw error;
    }
}


async function getFormatsByUser(id_usuario) {
    try {
        let pool = await poolPromise;
        let result = await pool.request()
            .input('id_usuario', sql.Int, id_usuario)
            .query('SELECT * FROM formatos WHERE usuario_responsable = @id_usuario');
        return result.recordset;
    } catch (error) {
        console.error('Error en getFormatsByUser:', error);
        throw error;
    }
}

async function getFormatById(id_formato) {
    try {
        let pool = await poolPromise;
        let resultFormato = await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query('SELECT * FROM formatos WHERE id_registro_formato = @id_formato');
        
        if (resultFormato.recordset.length === 0) {
            return null;
        }

        let formato = resultFormato.recordset[0];

        // Obtener las etapas del formato
        let resultEtapas = await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query('SELECT * FROM etapas_firma WHERE formato_id = @id_formato ORDER BY orden');
        
        formato.etapas = resultEtapas.recordset;
        
        return formato;
    } catch (error) {
        console.error('Error en getFormatById:', error);
        throw error;
    }
}

async function updateFormat(id_formato, nombreFormato, descripcion, estado, cantidadFirmantes) {
    try {
        let pool = await poolPromise;
        await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .input('nombreFormato', sql.VarChar, nombreFormato)
            .input('descripcion', sql.VarChar, descripcion)
            .input('estado', sql.VarChar, estado)
            .input('cantidadFirmantes', sql.Int, cantidadFirmantes || 0)
            .query('UPDATE formatos SET nombre_formato = @nombreFormato, descripcion = @descripcion, estado = @estado, cantidad_firmantes = @cantidadFirmantes WHERE id_registro_formato = @id_formato');
        return true;
    } catch (error) {
        console.error('Error en updateFormat:', error);
        throw error;
    }
}

async function deleteStagesByFormatId(id_formato) {
    try {
        let pool = await poolPromise;
        await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query('DELETE FROM etapas_firma WHERE formato_id = @id_formato');
        return true;
    } catch (error) {
        console.error('Error al eliminar etapas:', error);
        throw error;
    }
}

module.exports = { 
    saveFormat,
    saveStages,
    getFormatsByUser,
    getFormatById,
    updateFormat,
    deleteStagesByFormatId
};