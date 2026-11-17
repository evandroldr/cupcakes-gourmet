const Produto = require('../models/produtoModel');
const { montarItens } = require('../helpers/carrinho');

const lerCarrinho = (req) => req.session.carrinho || [];

exports.ver = async (req, res) => {
  const carrinho = lerCarrinho(req);
  const { itens, total } = await montarItens(carrinho);

  if (itens.length !== carrinho.length) {
    req.session.carrinho = itens.map((item) => ({ id: item.id, quantidade: item.quantidade }));
  }

  res.render('carrinho', { titulo: 'Carrinho', itens, total });
};

exports.adicionar = async (req, res) => {
  const id = Number(req.body.produtoId);
  const quantidade = Number.parseInt(req.body.quantidade, 10);
  const produto = await Produto.buscarPorId(id);

  if (!produto) {
    return res.redirect('/');
  }

  const carrinho = lerCarrinho(req);
  const item = carrinho.find((i) => i.id === id);
  const novaQuantidade = (item ? item.quantidade : 0) + quantidade;

  if (!quantidade || quantidade < 1) {
    req.session.mensagem = { tipo: 'danger', texto: 'Informe uma quantidade válida.' };
    return res.redirect(`/produtos/${id}`);
  }

  if (novaQuantidade > produto.estoque) {
    req.session.mensagem = { tipo: 'danger', texto: `Quantidade indisponível. Restam ${produto.estoque} unidades.` };
    return res.redirect(`/produtos/${id}`);
  }

  if (item) {
    item.quantidade = novaQuantidade;
  } else {
    carrinho.push({ id, quantidade });
  }

  req.session.carrinho = carrinho;
  req.session.mensagem = { tipo: 'success', texto: 'Produto adicionado ao carrinho.' };
  res.redirect(`/produtos/${id}`);
};

exports.atualizar = async (req, res) => {
  const id = Number(req.body.produtoId);
  const quantidade = Number.parseInt(req.body.quantidade, 10);
  let carrinho = lerCarrinho(req);
  const item = carrinho.find((i) => i.id === id);

  if (!item) {
    return res.redirect('/carrinho');
  }

  if (!quantidade || quantidade < 1) {
    carrinho = carrinho.filter((i) => i.id !== id);
  } else {
    const produto = await Produto.buscarPorId(id);
    if (!produto || quantidade > produto.estoque) {
      const restam = produto ? produto.estoque : 0;
      req.session.mensagem = { tipo: 'danger', texto: `Quantidade indisponível. Restam ${restam} unidades.` };
      return res.redirect('/carrinho');
    }
    item.quantidade = quantidade;
  }

  req.session.carrinho = carrinho;
  req.session.mensagem = { tipo: 'success', texto: 'Carrinho atualizado.' };
  res.redirect('/carrinho');
};

exports.remover = (req, res) => {
  const id = Number(req.body.produtoId);
  req.session.carrinho = lerCarrinho(req).filter((item) => item.id !== id);
  req.session.mensagem = { tipo: 'success', texto: 'Carrinho atualizado.' };
  res.redirect('/carrinho');
};
