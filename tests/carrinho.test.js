const request = require('supertest');

jest.mock('../src/models/produtoModel');

const Produto = require('../src/models/produtoModel');
const app = require('../src/app');

const chocolate = { id: 1, nome: 'Chocolate Belga', preco: 12.9, estoque: 5, imagem_url: null, descricao: 'x', ingredientes: 'x' };
const redVelvet = { id: 2, nome: 'Red Velvet', preco: 13.9, estoque: 3, imagem_url: null, descricao: 'x', ingredientes: 'x' };

beforeEach(() => {
  jest.resetAllMocks();
  Produto.buscarPorId.mockImplementation(async (id) => [chocolate, redVelvet].find((p) => p.id === Number(id)));
  Produto.buscarPorIds.mockImplementation(async (ids) => [chocolate, redVelvet].filter((p) => ids.includes(p.id)));
  Produto.listarAtivos.mockResolvedValue([]);
});

describe('Carrinho', () => {
  test('mostra mensagem de carrinho vazio', async () => {
    const res = await request(app).get('/carrinho');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Seu carrinho está vazio.');
  });

  test('adiciona produto e calcula o total', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 2 });
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 2, quantidade: 1 });

    const res = await agente.get('/carrinho');
    expect(res.text).toContain('Chocolate Belga');
    expect(res.text).toContain('Red Velvet');
    expect(res.text).toMatch(/R\$\s39,70/);
    expect(res.text).toContain('Grátis');
  });

  test('soma a quantidade quando o produto já está no carrinho', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 1 });
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 2 });

    const res = await agente.get('/carrinho');
    expect(res.text).toContain('value="3"');
  });

  test('mostra mensagem de sucesso e contador no menu', async () => {
    const agente = request.agent(app);
    const post = await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 2 });
    expect(post.headers.location).toBe('/produtos/1');

    const res = await agente.get('/produtos/1');
    expect(res.text).toContain('Produto adicionado ao carrinho.');
    expect(res.text).toMatch(/rounded-pill">2</);
  });

  test('não permite quantidade maior que o estoque', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 2, quantidade: 4 });

    const res = await agente.get('/produtos/2');
    expect(res.text).toContain('Quantidade indisponível. Restam 3 unidades.');
    const carrinho = await agente.get('/carrinho');
    expect(carrinho.text).toContain('Seu carrinho está vazio.');
  });

  test('não permite quantidade inválida', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 0 });
    const res = await agente.get('/produtos/1');
    expect(res.text).toContain('Informe uma quantidade válida.');
  });

  test('atualiza a quantidade respeitando o estoque', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 1 });

    await agente.post('/carrinho/atualizar').type('form').send({ produtoId: 1, quantidade: 4 });
    let res = await agente.get('/carrinho');
    expect(res.text).toContain('Carrinho atualizado.');
    expect(res.text).toContain('value="4"');

    await agente.post('/carrinho/atualizar').type('form').send({ produtoId: 1, quantidade: 9 });
    res = await agente.get('/carrinho');
    expect(res.text).toContain('Quantidade indisponível. Restam 5 unidades.');
    expect(res.text).toContain('value="4"');
  });

  test('remove o item do carrinho', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 1 });
    await agente.post('/carrinho/remover').type('form').send({ produtoId: 1 });

    const res = await agente.get('/carrinho');
    expect(res.text).toContain('Seu carrinho está vazio.');
  });

  test('retira do carrinho produto que foi desativado', async () => {
    const agente = request.agent(app);
    await agente.post('/carrinho/adicionar').type('form').send({ produtoId: 1, quantidade: 1 });
    Produto.buscarPorIds.mockResolvedValue([]);

    const res = await agente.get('/carrinho');
    expect(res.text).toContain('Seu carrinho está vazio.');
  });
});
