const { saveSolicitud, saveDetalles, getSignerUsers, getFormats } = require('../models/request.model');
const { getPendingDocuments } = require('../../pending/models/pending.model');
const {getapplication} = require('../../pending/models/pending.model');
const {getFormatById} = require('../../createFormat/models/createFormat.model');
const { sendMail } = require('../services/mail.service');
const {getUserById} = require('../../users/models/users.model');


async function masiveSignRender(req, res) {
  const resultPending = await getPendingDocuments(req.user.id_registro_usuarios);
  const formats = await getFormats();
  const signerUsers = await getSignerUsers();
  return res.render('masiveSign/views/masiveSignIndex', {
    pendingDocuments: resultPending.length,
    signerUsers: signerUsers,
    formats: formats,
  });
}

async function uploadFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No se subieron archivos',
      });
    }

    // Procesar archivos con URL pública
    const processedFiles = req.files.map(file => {
      const xForwardedProto = req.get('x-forwarded-proto');
      const protocol = xForwardedProto || req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      console.log(`🔗 URL ARCHIVO: ${fileUrl}`);
      
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl, // ✅ URL lista para guardar en BD
      };
    });

    const tipo_solicitud = 'masiva'
    const idSolicitud = await saveSolicitud(req.user.id_registro_usuarios, req.body.formato, tipo_solicitud, req.body.comments || '');
    const application = await getapplication(idSolicitud);
    const userStages = await getFormatById(req.body.formato);
    const solicitanteInfo = await getUserById(req.user.id_registro_usuarios);
    
    console.log('\n📧 ===== ENVIANDO NOTIFICACIONES A FIRMANTES ===== 📧');
    console.log('─'.repeat(60));
    console.log(`Total de firmantes: ${userStages.etapas.length}`);
    console.log(`ID de solicitud: ${idSolicitud} (tipo: ${typeof idSolicitud})`);
    console.log(`Formato: ${req.body.formato}`);
    console.log(`Solicitante: ${solicitanteInfo.nombre_completo}`);
    console.log('─'.repeat(60));

    let emailsEnviados = 0;
    let emailsErrores = [];
    let idSolicitante = req.user.id_registro_usuarios;
    let idFirmantePrimeraEtapa = userStages.etapas[0].id_firmante;
    
    // Obtener email del solicitante para comparar después
    const emailSolicitante = `${solicitanteInfo.nombre_usuario.trim()}@newstetic.com`.toLowerCase();

    
    try {
        console.log('\n📨 Procesando primer firmante');
        const userFirmante = await getUserById(idFirmantePrimeraEtapa);
        
        if (!userFirmante) {
          console.warn(`Firmante no encontrado`);
          emailsErrores.push({
            firmante: `Firmante`,
            error: 'Usuario no encontrado en la base de datos'
          });
          throw new Error('Firmante no encontrado');
        }

        if (!userFirmante.nombre_usuario || typeof userFirmante.nombre_usuario !== 'string' || !userFirmante.nombre_usuario.trim()) {
          console.warn(`El Firmante No tiene nombre de usuario válido`);
          emailsErrores.push({
            firmante: `${userFirmante.nombre_completo || 'Desconocido'} (ID: ${userFirmante.id_registro_usuarios})`,
            error: 'Nombre de usuario no definido o vacío'
          });
          throw new Error('Nombre de usuario no válido');
        }

        const emailFirmante = `${userFirmante.nombre_usuario.trim()}@newstetic.com`.toLowerCase();

        console.log(`   👤 Primer Firmante: ${userFirmante.nombre_completo}`);
        console.log(`   📧 Email: ${emailFirmante}`);

        // Enviar correo al primer firmante siempre
        console.log(`   📨 Enviando correo con variables:`, { solicitudId: idSolicitud });
        await sendMail({
          to: emailFirmante,
          type: 'signer',
          subject: `DocSigned: Nueva solicitud de firma - ${req.body.formato}`,
          variables: {
            solicitudId: idSolicitud
          },
          text: `Hola ${userFirmante.nombre_completo},\n\nSe ha creado una nueva solicitud de firma masiva.\n\nDetalles:\n- Solicitante: ${solicitanteInfo.nombre_completo}\n- Formato: ${req.body.formato}\n- Comentarios: ${req.body.comments || 'Sin comentarios'}\n\nPor favor, ingresa al sistema para revisar y firmar los documentos asignados.\n\nEste es un correo automático. Por favor no respondas directamente a este mensaje.\nSi tienes dudas, contacta al administrador del sistema.`
        });

        console.log(`   ✅ Correo enviado al firmante`);
        emailsEnviados++;
    } catch (error) {
        console.error(`   ❌ Error al procesar primer firmante:`, error.message);
        emailsErrores.push({
          firmante: `Primer Firmante`,
          error: error.message
        });
    }
    
    console.log('─'.repeat(60));
    console.log(`Correos a firmantes: ${emailsEnviados} enviados, ${emailsErrores.length} errores`);
    console.log('─'.repeat(60) + '\n');
 
    // ==================== ENVIAR CORREO AL SOLICITANTE ====================
    console.log('\n📧 ===== ENVIANDO CONFIRMACIÓN AL SOLICITANTE ===== 📧');
    console.log('─'.repeat(60));
    
    try {
      const fechaCreacion = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`   📨 Enviando confirmación a: ${emailSolicitante}`);

      // Obtener nombres de los firmantes
      const firmantes = [];
      for (let i = 0; i < userStages.etapas.length; i++) {
        const userFirmante = await getUserById(userStages.etapas[i].id_firmante);
        firmantes.push(`${i + 1}. ${userFirmante.nombre_usuario}`);
      }

      await sendMail({
        to: emailSolicitante,
        type: 'requester',
        subject: 'DocSigned: Solicitud de Firma Creada Exitosamente',
        variables: {
          solicitudId: idSolicitud,
          formatoNombre: req.body.formato,
          totalDocumentos: processedFiles.length,
          firmantes: firmantes.join('\n'),
          totalFirmantes: userStages.etapas.length,
          fechaCreacion: fechaCreacion,
          urlSolicitudes: `${req.protocol}://${req.get('host')}/api/pending`
        }
      });

      console.log(`   ✅ Correo de confirmación enviado correctamente`);
    } catch (errorSolicitante) {
      console.error(`   ❌ Error al enviar correo al solicitante:`, errorSolicitante.message);
    }

    console.log('─'.repeat(60) + '\n');

    for (let index = 0; index < processedFiles.length; index++) {
      console.log(`📝 URL Guardando: ${processedFiles[index].url}`);
      await saveDetalles(idSolicitud, processedFiles[index].url, req.body.formato);
    }

    // Preparar respuesta con información de envío de correos
    const respuesta = {
      error: false,
      message: 'Archivos cargados exitosamente',
      files: processedFiles,
      totalFiles: processedFiles.length,
      emailsInfo: {
        enviados: emailsEnviados,
        errores: emailsErrores,
        total: userStages.etapas.length,
        tieneErrores: emailsErrores.length > 0
      }
    };

    return res.status(200).json(respuesta);    

  } catch (error) {
    console.error('Error en uploadFiles:', error);
    return res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
      debug: {
        errorMessage: error.message,
        errorStack: error.stack,
      }
    });
  }
}



module.exports = {
  masiveSignRender,
  uploadFiles
};