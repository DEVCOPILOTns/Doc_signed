const sql = require('mssql');
const config = require('../../../db.js');

console.log('informacion de req.user:');

async function saveSolicitud(id_solicitante, id_formato, tipo_solicitud, comentarios) {
    try {
        const pool = await config.poolPromise;//Aqui obtengo el pool de conexiones
        const result = await pool.request()//aqui creo una nueva solicitud
            .input('id_solicitante', sql.Int, id_solicitante)
            .input('id_formato', sql.Int, id_formato)
            .input('tipo_solicitud', sql.VarChar, tipo_solicitud)
            //.input('fechaSolicitud', sql.DateTime, new Date())
            .input('comentarios', sql.VarChar, comentarios)
            .input('etapa_actual', sql.Int, 1)
            .query('INSERT INTO Solicitudes (id_solicitante, id_formato, tipo_solicitud, fecha_solicitud, desc_comentario, etapa_actual) VALUES (@id_solicitante, @id_formato, @tipo_solicitud, GETDATE(), @comentarios, @etapa_actual); SELECT SCOPE_IDENTITY() AS id;');
        return result.recordset[0].id;
        

    } catch (error) {
        console.error('Error al guardar la solicitud:', error);
        throw error;
    }

}

async function saveDetalles(idSolicitud, url, formato) {
    try {
        const pool = await config.poolPromise;
        console.log(`💾 BD: ${url}`);
        return pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .input('url', sql.VarChar, url)
            .input('formato', sql.VarChar, formato)
            //.input('fechaSolicitud', sql.DateTime, new Date())
            .query('INSERT INTO Detalles_solicitudes (id_solicitud, fecha_solicitud, url_archivos, tipo_documento) VALUES (@idSolicitud, GETDATE(), @url, @formato)');
    } catch (error) {
        console.error('Error al guardar los detalles:', error);
        throw error;
    }
}

async function getSignerUsers() {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .query(`
                SELECT id_registro_usuarios, nombre_usuario, cedula, nombre_completo
                FROM usuario
                WHERE id_rol = 1
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching signer users:', error);
        throw error;
    }
}

async function getFormats() {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .query(`
                SELECT *
                FROM formatos
                WHERE estado = 'activo'
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching formats:', error);
        throw error;
    }
}

module.exports = { saveSolicitud, saveDetalles, getSignerUsers, getFormats };