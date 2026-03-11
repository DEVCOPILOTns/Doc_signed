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

async function getapplicationByFormatId(id_formato) {
    try {
        let pool = await poolPromise;   
        let result = await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query('SELECT * FROM solicitudes WHERE id_formato = @id_formato and estado_solicitud = \'PENDIENTE\'');
        return result.recordset;
    } catch (error) {
        console.error('Error en getapplicationByFormatId:', error);
        throw error;
    }
}


async function saveStages(id_formato, etapas) {
    try {
        let pool = await poolPromise;
        for (let etapa of etapas) {
            // Guardar tal como está (sin normalizar)
            console.log(`📝 Guardando etapa con palabra(s) clave: "${etapa.palabraClave}"`);
            
            await pool.request()
                .input('id_formato', sql.Int, id_formato)
                .input('orden', sql.Int, etapa.orden)
                .input('id_firmante', sql.Int, etapa.idFirmante)
                .input('palabra_clave', sql.VarChar, etapa.palabraClave)
                .input('estado', sql.VarChar, etapa.estado || 'ACTIVO')

                .query('INSERT INTO etapas_firma (formato_id, orden, id_firmante, palabra_clave, estado) VALUES (@id_formato, @orden, @id_firmante, @palabra_clave, @estado)');
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

        // Obtener las etapas ACTIVAS del formato con los nombres de los firmantes
        let resultEtapas = await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query(`
                SELECT 
                    ef.*,
                    u.nombre_completo
                FROM etapas_firma ef
                LEFT JOIN Usuario u ON ef.id_firmante = u.id_registro_usuarios
                WHERE ef.formato_id = @id_formato AND ef.estado = 'ACTIVO'
                ORDER BY ef.orden
            `);
        
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

async function changeStagesByFormatId(id_registro_etapa) {
    try {
        let pool = await poolPromise;
        await pool.request()
            .input('id_registro_etapa', sql.Int, id_registro_etapa)
            .query("UPDATE etapas_firma SET estado = 'INACTIVO' WHERE id_registro_etapa = @id_registro_etapa");
        return true;
    } catch (error) {
        console.error('Error al cambiar etapa:', error);
        throw error;
    }
}

async function updateStage(id_registro_etapa, orden, id_firmante, palabra_clave) {
    try {
        let pool = await poolPromise;
        // Guardar tal como está (sin normalizar)
        console.log(`📝 Actualizando etapa con palabra(s) clave: "${palabra_clave}"`);
        
        await pool.request()
            .input('id_registro_etapa', sql.Int, id_registro_etapa)
            .input('orden', sql.Int, orden)
            .input('id_firmante', sql.Int, id_firmante)
            .input('palabra_clave', sql.VarChar, palabra_clave)
            .query(`
                UPDATE etapas_firma 
                SET orden = @orden, 
                    id_firmante = @id_firmante, 
                    palabra_clave = @palabra_clave
                WHERE id_registro_etapa = @id_registro_etapa
            `);
        return true;
    } catch (error) {
        console.error('Error al actualizar etapa:', error);
        throw error;
    }
}

async function countActiveStages(id_formato) {
    try {
        let pool = await poolPromise;
        let result = await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .query(`
                SELECT COUNT(*) as total 
                FROM etapas_firma 
                WHERE formato_id = @id_formato AND estado = 'ACTIVO'
            `);
        return result.recordset[0].total;
    } catch (error) {
        console.error('Error al contar etapas activas:', error);
        throw error;
    }
}

async function updateFormatStageCount(id_formato) {
    try {
        let totalEtapas = await countActiveStages(id_formato);
        // Asegurar que al menos sea 1 para cumplir con la restricción CHECK
        const cantidad = Math.max(totalEtapas, 1);
        let pool = await poolPromise;
        await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .input('cantidad_firmantes', sql.Int, cantidad)
            .query(`
                UPDATE formatos 
                SET cantidad_firmantes = @cantidad_firmantes
                WHERE id_registro_formato = @id_formato
            `);
        return true;
    } catch (error) {
        console.error('Error al actualizar cantidad de firmantes:', error);
        throw error;
    }
}

async function changeFormatStatus(id_formato, status) {
    try {
        let pool = await poolPromise;
        await pool.request()
            .input('id_formato', sql.Int, id_formato)
            .input('estado', sql.VarChar, status)
            .query("UPDATE formatos SET estado = @estado WHERE id_registro_formato = @id_formato");
        return true;
    } catch (error) {
        console.error('Error al cambiar estado del formato:', error);
        throw error;
    }
}


module.exports = { 
    saveFormat,
    saveStages,
    getFormatsByUser,
    getFormatById,
    updateFormat,
    changeStagesByFormatId,
    updateStage,
    countActiveStages,
    updateFormatStageCount,
    changeFormatStatus,
    getapplicationByFormatId
};