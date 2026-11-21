const Pedido = require('../models/pedidoModel');

const proximo = {
  recebido: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue'
};

exports.listar = async (req, res) => {
  const filtro = req.query.status || '';
  const pedidos = await Pedido.listarTodos(filtro);
  res.render('admin/pedidos', { titulo: 'Pedidos', pedidos, filtro });
};

exports.detalhes = async (req, res, next) => {
  const pedido = await Pedido.buscarPorId(req.params.id);

  if (!pedido) {
    return next();
  }

  res.render('admin/pedido', { titulo: `Pedido nº ${pedido.id}`, pedido, proximo: proximo[pedido.status] });
};

exports.alterarStatus = async (req, res, next) => {
  const pedido = await Pedido.buscarPorId(req.params.id);

  if (!pedido) {
    return next();
  }

  const novo = req.body.status;
  const podeCancelar = novo === 'cancelado' && !['entregue', 'cancelado'].includes(pedido.status);

  if (novo !== proximo[pedido.status] && !podeCancelar) {
    req.session.mensagem = { tipo: 'danger', texto: 'Mudança de status não permitida.' };
    return res.redirect(`/admin/pedidos/${pedido.id}`);
  }

  await Pedido.alterarStatus(pedido.id, novo, req.session.usuario.id);
  req.session.mensagem = { tipo: 'success', texto: 'Status do pedido atualizado.' };
  res.redirect(`/admin/pedidos/${pedido.id}`);
};
