//CADA MODELO ESTA REFERENCIADO O RELACIONADO A UNA TABL EN ESPECIFICO
const sql = require('mssql');
const config = require('../../../db.js');


async function getPendingDocuments(userId, status = 'PENDIENTE') {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('status', sql.VarChar, status)
            .query(`
                SELECT 
                    s.id_registro_solicitud,
                    s.id_solicitante,
                    s.id_formato,
                    s.estado_solicitud,
                    s.tipo_solicitud,
                    s.fecha_solicitud,
                    s.motivo_rechazo,
                    CASE 
                        WHEN s.estado_solicitud = 'FIRMADO' THEN 
                            (SELECT TOP 1 fecha_firma 
                            FROM Documentos_Firmados 
                            WHERE id_solicitud = s.id_registro_solicitud)
                        ELSE s.fecha_solicitud
                    END as fecha_mostrar,
                    u.nombre_usuario,
                    u.cedula,
                    u.nombre_completo,
                    s.desc_comentario,
                    f.nombre_formato
                FROM solicitudes AS s
                JOIN Usuario AS u ON s.id_solicitante = u.id_registro_usuarios
                LEFT JOIN formatos AS f ON s.id_formato = f.id_registro_formato
                WHERE s.estado_solicitud = @status
                AND EXISTS (
                    SELECT 1
                    FROM etapas_firma ef
                    WHERE ef.formato_id = s.id_formato
                        AND ef.id_firmante = @userId
                )
            `);
            
        return result.recordset;
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
}

async function getDetallesDocuments(idSolicitud, estado) {
    try {
        const pool = await config.poolPromise;
        let query;
        if (estado === 'FIRMADO') {
            query = `
                SELECT 
                    df.id_detalle_firmado,
                    df.id_solicitud,
                    df.id_detalle,
                    sd.fecha_solicitud,
                    df.url_archivo_firmado as url_archivo,
                    df.fecha_firma,
                    ds.tipo_documento as nombre_original,
                    f.nombre_formato,
                    'FIRMADO' as estado_documento
                FROM Documentos_Firmados df
                INNER JOIN solicitudes sd ON df.id_solicitud = sd.id_registro_solicitud
                INNER JOIN Detalles_solicitudes ds ON df.id_detalle = ds.id_registro_detalles
                LEFT JOIN formatos f ON sd.id_formato = f.id_registro_formato
                WHERE df.id_solicitud = @idSolicitud
            `;
        } else {
            query = `
                SELECT 
                    ds.id_registro_detalles,
                    ds.id_solicitud,
                    ds.fecha_solicitud,
                    ds.url_archivos as url_archivo,
                    ds.tipo_documento as nombre_original,
                    f.nombre_formato,
                    'PENDIENTE' as estado_documento
                FROM Detalles_solicitudes ds
                LEFT JOIN solicitudes s ON ds.id_solicitud = s.id_registro_solicitud
                LEFT JOIN formatos f ON s.id_formato = f.id_registro_formato
                WHERE ds.id_solicitud = @idSolicitud
            `;
        }

        const result = await pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .query(query);

        return result.recordset;
    } catch (error) {
        console.error('Error al obtener los detalles:', error);
        throw error;
    }
}

async function countPendingandSigned(userId) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    SUM(CASE WHEN s.estado_solicitud = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
                    SUM(CASE WHEN s.estado_solicitud = 'FIRMADO' THEN 1 ELSE 0 END) AS firmados
                FROM solicitudes s
                WHERE EXISTS (
                    SELECT 1
                    FROM etapas_firma ef
                    WHERE ef.formato_id = s.id_formato
                        AND ef.id_firmante = @userId
                )
            `);
        return result.recordset[0];
    } catch (error) {
        console.error('Error al contar documentos pendientes y firmados:', error);
        throw error;
    }
}

async function countSolicitedDocuments(userId) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request() 
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) AS totalSolicitudes
                FROM solicitudes
                WHERE id_solicitante = @userId
            `);
        return result.recordset[0].totalSolicitudes;
    } catch (error) {
        console.error('Error al contar documentos solicitados:', error);
        throw error;
    }
}

async function createDocumentSigned(url, formato, idFirmante, idDetalleSolicitud, idSolicitud) {
    try {


        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('url', sql.VarChar, url)
            .input('formato', sql.VarChar, formato)
            .input('idFirmante', sql.Int, idFirmante)
            .input('idDetalleSolicitud', sql.Int, idDetalleSolicitud)
            .input('idSolicitud', sql.Int, idSolicitud)
            .query(`
                INSERT INTO Documentos_Firmados 
                (id_detalle, url_archivo_firmado, id_firmante, fecha_firma, id_solicitud)
                VALUES 
                (@idDetalleSolicitud, @url, @idFirmante, GETDATE(), @idSolicitud);

                SELECT SCOPE_IDENTITY() AS id_detalle_firmado;
            `);

        console.log('Documento firmado creado:', result);
        return result;
    } catch (error) {
        console.error('Error al crear documento firmado:', error);
        throw error;
    }
}

async function changeStateApplication(idSolicitud, newState, motivo = null) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .input('newState', sql.VarChar, newState)
            .input('motivo', sql.VarChar, motivo || null)
            .query(`
                UPDATE solicitudes 
                SET estado_solicitud = @newState,
                motivo_rechazo = CASE WHEN @newState = 'RECHAZADO' THEN @motivo ELSE motivo_rechazo END,
                fecha_firma = CASE WHEN @newState = 'FIRMADO' THEN GETDATE() ELSE fecha_firma END,
                fecha_rechazo = CASE WHEN @newState = 'RECHAZADO' THEN GETDATE() ELSE fecha_rechazo END
                WHERE id_registro_solicitud = @idSolicitud 
                
                
            `);
            console.log('Resultado de la actualización del estado:', result);
        return result;
    } catch (error) {
        console.error('Error al actualizar estado de solicitud:', error);
        throw error;
    }
}

async function getUserInfo(id_registro_usuarios){
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('id_registro_usuarios', sql.Int, id_registro_usuarios)
            .query('SELECT * FROM Usuario WHERE id_registro_usuarios = @id_registro_usuarios');
        return result.recordset[0];
    } catch (error) {
        console.error('Error al obtener la información del usuario:', error);
        throw error;
    }
}

module.exports = {
    getPendingDocuments,
    getDetallesDocuments,
    countSolicitedDocuments,
    countPendingandSigned,
    getUserInfo,
    changeStateApplication,
    createDocumentSigned
};