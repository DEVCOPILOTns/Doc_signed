const { getPendingDocuments } = require('../../pending/models/pending.model');
async function IndexRender(req, res) {
   const resultPending = await getPendingDocuments(req.user.id_registro_usuarios);
   //console.log('Usuario en IndexRender:', req.user);
  res.render('app/views/index', {
    pendingDocuments: resultPending.length,
  });
}

module.exports = {
  IndexRender
};