//CADA MODELO ESTA REFERENCIADO O RELACIONADO A UNA TABL EN ESPECIFICO
const sql = require('mssql');
const config = require('../../../db.js');

async function getApplicationsByUser(userId) {
    try {
        // Si no hay userId válido, no devolver todo: retorna array vacío
        if (userId === undefined || userId === null || userId === '') {
            console.warn('getApplicationsByUser: userId inválido', userId);
            return [];
        }

        const pool = await config.poolPromise;

        // Detectar tipo del campo para evitar mismatch que haga fallar el filtro
        const isInt = Number.isInteger(Number(userId));
        const paramType = isInt ? sql.Int : sql.VarChar;

        const result = await pool.request()
            .input('userId', paramType, userId)
            .query(`
                SELECT 
                    Solicitudes.*,
                    uf.nombre_usuario AS nombre_firmante,
                    us.nombre_usuario AS nombre_solicitante
                FROM Solicitudes
                LEFT JOIN Usuario uf ON Solicitudes.id_firmante = uf.id_registro_usuarios
                LEFT JOIN Usuario us ON Solicitudes.id_solicitante = us.id_registro_usuarios
                WHERE Solicitudes.id_solicitante = @userId
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching application documents:', error);
        throw error;
    }   
}




// NUEVA función: obtener una solicitud y sus archivos por id
async function getApplicationById(solicitudId) {
    try {
        const pool = await config.poolPromise;
        const req = pool.request().input('solId', sql.VarChar, solicitudId);
        // Intentamos obtener la solicitud (ajusta nombre de columna si es necesario)
        const resSolicitud = await req.query(`
            SELECT * FROM Solicitudes
            WHERE id_registro_solicitud = @solId OR id_solicitud = @solId OR id = @solId
        `);

        const solicitud = resSolicitud.recordset[0] || null;

        // Intentamos obtener archivos relacionados (ajusta tabla/columnas según esquema)
        const resArchivos = await pool.request()
            .input('solId', sql.VarChar, solicitudId)
            .query(`
                SELECT * FROM SolicitudArchivos
                WHERE id_solicitud = @solId
            `);

        const archivos = resArchivos.recordset || [];

        return { solicitud, archivos };
    } catch (error) {
        console.error('Error fetching application by id:', error);
        throw error;
    }
}

module.exports = {
    getApplicationsByUser,
    getApplicationById,
};