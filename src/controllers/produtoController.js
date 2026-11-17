const Produto = require('../models/produtoModel');

exports.detalhes = async (req, res, next) => {
  const produto = await Produto.buscarPorId(req.params.id);

  if (!produto) {
    return next();
  }

  res.render('produto', { titulo: produto.nome, produto });
};
