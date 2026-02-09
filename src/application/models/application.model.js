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
                    uf.nombre_completo AS nombre_firmante,
                    us.nombre_completo AS nombre_solicitante,
                    f.nombre_formato
                FROM Solicitudes
                LEFT JOIN Usuario uf ON Solicitudes.id_formato = uf.id_registro_usuarios
                LEFT JOIN Usuario us ON Solicitudes.id_solicitante = us.id_registro_usuarios
                LEFT JOIN formatos f ON Solicitudes.id_formato = f.id_registro_formato
                WHERE Solicitudes.id_solicitante = @userId
            `);
            
        return result.recordset;
    } catch (error) {
        console.error('Error fetching application documents:', error);
        throw error;
    }   
}

async function getStageSignedByApplicationId(applicationId) {
    try {        if (applicationId === undefined || applicationId === null || applicationId === '') {
            return [];
        }
        const pool = await config.poolPromise;
        const isInt = Number.isInteger(Number(applicationId));
        const paramType = isInt ? sql.Int : sql.VarChar;
        const result = await pool.request()
            .input('applicationId', paramType, applicationId)
            .query(`
                SELECT
                    ef.*,
                    u.nombre_completo
                FROM etapas_firmadas ef
                LEFT JOIN Usuario u ON ef.id_firmante = u.id_registro_usuarios
                WHERE ef.id_solicitud = @applicationId
            `);
        return result.recordset || [];
    } catch (error) {        console.error('Error fetching signed stages by application id:', error);
        throw error;
    }
}

async function getStagesByFormatId(formatId) {
    try {
        if (formatId === undefined || formatId === null || formatId === '') {
            return [];
        }
        const pool = await config.poolPromise;
        const isInt = Number.isInteger(Number(formatId));
        const paramType = isInt ? sql.Int : sql.VarChar;
        const result = await pool.request()
            .input('formatId', paramType, formatId)
            .query(`
                SELECT
                    ef.*,
                    u.nombre_completo
                FROM etapas_firma ef
                LEFT JOIN Usuario u ON ef.id_firmante = u.id_registro_usuarios
                WHERE ef.formato_id = @formatId AND ef.estado = 'ACTIVO'
                ORDER BY ef.orden
            `);
        return result.recordset || [];
    } catch (error) {
        console.error('Error fetching stages by format id:', error);
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

async function getApplicationDocuments(applicationId) {
    try {
        if (applicationId === undefined || applicationId === null || applicationId === '') {
            return [];
        }

        const pool = await config.poolPromise;
        const isInt = Number.isInteger(Number(applicationId));
        const paramType = isInt ? sql.Int : sql.VarChar;

        const result = await pool.request()
            .input('applicationId', paramType, applicationId)
            .query(`
                SELECT
                    df.id_detalle_firmado,
                    df.id_detalle,
                    df.url_archivo_firmado,
                    df.id_firmante,
                    df.fecha_firma,
                    df.id_solicitud,
                    (SELECT TOP 1 url_archivos FROM Detalles_solicitudes WHERE id_solicitud = df.id_solicitud) as url_original
                FROM Documentos_Firmados df
                WHERE df.id_solicitud = @applicationId
                ORDER BY df.fecha_firma DESC
            `);

        const rows = result.recordset || [];
        return rows.map(r => ({
            id_detalle_firmado: r.id_detalle_firmado,
            id_detalle: r.id_detalle,
            url_archivo: r.url_archivo_firmado,
            url_original: r.url_original || r.url_archivo_firmado,
            id_firmante: r.id_firmante,
            fecha_firma: r.fecha_firma,
            id_solicitud: r.id_solicitud,
            estado_documento: 'FIRMADO',
            nombre_original: (r.url_original || r.url_archivo_firmado || '').split('/').pop() || null
        }));
    } catch (error) {
        console.error('Error fetching application documents:', error);
        throw error;
    }
}

module.exports = {
    getApplicationsByUser,
    getApplicationById,
    getApplicationDocuments,
    getStageSignedByApplicationId,
    getStagesByFormatId
};