const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/models/usuarioModel');
jest.mock('../src/models/produtoModel');

const Usuario = require('../src/models/usuarioModel');
const Produto = require('../src/models/produtoModel');
const app = require('../src/app');

const cliente = {
  id: 5,
  nome: 'Maria Souza',
  email: 'maria@email.com',
  senha: bcrypt.hashSync('123456', 4),
  perfil: 'cliente',
  ativo: 1
};

beforeEach(() => {
  jest.resetAllMocks();
  Produto.listarAtivos.mockResolvedValue([]);
});

describe('Cadastro', () => {
  const dados = { nome: 'Maria Souza', email: 'maria@email.com', telefone: '11999999999', senha: '123456', confirmacao: '123456' };

  test('exibe o formulário', async () => {
    const res = await request(app).get('/cadastro');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Criar conta');
  });

  test('valida campos obrigatórios', async () => {
    const res = await request(app).post('/cadastro').type('form').send({});
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('Preencha este campo.');
    expect(Usuario.criar).not.toHaveBeenCalled();
  });

  test('valida formato do e-mail', async () => {
    const res = await request(app).post('/cadastro').type('form').send({ ...dados, email: 'maria' });
    expect(res.text).toContain('Informe um e-mail válido.');
  });

  test('valida tamanho da senha e confirmação', async () => {
    const res = await request(app).post('/cadastro').type('form').send({ ...dados, senha: '123', confirmacao: '321' });
    expect(res.text).toContain('A senha deve ter no mínimo 6 caracteres.');
    expect(res.text).toContain('As senhas não conferem.');
  });

  test('não permite e-mail repetido', async () => {
    Usuario.buscarPorEmail.mockResolvedValue(cliente);
    const res = await request(app).post('/cadastro').type('form').send(dados);
    expect(res.text).toContain('Este e-mail já está cadastrado.');
    expect(Usuario.criar).not.toHaveBeenCalled();
  });

  test('cria a conta com senha criptografada e faz login', async () => {
    Usuario.buscarPorEmail.mockResolvedValue(undefined);
    Usuario.criar.mockResolvedValue(10);
    const agente = request.agent(app);

    const res = await agente.post('/cadastro').type('form').send(dados);
    expect(res.statusCode).toBe(302);
    const salvo = Usuario.criar.mock.calls[0][0];
    expect(salvo.senha).not.toBe('123456');
    expect(bcrypt.compareSync('123456', salvo.senha)).toBe(true);

    const inicio = await agente.get('/');
    expect(inicio.text).toContain('Conta criada com sucesso. Bem-vindo!');
    expect(inicio.text).toContain('Olá, Maria');
  });
});

describe('Login', () => {
  test('recusa senha errada', async () => {
    Usuario.buscarPorEmail.mockResolvedValue(cliente);
    const res = await request(app).post('/login').type('form').send({ email: 'maria@email.com', senha: 'errada' });
    expect(res.statusCode).toBe(401);
    expect(res.text).toContain('E-mail ou senha inválidos.');
  });

  test('recusa e-mail inexistente', async () => {
    Usuario.buscarPorEmail.mockResolvedValue(undefined);
    const res = await request(app).post('/login').type('form').send({ email: 'x@x.com', senha: '123456' });
    expect(res.text).toContain('E-mail ou senha inválidos.');
  });

  test('recusa usuário inativo', async () => {
    Usuario.buscarPorEmail.mockResolvedValue({ ...cliente, ativo: 0 });
    const res = await request(app).post('/login').type('form').send({ email: 'maria@email.com', senha: '123456' });
    expect(res.statusCode).toBe(401);
  });

  test('entra e sai do sistema', async () => {
    Usuario.buscarPorEmail.mockResolvedValue(cliente);
    const agente = request.agent(app);

    const res = await agente.post('/login').type('form').send({ email: 'MARIA@email.com ', senha: '123456' });
    expect(res.statusCode).toBe(302);
    expect(Usuario.buscarPorEmail).toHaveBeenCalledWith('maria@email.com');

    const logado = await agente.get('/');
    expect(logado.text).toContain('Olá, Maria');

    await agente.post('/logout');
    const deslogado = await agente.get('/');
    expect(deslogado.text).not.toContain('Olá, Maria');
    expect(deslogado.text).toContain('Entrar');
  });
});
