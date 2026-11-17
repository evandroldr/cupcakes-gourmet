const Produto = require('../models/produtoModel');

exports.index = async (req, res) => {
  const busca = (req.query.busca || '').trim();
  const produtos = await Produto.listarAtivos(busca);
  res.render('home', { titulo: 'Cardápio', produtos, busca });
};
