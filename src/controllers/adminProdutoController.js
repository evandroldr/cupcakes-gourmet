const Produto = require('../models/produtoModel');

const validar = (body, novo) => {
  const produto = {
    nome: (body.nome || '').trim(),
    descricao: (body.descricao || '').trim(),
    ingredientes: (body.ingredientes || '').trim(),
    alergenicos: (body.alergenicos || '').trim(),
    imagem_url: (body.imagem_url || '').trim(),
    preco: Number(String(body.preco || '').replace(',', '.')),
    estoque: Number(body.estoque),
    ativo: body.ativo === 'on'
  };
  const erros = {};

  if (!produto.nome) {
    erros.nome = 'Preencha este campo.';
  }
  if (!produto.descricao) {
    erros.descricao = 'Preencha este campo.';
  }
  if (!produto.ingredientes) {
    erros.ingredientes = 'Preencha este campo.';
  }
  if (!(produto.preco > 0)) {
    erros.preco = 'O preço deve ser maior que zero.';
  }
  if (novo && (!Number.isInteger(produto.estoque) || produto.estoque < 0)) {
    erros.estoque = 'A quantidade não pode ser negativa.';
  }

  return { produto, erros };
};

exports.listar = async (req, res) => {
  const produtos = await Produto.listarTodos();
  res.render('admin/produtos', { titulo: 'Produtos', produtos });
};

exports.novo = (req, res) => {
  res.render('admin/produto-form', { titulo: 'Novo produto', valores: { ativo: true, estoque: 0 }, erros: {}, acao: '/admin/produtos', novo: true });
};

exports.criar = async (req, res) => {
  const { produto, erros } = validar(req.body, true);

  if (Object.keys(erros).length > 0) {
    const valores = { ...req.body, ativo: req.body.ativo === 'on' };
    return res.status(400).render('admin/produto-form', { titulo: 'Novo produto', valores, erros, acao: '/admin/produtos', novo: true });
  }

  await Produto.criar(produto);
  req.session.mensagem = { tipo: 'success', texto: 'Produto salvo com sucesso.' };
  res.redirect('/admin/produtos');
};

exports.editar = async (req, res, next) => {
  const produto = await Produto.buscarQualquer(req.params.id);

  if (!produto) {
    return next();
  }

  res.render('admin/produto-form', { titulo: 'Editar produto', valores: produto, erros: {}, acao: `/admin/produtos/${produto.id}`, novo: false });
};

exports.atualizar = async (req, res, next) => {
  const existente = await Produto.buscarQualquer(req.params.id);

  if (!existente) {
    return next();
  }

  const { produto, erros } = validar(req.body, false);

  if (Object.keys(erros).length > 0) {
    const valores = { ...req.body, ativo: req.body.ativo === 'on' };
    return res.status(400).render('admin/produto-form', { titulo: 'Editar produto', valores, erros, acao: `/admin/produtos/${existente.id}`, novo: false });
  }

  await Produto.atualizar(existente.id, produto);
  req.session.mensagem = { tipo: 'success', texto: 'Produto salvo com sucesso.' };
  res.redirect('/admin/produtos');
};
