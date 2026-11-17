const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/models/usuarioModel');
jest.mock('../src/models/produtoModel');
jest.mock('../src/models/enderecoModel');
jest.mock('../src/models/pedidoModel');

const Usuario = require('../src/models/usuarioModel');
const Produto = require('../src/models/produtoModel');
const Endereco = require('../src/models/enderecoModel');
const Pedido = require('../src/models/pedidoModel');
const app = require('../src/app');

const cliente = { id: 5, nome: 'Maria Souza', email: 'maria@email.com', senha: bcrypt.hashSync('123456', 4), perfil: 'cliente', ativo: 1 };
const chocolate = { id: 1, nome: 'Chocolate Belga', preco: 12.9, estoque: 5, imagem_url: null };
const endereco = { id: 3, usuario_id: 5, cep: '01000-000', logradouro: 'Rua das Flores', numero: '123', complemento: '', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP' };

const pedido = {
  id: 10,
  usuario_id: 5,
  status: 'recebido',
  modalidade: 'retirada',
  data_retirada: '2026-11-20 15:00:00',
  forma_pagamento: 'pix',
  taxa_entrega: 0,
  criado_em: '2026-11-17 14:32:00',
  itens: [{ nome: 'Chocolate Belga', quantidade: 2, preco_unitario: 12.9 }],
  historico: [{ status: 'recebido', criado_em: '2026-11-17 14:32:00', usuario: 'Maria Souza' }],
  total: 25.8
};

beforeEach(() => {
  jest.resetAllMocks();
  Usuario.buscarPorEmail.mockResolvedValue(cliente);
  Produto.buscarPorId.mockResolvedValue(chocolate);
  Produto.buscarPorIds.mockResolvedValue([chocolate]);
  Produto.listarAtivos.mockResolvedValue([]);
  Endereco.listarPorUsuario.mockResolvedValue([endereco]);
  Endereco.buscar.mockImplementation(async (id, usuarioId) => (id === 3 && usuarioId === 5 ? endereco : undefined));
});

const logarComCarrinho = async () => {
  const agente = request.agent(app);
  await agente.post('/login').type('form').send({ email: 'maria@email.com', senha: '123456' });
  await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 2 });
  return agente;
};

describe('Finalizar pedido', () => {
  test('pede login e volta para a finalização', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 1 });

    const res = await agente.get('/checkout');
    expect(res.headers.location).toBe('/login');

    const login = await agente.post('/login').type('form').send({ email: 'maria@email.com', senha: '123456' });
    expect(login.headers.location).toBe('/checkout');
  });

  test('volta para o carrinho quando está vazio', async () => {
    const agente = request.agent(app);
    await agente.post('/login').type('form').send({ email: 'maria@email.com', senha: '123456' });
    const res = await agente.get('/checkout');
    expect(res.headers.location).toBe('/carrinho');
  });

  test('mostra os endereços salvos', async () => {
    const agente = await logarComCarrinho();
    const res = await agente.get('/checkout');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Rua das Flores');
  });

  test('exige data e horário na retirada', async () => {
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'retirada', data: '', hora: '' });
    const res = await agente.get('/checkout');
    expect(res.text).toContain('Informe a data e o horário da retirada.');
  });

  test('aceita novo endereço sem validação', async () => {
    Endereco.criar.mockResolvedValue(8);
    const agente = await logarComCarrinho();
    const res = await agente.post('/checkout').type('form').send({ modalidade: 'entrega', enderecoId: 'novo', logradouro: 'Rua A' });
    expect(res.headers.location).toBe('/checkout/pagamento');
    expect(Endereco.criar).toHaveBeenCalledWith(5, expect.objectContaining({ logradouro: 'Rua A', cep: '' }));
  });

  test('não aceita endereço de outro cliente', async () => {
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'entrega', enderecoId: 99 });
    const res = await agente.get('/checkout');
    expect(res.text).toContain('Escolha um endereço de entrega.');
  });

  test('mostra o resumo na etapa de pagamento', async () => {
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'entrega', enderecoId: 3 });
    const res = await agente.get('/checkout/pagamento');
    expect(res.text).toContain('2x Chocolate Belga');
    expect(res.text).toContain('Entrega em: Rua das Flores, 123');
    expect(res.text).toContain('O pagamento é feito na loja ou na entrega.');
  });

  test('exige forma de pagamento', async () => {
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'entrega', enderecoId: 3 });
    await agente.post('/pedidos').type('form').send({});
    const res = await agente.get('/checkout/pagamento');
    expect(res.text).toContain('Escolha uma forma de pagamento.');
    expect(Pedido.criar).not.toHaveBeenCalled();
  });

  test('cria o pedido e esvazia o carrinho', async () => {
    Pedido.criar.mockResolvedValue({ id: 10 });
    Pedido.buscarPorId.mockResolvedValue(pedido);
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'retirada', data: '2026-11-20', hora: '15:00' });

    const res = await agente.post('/pedidos').type('form').send({ formaPagamento: 'pix' });
    expect(res.headers.location).toBe('/pedidos/10?novo=1');
    expect(Pedido.criar).toHaveBeenCalledWith({
      usuarioId: 5,
      modalidade: 'retirada',
      enderecoId: undefined,
      dataRetirada: '2026-11-20 15:00',
      formaPagamento: 'pix',
      itens: [{ id: 1, quantidade: 2 }]
    });

    const confirmacao = await agente.get('/pedidos/10?novo=1');
    expect(confirmacao.text).toContain('Pedido confirmado!');
    expect(confirmacao.text).toContain('Retirada na loja em 20/11/2026 15:00');

    const carrinho = await agente.get('/carrinho');
    expect(carrinho.text).toContain('Seu carrinho está vazio.');
  });

  test('volta ao carrinho quando falta estoque', async () => {
    Pedido.criar.mockResolvedValue({ erro: 'O produto Chocolate Belga não tem estoque suficiente. Ajuste o carrinho.' });
    const agente = await logarComCarrinho();
    await agente.post('/checkout').type('form').send({ modalidade: 'entrega', enderecoId: 3 });

    const res = await agente.post('/pedidos').type('form').send({ formaPagamento: 'dinheiro' });
    expect(res.headers.location).toBe('/carrinho');
    const carrinho = await agente.get('/carrinho');
    expect(carrinho.text).toContain('não tem estoque suficiente');
  });
});

describe('Meus pedidos', () => {
  test('lista os pedidos do cliente', async () => {
    Pedido.listarPorUsuario.mockResolvedValue([{ id: 10, status: 'em_preparo', modalidade: 'entrega', criado_em: '2026-11-17 14:32:00', total: 39.7 }]);
    const agente = await logarComCarrinho();
    const res = await agente.get('/pedidos');
    expect(Pedido.listarPorUsuario).toHaveBeenCalledWith(5);
    expect(res.text).toContain('Pedido nº 10');
    expect(res.text).toContain('Em preparo');
    expect(res.text).toContain('17/11/2026 14:32');
  });

  test('mostra mensagem quando não há pedidos', async () => {
    Pedido.listarPorUsuario.mockResolvedValue([]);
    const agente = await logarComCarrinho();
    const res = await agente.get('/pedidos');
    expect(res.text).toContain('Você ainda não fez nenhum pedido.');
  });

  test('mostra a linha do tempo do pedido', async () => {
    Pedido.buscarPorId.mockResolvedValue(pedido);
    const agente = await logarComCarrinho();
    const res = await agente.get('/pedidos/10');
    expect(res.text).toContain('Acompanhamento');
    expect(res.text).toContain('Em preparo');
    expect(res.text).not.toContain('Pedido confirmado!');
  });

  test('não mostra pedido de outro cliente', async () => {
    Pedido.buscarPorId.mockResolvedValue({ ...pedido, usuario_id: 99 });
    const agente = await logarComCarrinho();
    const res = await agente.get('/pedidos/10');
    expect(res.statusCode).toBe(404);
  });
});
