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

async function applicationRender(req, res) {
  try {
    const userId = req.user && req.user.id_registro_usuarios;
    let applicationDocs = [];
    if (userId) {
      applicationDocs = await getApplicationsByUser(userId);
    } else {
      console.warn('applicationRender: no hay usuario logueado o id_registro_usuarios vacío');
    }
    const pendingData = await countPendingandSigned(userId);
    // Priorizar el firmante obtenido de applicationDocs (si existe), si no usar el de pendingData


    const statusCounts = countApplicationStatus(applicationDocs);
    // console.log('statusCounts:', statusCounts);

    res.render('application/views/applicationIndex', { 
      applicationDocs,
      pendingDocuments: pendingData?.pendientes || 0,
      signedDocuments: pendingData?.firmados || 0,
      signedUser: pendingData.id_firmante || null,
      signedName: applicationDocs.length > 0 ? applicationDocs[0].nombre_firmante : (pendingData.nombre_firmante || 'N/A'),
      applicationName: applicationDocs.length > 0 ? applicationDocs[0].nombre_solicitante : (pendingData.nombre_solicitante || 'N/A'),
      countSigned: statusCounts.FIRMADO,
      countPending: statusCounts.PENDIENTE,
      countRejected: statusCounts.RECHAZADO,
      countOthers: statusCounts.OTROS,
      countTotal: statusCounts.total
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
    console.log('applicationDetails: id=', id); // Log para depurar
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