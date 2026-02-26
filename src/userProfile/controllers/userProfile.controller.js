const { countPendingandSigned, countPendingByCurrentStage, countSolicitedDocuments } = require('../../pending/models/pending.model');
const {getUserById} = require('../../users/models/users.model');
const { updateSignUser } = require('../models/userProfile.model.js');


async function userProfileRender(req, res) {
  try {
    const pendingData = await countPendingByCurrentStage(req.user.id_registro_usuarios);
    const getSign = await getUserById(req.user.id_registro_usuarios);
    const solicitedDocument = await countSolicitedDocuments(req.user.id_registro_usuarios);
    return res.render('userProfile/views/userProfileIndex', {
      pendingDocuments: pendingData.pendientes,
      signedDocuments: pendingData.firmados,
      solicitedDocuments: solicitedDocument,
      name: req.user.givenName + ' ' + req.user.sn,
      user: req.user,
      dni: req.user.cedula,
      urlSign: getSign.url_firma,
      pendingCount: pendingData.pendientes,
      nombreusuario: req.user.nombre_usuario,
      
    });

  } catch (err) {
    console.error('Error fetching user profile data:', err);
    return res.status(500).send('Internal Server Error', err);
  };

}

async function uploadSign(req, res) {

  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No se subió archivo',
      });
    }

    // Procesar archivo con URL pública
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    console.log('Archivo procesado:', fileUrl);
    const updateSign = await updateSignUser(req.user.id_registro_usuarios, fileUrl);

    // Devolver JSON en lugar de redirect
    return res.status(200).json({
      error: false,
      message: 'Firma guardada exitosamente',
      url: fileUrl
    });

  } catch (error) {
    console.error('❌ Error en uploadSign:', error);
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
  userProfileRender,
  uploadSign
};