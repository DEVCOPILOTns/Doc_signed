const express = require('express');
const router = express.Router();
const { getPending, signAllDocuments, getDetallesBySolicitud, rejectApplication} = require('../controllers/pending.controller');

router.get('/', getPending);
router.get('/detalles/:idSolicitud', getDetallesBySolicitud );
router.post('/:selectedDocumentId', signAllDocuments);
router.post('/:selectedDocumentId/rechazar', rejectApplication);


module.exports = router;