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

module.exports = { 
    saveFormat,
    saveStages
};