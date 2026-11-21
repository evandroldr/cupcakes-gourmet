const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');

const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const entrar = (req, res, usuario) => {
  req.session.usuario = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
  const destino = req.session.voltarPara || (usuario.perfil === 'admin' ? '/admin/pedidos' : '/');
  delete req.session.voltarPara;
  res.redirect(destino);
};

exports.formLogin = (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/');
  }
  res.render('login', { titulo: 'Entrar', email: '', erro: '' });
};

exports.login = async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const senha = req.body.senha || '';
  const usuario = await Usuario.buscarPorEmail(email);

  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(401).render('login', { titulo: 'Entrar', email, erro: 'E-mail ou senha inválidos.' });
  }

  entrar(req, res, usuario);
};

exports.formCadastro = (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/');
  }
  res.render('cadastro', { titulo: 'Criar conta', dados: {}, erros: {} });
};

exports.cadastrar = async (req, res) => {
  const dados = {
    nome: (req.body.nome || '').trim(),
    email: (req.body.email || '').trim().toLowerCase(),
    telefone: (req.body.telefone || '').trim(),
    senha: req.body.senha || '',
    confirmacao: req.body.confirmacao || ''
  };
  const erros = {};

  if (!dados.nome) {
    erros.nome = 'Preencha este campo.';
  }
  if (!dados.email) {
    erros.email = 'Preencha este campo.';
  } else if (!emailValido(dados.email)) {
    erros.email = 'Informe um e-mail válido.';
  } else if (await Usuario.buscarPorEmail(dados.email)) {
    erros.email = 'Este e-mail já está cadastrado.';
  }
  if (!dados.telefone) {
    erros.telefone = 'Preencha este campo.';
  }
  if (dados.senha.length < 6) {
    erros.senha = 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (dados.senha !== dados.confirmacao) {
    erros.confirmacao = 'As senhas não conferem.';
  }

  if (Object.keys(erros).length > 0) {
    return res.status(400).render('cadastro', { titulo: 'Criar conta', dados, erros });
  }

  const senha = await bcrypt.hash(dados.senha, 10);
  const id = await Usuario.criar({ nome: dados.nome, email: dados.email, telefone: dados.telefone, senha });

  req.session.mensagem = { tipo: 'success', texto: 'Conta criada com sucesso. Bem-vindo!' };
  entrar(req, res, { id, nome: dados.nome, perfil: 'cliente' });
};

exports.logout = (req, res) => {
  req.session = null;
  res.redirect('/');
};
