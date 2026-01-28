const { saveSolicitud, saveDetalles, getSignerUsers, getFormats } = require('../models/request.model');
const { getPendingDocuments } = require('../../pending/models/pending.model');
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
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
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
    const userStages = await getFormatById(req.body.formato);
    
    console.log('\n📧 ===== ENVIANDO NOTIFICACIONES A FIRMANTES ===== 📧');
    console.log('─'.repeat(60));
    console.log(`Total de firmantes: ${userStages.etapas.length}`);
    console.log(`ID de solicitud: ${idSolicitud}`);
    console.log(`Formato: ${req.body.formato}`);
    console.log('─'.repeat(60));

    let emailsEnviados = 0;
    let emailsErrores = [];

    for (let index = 0; index < userStages.etapas.length; index++) {
      try {
        console.log(`\n📨 Procesando firmante ${index + 1}/${userStages.etapas.length}...`);
        
        const user = await getUserById(userStages.etapas[index].id_firmante);
        
        if (!user) {
          console.warn(`⚠️  Firmante ${index + 1}: Usuario no encontrado`);
          emailsErrores.push({
            firmante: `Firmante ${index + 1}`,
            error: 'Usuario no encontrado en la base de datos'
          });
          continue;
        }

        if (!user.nombre_usuario || typeof user.nombre_usuario !== 'string' || !user.nombre_usuario.trim()) {
          console.warn(`⚠️  Firmante ${index + 1}: No tiene nombre de usuario válido`);
          emailsErrores.push({
            firmante: `${user.nombre_completo || 'Desconocido'} (ID: ${user.id_registro_usuarios})`,
            error: 'Nombre de usuario no definido o vacío'
          });
          continue;
        }

        const emailDestino = `${user.nombre_usuario.trim()}@newstetic.com`.toLowerCase();

        console.log(`   👤 Firmante: ${user.nombre_completo}`);
        console.log(`   📧 Email: ${emailDestino}`);

        await sendMail({
          to: emailDestino,
          subject: `DocSigned: Nueva solicitud de firma - ${req.body.formato}`,
          text: `Hola ${user.nombre_completo},\n\nSe ha creado una nueva solicitud de firma masiva.\n\nDetalles:\n- Solicitante: ${req.user.cn || req.user.nombre_usuario}\n- Formato: ${req.body.formato}\n- Comentarios: ${req.body.comments || 'Sin comentarios'}\n\nPor favor, ingresa al sistema para revisar y firmar los documentos asignados.\n\nEste es un correo automático. Por favor no respondas directamente a este mensaje.\nSi tienes dudas, contacta al administrador del sistema.`
        });

        console.log(`   ✅ Correo enviado correctamente`);
        emailsEnviados++;
      } catch (error) {
        console.error(`   ❌ Error al procesar firmante ${index + 1}:`, error.message);
        emailsErrores.push({
          firmante: `Firmante ${index + 1}`,
          error: error.message
        });
      }
    }
    
    console.log('─'.repeat(60));
    console.log(`Proceso completado: ${emailsEnviados} correos enviados, ${emailsErrores.length} errores`);
    console.log('─'.repeat(60) + '\n');
 



    for (let index = 0; index < processedFiles.length; index++) {
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