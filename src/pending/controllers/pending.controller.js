const PDFLib = require('pdf-lib');
const {getDetallesDocuments, getPendingDocuments, gestStage, getapplication, countPendingandSigned, createStageSigned, changeStateApplication, createDocumentSigned, getUserInfo, getStagesSignedByapplication, updateApplicationActualStage, getLastSignedDocument, updateDocumentSigned
} = require('../models/pending.model');
const { getFormatById } = require('../../createFormat/models/createFormat.model');
const { uploadFileToStorage } = require('../services/uploadFileToStorage.service');
const signatureService = require('../../pending/services/signature.service');



//async function pendingRender(req, res) {
  //try {
    //let pendingDocs = [];
    //if (req.user && req.user.id_registro_usuarios) {
      //pendingDocs = await getPendingDocuments(req.user.id_registro_usuarios);
    //}
    //res.render('pending/views/pendingIndex', { pendingDocs });
  //} catch (error) {
    //console.error('Error al renderizar index pendientes:', error);
    //res.render('pending/views/pendingIndex', { pendingDocs: [], error: 'No se pudieron cargar las solicitudes pendientes.' });
  //}
//}

async function getPending(req, res) {
  try {
    if (!req.user || !req.user.id_registro_usuarios) {
      return res.status(400).json({
        error: true,
        message: 'Usuario no autenticado',
      });
    }
    // Lee el parámetro status
    const status = req.query.status || 'PENDIENTE';//aqui estoy 
    const resultPending = await getPendingDocuments(req.user.id_registro_usuarios, status);
    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);
    return res.render('pending/views/pendingIndex', {
      status,
      pendingDocuments: pendingData.pendientes,
      signedDocuments: pendingData.firmados,
      dateSigned: pendingData.fecha_firma,
      pendingDocs: resultPending

    });

  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
    });
  }
}
async function getDetallesBySolicitud(req, res) {
    console.log('Obteniendo detalles para la solicitud:', req.params.idSolicitud);
    const { getDetallesDocuments } = require('../models/pending.model');
    const idSolicitud = req.params.idSolicitud;
    const estado = req.query.estado || 'PENDIENTE';
    
    try {
        const detalles = await getDetallesDocuments(idSolicitud, estado);
        res.json({ detalles });
    } catch (error) {
        res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
}

async function signAllDocuments(req, res) {
    try {
        const { selectedFormat, COORDS } = req.body;
        
        // Validar usuario y documento
        if (!req.user?.id_registro_usuarios) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const userInfo = {
            id: parseInt(req.user.id_registro_usuarios, 10),
            selectedDocumentId: parseInt(req.params.selectedDocumentId, 10)
        };

        // Validar que los IDs sean números válidos
        if (isNaN(userInfo.id) || isNaN(userInfo.selectedDocumentId)) {
            return res.status(400).json({ message: 'IDs de usuario o solicitud inválidos' });
        }

        // Obtener información de firma del usuario
        const docPublicUrl = await getUserInfo(userInfo.id);
        if (!docPublicUrl?.url_firma) {
            return res.status(400).json({ message: 'URL de firma no encontrada' });
        }

        // Modificar la parte de obtención de firma
        let firmaUrl;
        try {
            const rawUrl = docPublicUrl.url_firma;
            
            // Limpiar y validar la URL
            const cleanUrl = rawUrl.trim().replace(/\\/g, '/');
            firmaUrl = cleanUrl.startsWith('http') 
                ? new URL(cleanUrl)
                : new URL(`/uploads/${path.basename(cleanUrl)}`, 'http://localhost:3000');

            console.log('Intentando obtener firma desde:', firmaUrl.toString());

            // Obtener la imagen directamente con las opciones correctas
            const sigResponse = await fetch(firmaUrl.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'image/png,image/jpeg,image/*;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                redirect: 'follow', // Seguir redirecciones
                follow: 5 // Máximo de redirecciones
            });

            // Verificar la respuesta
            if (!sigResponse.ok) {
                console.error('Error en la respuesta:', {
                    status: sigResponse.status,
                    statusText: sigResponse.statusText,
                    headers: Object.fromEntries(sigResponse.headers.entries())
                });
                throw new Error(`Error al obtener la firma: ${sigResponse.status} ${sigResponse.statusText}`);
            }

            // Verificar el tipo de contenido
            const contentType = sigResponse.headers.get('content-type');
            if (!contentType || !contentType.match(/^image\/(png|jpeg|jpg|gif)/i)) {
                console.error('Tipo de contenido incorrecto:', {
                    received: contentType,
                    url: firmaUrl.toString()
                });
                throw new Error(`Tipo de contenido no válido para firma: ${contentType}`);
            }

            // Obtener el buffer de la imagen
            const sigBuffer = await sigResponse.arrayBuffer();
            
            if (!sigBuffer || sigBuffer.byteLength === 0) {
                throw new Error('La firma está vacía');
            }

            console.log('Firma obtenida correctamente:', {
                contentType,
                size: sigBuffer.byteLength,
                url: firmaUrl.toString()
            });


            const application = await getapplication(userInfo.selectedDocumentId);
                console.log('info', application);
            const stageResult = await gestStage(userInfo.id, application.id_formato);
                console.log('gestStage', stageResult);
            const formatInfo = await getFormatById(application.id_formato);
                console.log('formatInfo', formatInfo);
            await createStageSigned(stageResult[0].id_registro_etapa, application.id_formato, application.id_registro_solicitud, stageResult[0].id_firmante, 'FIRMADO');
            const stagesSigned = await getStagesSignedByapplication(userInfo.selectedDocumentId, application.id_formato);
                console.log('los stages firmados', stagesSigned.length, 
                            'la cantidad de firmantes del formato', formatInfo.cantidad_firmantes);
            
            // Calcular siguiente etapa (después de firmar) - no exceder cantidad_firmantes
            const proximaEtapa = Math.min(stagesSigned.length + 1, formatInfo.cantidad_firmantes);
            await updateApplicationActualStage(application.id_registro_solicitud, proximaEtapa);
            
            // Continuar con el procesamiento de documentos...
            const documentos = await getDetallesDocuments(userInfo.selectedDocumentId, 'PENDIENTE');
            if (!documentos?.length) {
                return res.status(404).json({ message: 'No hay documentos para firmar.' });
            }

            const resultados = [];
        
            // Procesar cada documento
            for (const doc of documentos) {
                try {
                    if (!doc.url_archivo) {
                        throw new Error('URL del archivo no disponible');
                    }

                    let pdfUrlToUse = doc.url_archivo;

                    // Si no es la primera firma, obtener el documento ya firmado (con las firmas anteriores)
                    if (stagesSigned.length > 0) {
                        const lastSignedDoc = await getLastSignedDocument(userInfo.selectedDocumentId, doc.id_registro_detalles);
                        if (lastSignedDoc?.url_archivo_firmado) {
                            console.log('Usando documento previamente firmado:', lastSignedDoc.url_archivo_firmado);
                            pdfUrlToUse = lastSignedDoc.url_archivo_firmado;
                        }
                    }

                    // Asegurarse que la URL es absoluta
                    const pdfUrl = new URL(pdfUrlToUse, 'http://localhost:3000').toString();
                    
                    // Descargar PDF con validación de tipo
                    const pdfResponse = await fetch(pdfUrl, {
                        headers: {
                            'Accept': 'application/pdf'
                        }
                    });

                    if (!pdfResponse.ok || !pdfResponse.headers.get('content-type').includes('pdf')) {
                        throw new Error(`Error al descargar PDF: Tipo de contenido inválido`);
                    }

                    const pdfBuffer = await pdfResponse.arrayBuffer();

                    // Validar que es un PDF válido
                    try {
                        await PDFLib.PDFDocument.load(pdfBuffer);
                    } catch (error) {
                        throw new Error('El archivo no es un PDF válido');
                    }
                    

                    // Detectar área e insertar firma
                    const signatureArea = await signatureService.detectSignatureArea(
                        new Uint8Array(pdfBuffer),
                        selectedFormat,
                        stageResult[0].palabra_clave
                    );

                    // Insertar la firma en el PDF
                    const signedPdfBytes = await signatureService.insertSignature(
                        new Uint8Array(pdfBuffer),
                        new Uint8Array(sigBuffer),
                        signatureArea
                    );

                    // Subir documento firmado
                    const fileName = `${doc.nombre_original}-firmado.pdf`;
                    const { publicUrl } = await uploadFileToStorage(signedPdfBytes, fileName, req);

                    // Registrar documento firmado
                    // Si ya existía un documento firmado anterior, actualizar su URL
                    const lastSigned = await getLastSignedDocument(userInfo.selectedDocumentId, doc.id_registro_detalles);
                    if (lastSigned) {
                        // Actualizar el documento existente con la nueva URL (que incluye todas las firmas)
                        console.log('Actualizando documento existente:', lastSigned.id_detalle_firmado);
                        await updateDocumentSigned(lastSigned.id_detalle_firmado, publicUrl);
                    } else {
                        // Crear nuevo registro si es el primero
                        console.log('Creando nuevo registro de documento firmado');
                        await createDocumentSigned(
                            publicUrl,
                            selectedFormat, 
                            userInfo.id,
                            doc.id_registro_detalles,
                            userInfo.selectedDocumentId
                        );
                    }

                    resultados.push({
                        documento: doc.nombre_original,
                        firmado: true,
                        url: publicUrl
                    });

                } catch (error) {
                    console.error(`Error al procesar documento ${doc.nombre_original}:`, error);
                    resultados.push({
                        documento: doc.nombre_original,
                        firmado: false,
                        error: error.message
                    });
                }
            }
    
            // Actualizar estado si todo fue exitoso
            if (resultados.every(r => r.firmado)) {

                if (stagesSigned.length === formatInfo.cantidad_firmantes) {
                    console.log('Todos los stages firmados');
                    await changeStateApplication(userInfo.selectedDocumentId, 'FIRMADO', null);
                }
                
            } 

            return res.status(200).json({
                message: 'Proceso de firma completado',
                etapaActual: proximaEtapa,
                totalEtapas: formatInfo.cantidad_firmantes,
                estaCompleto: stagesSigned.length === formatInfo.cantidad_firmantes,
                resultados
            });

        } catch (error) {
            console.error('Error detallado al procesar firma:', {
                error: error.message,
                stack: error.stack,
                url: firmaUrl?.toString(),
                originalUrl: docPublicUrl?.url_firma
            });
            
            return res.status(500).json({
                message: 'Error al procesar firma',
                error: error.message,
                details: {
                    url: firmaUrl?.toString(),
                    originalUrl: docPublicUrl?.url_firma,
                    message: error.message
                }
            });
        }

    } catch (error) {
        console.error('Error general:', error);
        return res.status(500).json({
            message: 'Error al firmar documentos',
            error: error.message,
            details: error.stack
        });
    }
}

async function rejectApplication(req, res) {
    try {
        const { selectedDocumentId } = req.params;
        const { motivo } = req.body;
        
        if (!selectedDocumentId) {
            return res.status(400).json({ 
                message: 'ID de solicitud no proporcionado' 
            });
        }

        if (!motivo || motivo.trim() === '') {
            return res.status(400).json({ 
                message: 'El motivo del rechazo es obligatorio' 
            });
        }

        // Cambiar estado a RECHAZADO
        await changeStateApplication(selectedDocumentId, 'RECHAZADO', motivo);
        
        // Aquí puedes guardar el motivo del rechazo si lo necesitas
        console.log(`Solicitud ${selectedDocumentId} rechazada. Motivo: ${motivo}`);
        
        return res.status(200).json({ 
            message: 'Solicitud rechazada correctamente',
            idSolicitud: selectedDocumentId,
            motivo: motivo
        });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        return res.status(500).json({
            message: 'Error al rechazar la solicitud',
            error: error.message
        });
    }
}

module.exports = {
  //pendingRender,
  getPending,
  signAllDocuments,
  getDetallesBySolicitud,
  rejectApplication
};

