const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/models/usuarioModel');
jest.mock('../src/models/produtoModel');
jest.mock('../src/models/pedidoModel');

const Usuario = require('../src/models/usuarioModel');
const Produto = require('../src/models/produtoModel');
const Pedido = require('../src/models/pedidoModel');
const app = require('../src/app');

const senha = bcrypt.hashSync('123456', 4);
const admin = { id: 1, nome: 'Administrador', email: 'admin@cupcakesgourmet.com', senha, perfil: 'admin', ativo: 1 };
const cliente = { id: 5, nome: 'Maria Souza', email: 'maria@email.com', senha, perfil: 'cliente', ativo: 1 };
const chocolate = { id: 1, nome: 'Chocolate Belga', descricao: 'x', ingredientes: 'x', alergenicos: null, preco: 12.9, estoque: 5, imagem_url: null, ativo: 1 };

const pedido = (status) => ({
  id: 10,
  usuario_id: 5,
  cliente: 'Maria Souza',
  telefone: '11999999999',
  status,
  modalidade: 'retirada',
  data_retirada: '2026-11-20 15:00:00',
  forma_pagamento: 'pix',
  taxa_entrega: 0,
  criado_em: '2026-11-17 14:32:00',
  itens: [{ nome: 'Chocolate Belga', quantidade: 2, preco_unitario: 12.9 }],
  historico: [{ status: 'recebido', criado_em: '2026-11-17 14:32:00', usuario: 'Maria Souza' }],
  total: 25.8
});

beforeEach(() => {
  jest.resetAllMocks();
  Usuario.buscarPorEmail.mockImplementation(async (email) => [admin, cliente].find((u) => u.email === email));
  Produto.listarAtivos.mockResolvedValue([]);
  Produto.listarTodos.mockResolvedValue([chocolate]);
  Produto.buscarQualquer.mockImplementation(async (id) => (Number(id) === 1 ? chocolate : undefined));
  Produto.listarMovimentacoes.mockResolvedValue([]);
  Pedido.listarTodos.mockResolvedValue([]);
});

const entrar = async (email) => {
  const agente = request.agent(app);
  const res = await agente.post('/login').type('form').send({ email, senha: '123456' });
  return { agente, res };
};

describe('Acesso', () => {
  test('administrador vai para o painel após o login', async () => {
    const { res } = await entrar('admin@cupcakesgourmet.com');
    expect(res.headers.location).toBe('/admin/pedidos');
  });

  test('visitante é enviado para o login', async () => {
    const res = await request(app).get('/admin/pedidos');
    expect(res.headers.location).toBe('/login');
  });

  test('cliente não acessa o painel', async () => {
    const { agente } = await entrar('maria@email.com');
    const res = await agente.get('/admin/produtos');
    expect(res.headers.location).toBe('/');
    const inicio = await agente.get('/');
    expect(inicio.text).toContain('Acesso restrito ao administrador.');
  });
});

describe('Pedidos', () => {
  test('lista os pedidos com filtro', async () => {
    Pedido.listarTodos.mockResolvedValue([{ id: 10, status: 'recebido', modalidade: 'entrega', forma_pagamento: 'pix', criado_em: '2026-11-17 14:32:00', cliente: 'Maria Souza', total: 25.8 }]);
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const res = await agente.get('/admin/pedidos?status=recebido');
    expect(Pedido.listarTodos).toHaveBeenCalledWith('recebido');
    expect(res.text).toContain('Maria Souza');
  });

  test('mostra o botão do próximo status', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido('recebido'));
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const res = await agente.get('/admin/pedidos/10');
    expect(res.text).toContain('Marcar como Em preparo');
    expect(res.text).toContain('Cancelar pedido');
  });

  test('avança o status do pedido', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido('recebido'));
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/pedidos/10/status').type('form').send({ status: 'em_preparo' });
    expect(Pedido.alterarStatus).toHaveBeenCalledWith(10, 'em_preparo', 1);
    const res = await agente.get('/admin/pedidos/10');
    expect(res.text).toContain('Status do pedido atualizado.');
  });

  test('não permite pular etapas', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido('recebido'));
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/pedidos/10/status').type('form').send({ status: 'entregue' });
    expect(Pedido.alterarStatus).not.toHaveBeenCalled();
    const res = await agente.get('/admin/pedidos/10');
    expect(res.text).toContain('Mudança de status não permitida.');
  });

  test('cancela pedido que ainda não foi entregue', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido('pronto'));
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/pedidos/10/status').type('form').send({ status: 'cancelado' });
    expect(Pedido.alterarStatus).toHaveBeenCalledWith(10, 'cancelado', 1);
  });

  test('não cancela pedido entregue', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido('entregue'));
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/pedidos/10/status').type('form').send({ status: 'cancelado' });
    expect(Pedido.alterarStatus).not.toHaveBeenCalled();
  });
});

describe('Produtos', () => {
  test('lista todos os produtos', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const res = await agente.get('/admin/produtos');
    expect(res.text).toContain('Chocolate Belga');
    expect(res.text).toContain('Ativo');
  });

  test('valida o cadastro de produto', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const res = await agente.post('/admin/produtos').type('form').send({ nome: 'Pistache', preco: '0', estoque: '10' });
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('Verifique os campos destacados.');
    expect(res.text).toContain('O preço deve ser maior que zero.');
    expect(res.text).toContain('value="Pistache"');
    expect(Produto.criar).not.toHaveBeenCalled();
  });

  test('cadastra produto aceitando preço com vírgula', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const res = await agente.post('/admin/produtos').type('form').send({
      nome: 'Pistache', descricao: 'Massa de pistache', ingredientes: 'Pistache', preco: '14,90', estoque: '10', ativo: 'on'
    });
    expect(res.headers.location).toBe('/admin/produtos');
    expect(Produto.criar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Pistache', preco: 14.9, estoque: 10, ativo: true }));
  });

  test('edita produto e pode desativar', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    const form = await agente.get('/admin/produtos/1/editar');
    expect(form.text).toContain('value="12,90"');
    expect(form.text).not.toContain('Estoque inicial');

    await agente.post('/admin/produtos/1').type('form').send({ nome: 'Chocolate Belga', descricao: 'x', ingredientes: 'x', preco: '13,50' });
    expect(Produto.atualizar).toHaveBeenCalledWith(1, expect.objectContaining({ preco: 13.5, ativo: false }));
  });
});

describe('Estoque', () => {
  test('ajusta o estoque registrando a movimentação', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/estoque/1').type('form').send({ quantidade: '12', justificativa: 'Nova fornada' });
    expect(Produto.ajustarEstoque).toHaveBeenCalledWith(1, 12, 'Nova fornada', 1);
    const res = await agente.get('/admin/estoque');
    expect(res.text).toContain('Estoque atualizado.');
  });

  test('não aceita quantidade negativa', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/estoque/1').type('form').send({ quantidade: '-3', justificativa: 'Teste' });
    expect(Produto.ajustarEstoque).not.toHaveBeenCalled();
    const res = await agente.get('/admin/estoque');
    expect(res.text).toContain('A quantidade não pode ser negativa.');
  });

  test('exige justificativa', async () => {
    const { agente } = await entrar('admin@cupcakesgourmet.com');
    await agente.post('/admin/estoque/1').type('form').send({ quantidade: '5', justificativa: '' });
    expect(Produto.ajustarEstoque).not.toHaveBeenCalled();
    const res = await agente.get('/admin/estoque');
    expect(res.text).toContain('Informe a justificativa do ajuste.');
  });
});
