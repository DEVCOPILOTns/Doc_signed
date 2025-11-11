const { getApplicationsByUser, getApplicationById } = require('../models/application.model');
const {countPendingandSigned} = require('../../pending/models/pending.model');

async function applicationRender(req, res) {
  try {
    const userId = req.user && req.user.id_registro_usuarios;
    console.log('applicationRender: userId=', userId); // Log para depurar
    let applicationDocs = [];
    if (userId) {
      applicationDocs = await getApplicationsByUser(userId);
    } else {
      console.warn('applicationRender: no hay usuario logueado o id_registro_usuarios vacío');
    }
    const pendingData = await countPendingandSigned(userId);
    // Priorizar el firmante obtenido de applicationDocs (si existe), si no usar el de pendingData


    res.render('application/views/applicationIndex', { 
      applicationDocs,
      pendingDocuments: pendingData?.pendientes || 0,
      signedDocuments: pendingData?.firmados || 0,
      totalDocuments: (pendingData?.pendientes || 0) + (pendingData?.firmados || 0),
      signedUser: pendingData.id_firmante || null,
      signedName: applicationDocs.length > 0 ? applicationDocs[0].nombre_firmante : (pendingData.nombre_firmante || 'N/A'),
      applicationName: applicationDocs.length > 0 ? applicationDocs[0].nombre_solicitante : (pendingData.nombre_solicitante || 'N/A')
    });
    
  } catch (error) {
    console.error('Error al renderizar index solicitudes:', error);
  }
}







// Endpoint JSON: lista de solicitudes (opcional, si lo necesitas desde JS)
async function applicationData(req, res) {
  try {
    const userId = req.user && req.user.id_registro_usuarios;
    const apps = userId ? await getApplicationsByUser(userId) : [];
    return res.json({ applications: apps });
  } catch (error) {
    console.error('Error al obtener datos de solicitudes:', error);
    return res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
}

// Endpoint JSON: detalles de una solicitud por id (para popular modal)
async function applicationDetails(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Falta id de solicitud' });

    const { solicitud, archivos } = await getApplicationById(id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Normalizar estructura de respuesta para el cliente
    const detalles = {
      id: solicitud.id_registro_solicitud || solicitud.id_solicitud || solicitud.id,
      estado: solicitud.estado_solicitud || solicitud.estado || '',
      fecha_mostrar: solicitud.fecha_mostrar || solicitud.fecha || solicitud.fecha_creacion,
      nombre_usuario: solicitud.nombre_usuario || solicitud.usuario || solicitud.nombre_completo || '',
      cedula: solicitud.cedula || solicitud.identificacion || '',
      desc_comentario: solicitud.desc_comentario || solicitud.comentario || solicitud.observacion || '',
      archivos: archivos.map(a => ({
        id: a.id_archivo || a.id,
        nombre_original: a.nombre_original || a.nombre,
        url_archivo: a.url_archivo || a.ruta || a.path
      }))
    };

    return res.json({ detalles });
  } catch (error) {
    console.error('Error al obtener detalles de solicitud:', error);
    return res.status(500).json({ error: 'Error al obtener detalles' });
  }
}

module.exports = { applicationRender, applicationData, applicationDetails };