const { getApplicationsByUser, getApplicationById, getApplicationDocuments } = require('../models/application.model');
const {countPendingandSigned } = require('../../pending/models/pending.model');

//Funcion para contar estados
function countApplicationStatus(docs = []) {
  const counts = { FIRMADO: 0, PENDIENTE: 0, RECHAZADO: 0, OTROS: 0, total: 0 };
  if (!Array.isArray(docs)) return counts;
  docs.forEach(item => {
    const estado = (item.estado_solicitud || item.estado || '').toString().trim().toUpperCase();
    if (estado === 'FIRMADO') counts.FIRMADO++;
    else if (estado === 'PENDIENTE') counts.PENDIENTE++;
    else if (estado === 'RECHAZADO' || estado === 'RECHAZADOS') counts.RECHAZADO++;
    else counts.OTROS++;
    counts.total++;
  });
  return counts;
}

//aqui se renderiza la vista principal de solicitudes
async function applicationRender(req, res) {
  try {
    const userId = req.user && req.user.id_registro_usuarios;
    let applicationDocs = [];
    if (userId) {
      applicationDocs = await getApplicationsByUser(userId);
      
      // Enriquecer cada documento con la fecha correcta según el estado
      applicationDocs = applicationDocs.map(doc => {
        const estado = (doc.estado_solicitud || '').toString().toUpperCase();
        
        let fechaAMostrar = null;
        let comentario = null
        let etiquetaFecha = 'Fecha de solicitud: ';
        
        if (estado === 'FIRMADO') {
          comentario = doc.desc_comentario;
          fechaAMostrar = doc.fecha_firma;
          etiquetaFecha = 'Fecha de firma: ';
        } else if (estado === 'RECHAZADO') {
          comentario = doc.motivo_rechazo;
          fechaAMostrar = doc.fecha_rechazo;
          etiquetaFecha = 'Fecha de rechazo: ';
        } else {
          comentario = doc.desc_comentario;
          fechaAMostrar = doc.fecha_solicitud;
          etiquetaFecha = 'Fecha de solicitud: ';
        }


        
        return {
          ...doc,
          fechaAMostrar: fechaAMostrar,
          etiquetaFecha: etiquetaFecha,
          estado_solicitud: estado,
          comentario: comentario
        };
      });
    } else {
      console.warn('applicationRender: no hay usuario logueado o id_registro_usuarios vacío');
    }
    const pendingData = await countPendingandSigned(userId);

    const statusCounts = countApplicationStatus(applicationDocs);
  
    res.render('application/views/applicationIndex', { 
      applicationDocs,
      pendingDocuments: pendingData?.pendientes || 0,
      signedDocuments: pendingData?.firmados || 0,
      signedUser: pendingData.id_formato  || null,
      signedName: applicationDocs.length > 0 ? applicationDocs[0].nombre_firmante : (pendingData.nombre_firmante || 'N/A'),
      applicationName: applicationDocs.length > 0 ? applicationDocs[0].nombre_solicitante : (pendingData.nombre_solicitante || 'N/A'),
      countSigned: statusCounts.FIRMADO,
      countPending: statusCounts.PENDIENTE,
      countRejected: statusCounts.RECHAZADO,
      countOthers: statusCounts.OTROS,
      countTotal: statusCounts.total,
      fecha_solicitud: applicationDocs[0]?.fecha_solicitud || null,
      fecha_firma: applicationDocs[0]?.fecha_firma || null,
      fecha_rechazo: applicationDocs[0]?.fecha_rechazo || null
    
    });
    
  } catch (error) {
    console.error('Error al renderizar index solicitudes:', error);
  }
}


// aqui en esta funcion se obtienen los datos en formato JSON
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

    const details = await getApplicationDocuments(id);
    if (!details) return res.status(404).json({ error: 'Solicitud no encontrada' });
    // console.log('applicationDetails: detalles=', details);

    // Devolver ambas claves para que el frontend (que busca `detalles`) y otras partes que usan `details` funcionen
    return res.json({ details, detalles: details, idSolicitud: id });
  } catch (error) {
    console.error('Error al obtener detalles de solicitud:', error);
    return res.status(500).json({ error: 'Error al obtener detalles' });
  }
}

module.exports = { applicationRender, applicationData, applicationDetails };