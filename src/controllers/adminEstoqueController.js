const Produto = require('../models/produtoModel');

exports.listar = async (req, res) => {
  const produtos = await Produto.listarTodos();
  const movimentacoes = await Produto.listarMovimentacoes();
  res.render('admin/estoque', { titulo: 'Estoque', produtos, movimentacoes });
};

exports.ajustar = async (req, res, next) => {
  const produto = await Produto.buscarQualquer(req.params.id);

  if (!produto) {
    return next();
  }

  const texto = String(req.body.quantidade || '').trim();
  const quantidade = Number(texto);
  const justificativa = (req.body.justificativa || '').trim();

  if (texto === '' || !Number.isInteger(quantidade) || quantidade < 0) {
    req.session.mensagem = { tipo: 'danger', texto: 'A quantidade não pode ser negativa.' };
    return res.redirect('/admin/estoque');
  }
  if (!justificativa) {
    req.session.mensagem = { tipo: 'danger', texto: 'Informe a justificativa do ajuste.' };
    return res.redirect('/admin/estoque');
  }

  await Produto.ajustarEstoque(produto.id, quantidade, justificativa, req.session.usuario.id);
  req.session.mensagem = { tipo: 'success', texto: 'Estoque atualizado.' };
  res.redirect('/admin/estoque');
};
