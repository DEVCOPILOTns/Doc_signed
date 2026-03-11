const { getApplicationsByUser, getApplicationById, getApplicationDocuments, getAllDocumentsForDownload, getStageSignedByApplicationId, getStagesByFormatId } = require('../models/application.model');
const {countPendingandSigned, countPendingByCurrentStage } = require('../../pending/models/pending.model');
const {getFormatById} = require('../../createFormat/models/createFormat.model');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

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
      // Enriquecer cada documento con la fecha correcta según el estado y obtener etapas
      applicationDocs = await Promise.all(applicationDocs.map(async (doc) => {
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

        // Obtener etapas para CADA documento
        let nombresFirmantes = [];
        let etapas = [];
        let etapaActual = null;
        let nombreEtapaActual = 'N/A';
        
        // Si está FIRMADO, trae de etapas_firmadas (registro real de quiénes firmaron)
        // Si NO está FIRMADO, trae de etapas_firma (firmantes esperados del formato)
        if (estado === 'FIRMADO') {
          etapas = await getStageSignedByApplicationId(doc.id_registro_solicitud);
          nombreEtapaActual = 'Completado';
        } else {
          // Para solicitudes no firmadas, obtener las etapas esperadas del formato
          etapas = await getStagesByFormatId(doc.id_formato);
          
          // Si hay etapa_actual en la solicitud, obtener el nombre del firmante de esa etapa
          if (doc.etapa_actual && etapas && etapas.length > 0) {
            const etapaActualObj = etapas.find(e => e.id_registro_etapa === doc.etapa_actual || e.orden === doc.etapa_actual);
            if (etapaActualObj) {
              etapaActual = etapaActualObj;
              nombreEtapaActual = `${etapaActualObj.orden}. ${etapaActualObj.nombre_completo || 'Firmante desconocido'}`;
            }
          }
        }
        
        if (etapas && etapas.length > 0) {
          nombresFirmantes = etapas.map(etapa => etapa.nombre_completo || 'N/A');
        }

        // Obtener formato para CADA documento
        const formatAndStages = await getFormatById(doc.id_formato);
        const cantidadFirmantes = formatAndStages ? formatAndStages.cantidad_firmantes : 0;
        
        return {
          ...doc,
          fechaAMostrar: fechaAMostrar,
          etiquetaFecha: etiquetaFecha,
          estado_solicitud: estado,
          comentario: comentario,
          nombresFirmantes: nombresFirmantes,
          cantidadFirmantes: cantidadFirmantes,
          etapas: etapas,
          etapaActual: etapaActual,
          nombreEtapaActual: nombreEtapaActual
        };
      }));
    } else {
      console.warn('applicationRender: no hay usuario logueado o id_registro_usuarios vacío');
    }
    const pendingData = await countPendingByCurrentStage(userId);
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
      fecha_rechazo: applicationDocs[0]?.fecha_rechazo || null,
      formato: applicationDocs[0]?.formato || null
    
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

// Función para descargar todos los documentos como ZIP
async function downloadAllApplicationDocuments(req, res) {
    try {
        const { idSolicitud } = req.params;
        
        if (!idSolicitud) {
            return res.status(400).json({ error: 'ID de solicitud requerido' });
        }

        console.log(`\n[DESCARGA] ========== INICIANDO DESCARGA MASIVA ==========`);
        console.log(`[DESCARGA] ID de solicitud: ${idSolicitud}`);

        // Obtener todos los documentos firmados de la aplicación
        const detalles = await getAllDocumentsForDownload(idSolicitud);

        if (!detalles || detalles.length === 0) {
            console.error(`[DESCARGA] ❌ No hay documentos para descargar`);
            return res.status(404).json({ error: 'No hay documentos para descargar' });
        }

        console.log(`[DESCARGA] 📄 Total de documentos encontrados: ${detalles.length}`);

        // Preparar response como ZIP
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="solicitud_${idSolicitud}.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        // Capturar errores del archive
        archive.on('error', (err) => {
            console.error('[DESCARGA] ❌ Error en archive:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al crear el ZIP' });
            }
        });

        // Piping del archive al response
        archive.pipe(res);

        // Agregar cada documento al ZIP
        let archivosAgregados = 0;
        let archivosNoEncontrados = [];
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        for (let i = 0; i < detalles.length; i++) {
            const detalle = detalles[i];
            let fileUrl = detalle.url_archivo;

            if (!fileUrl) {
                console.warn(`[DESCARGA] ⚠️  Documento ${i + 1} sin URL`);
                archivosNoEncontrados.push(`Documento ${i + 1}: Sin URL en BD`);
                continue;
            }

            try {
                const cleanFileName = detalle.nombre_original || `documento_${i + 1}.pdf`;
                
                console.log(`[DESCARGA] \n📝 Procesando documento ${i + 1}/${detalles.length}`);
                console.log(`[DESCARGA]    Nombre: ${cleanFileName}`);
                console.log(`[DESCARGA]    URL en BD: ${fileUrl}`);

                // IMPORTANTE: Construir URL absoluta si es relativa
                let fullUrl = fileUrl;
                
                // Si NO comienza con http, es una ruta relativa - agregar protocolo y host
                if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                    fullUrl = `${baseUrl}${fileUrl}`;
                    console.log(`[DESCARGA]    URL construida: ${fullUrl}`);
                }

                // Descargar el archivo vía HTTP/HTTPS
                console.log(`[DESCARGA] 🔄 Descargando desde URL...`);
                
                // Crear un controller with timeout
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000); // 30 segundos
                
                try {
                    const fileResponse = await fetch(fullUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/pdf, application/*'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeout);

                    if (!fileResponse.ok) {
                        throw new Error(`HTTP ${fileResponse.status}: ${fileResponse.statusText}`);
                    }

                    const contentType = fileResponse.headers.get('content-type');
                    if (!contentType || !contentType.includes('application')) {
                        throw new Error(`Tipo de contenido incorrecto: ${contentType}`);
                    }

                    // Obtener el contenido del archivo
                    const arrayBuffer = await fileResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    if (!buffer || buffer.length === 0) {
                        throw new Error('Archivo descargado está vacío');
                    }

                    // Agregar al ZIP
                    archive.append(buffer, { name: cleanFileName });
                    archivosAgregados++;
                    
                    console.log(`[DESCARGA] ✅ Archivo ${i + 1} agregado al ZIP (${(buffer.length / 1024).toFixed(2)} KB)`);

                } catch (fetchErr) {
                    clearTimeout(timeout);
                    if (fetchErr.name === 'AbortError') {
                        throw new Error('Timeout al descargar (30 segundos)');
                    }
                    throw fetchErr;
                }

            } catch (err) {
                console.error(`[DESCARGA] ❌ Error descargando documento ${i + 1}:`, err.message);
                archivosNoEncontrados.push(`${cleanFileName}: ${err.message}`);
            }
        }

        // Resumen final
        console.log(`\n[DESCARGA] ========== RESUMEN DE DESCARGA ==========`);
        console.log(`[DESCARGA] ✅ Archivos agregados: ${archivosAgregados}/${detalles.length}`);
        
        if (archivosNoEncontrados.length > 0) {
            console.log(`[DESCARGA] ❌ Archivos fallidos (${archivosNoEncontrados.length}):`);
            archivosNoEncontrados.forEach(f => console.log(`[DESCARGA]    - ${f}`));
        }
        
        console.log(`[DESCARGA] ===========================================\n`);

        // Finalizar el archivo ZIP
        archive.finalize();

    } catch (error) {
        console.error('[DESCARGA] ❌ Error general:', error.message);
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: true, 
                message: 'Error al descargar los documentos',
                details: error.message 
            });
        }
    }
}

module.exports = { applicationRender, applicationData, applicationDetails, downloadAllApplicationDocuments };