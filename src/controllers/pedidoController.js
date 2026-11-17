const Pedido = require('../models/pedidoModel');

exports.listar = async (req, res) => {
  const pedidos = await Pedido.listarPorUsuario(req.session.usuario.id);
  res.render('pedidos', { titulo: 'Meus pedidos', pedidos });
};

exports.detalhes = async (req, res, next) => {
  const pedido = await Pedido.buscarPorId(req.params.id);

  if (!pedido || pedido.usuario_id !== req.session.usuario.id) {
    return next();
  }

  res.render('pedido', { titulo: `Pedido nº ${pedido.id}`, pedido, novo: req.query.novo === '1' });
};
