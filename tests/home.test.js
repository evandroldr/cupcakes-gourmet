const request = require('supertest');

jest.mock('../src/models/produtoModel');

const Produto = require('../src/models/produtoModel');
const app = require('../src/app');

const produtos = [
  { id: 1, nome: 'Chocolate Belga', preco: 12.9, estoque: 10, imagem_url: null },
  { id: 2, nome: 'Limão Siciliano', preco: 11.9, estoque: 0, imagem_url: null }
];

describe('Catálogo', () => {
  test('lista os produtos ativos', async () => {
    Produto.listarAtivos.mockResolvedValue(produtos);
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Chocolate Belga');
    expect(res.text).toContain('R$');
  });

  test('mostra produto sem estoque como indisponível', async () => {
    Produto.listarAtivos.mockResolvedValue(produtos);
    const res = await request(app).get('/');
    expect(res.text).toContain('Indisponível');
  });

  test('envia o termo de busca para o model', async () => {
    Produto.listarAtivos.mockResolvedValue([]);
    const res = await request(app).get('/?busca=limao');
    expect(Produto.listarAtivos).toHaveBeenCalledWith('limao');
    expect(res.text).toContain('Nenhum cupcake encontrado para a busca.');
  });

  test('mostra mensagem quando não há produtos', async () => {
    Produto.listarAtivos.mockResolvedValue([]);
    const res = await request(app).get('/');
    expect(res.text).toContain('Nenhum produto disponível no momento.');
  });

  test('mostra página de erro quando o banco falha', async () => {
    Produto.listarAtivos.mockRejectedValue(new Error('falha'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(500);
    expect(res.text).toContain('Ocorreu um erro inesperado');
  });
});

describe('Detalhes do produto', () => {
  test('exibe o produto', async () => {
    Produto.buscarPorId.mockResolvedValue({ ...produtos[0], descricao: 'Massa de chocolate', ingredientes: 'Chocolate', alergenicos: 'Leite' });
    const res = await request(app).get('/produtos/1');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Massa de chocolate');
  });

  test('retorna 404 para produto inexistente', async () => {
    Produto.buscarPorId.mockResolvedValue(undefined);
    const res = await request(app).get('/produtos/999');
    expect(res.statusCode).toBe(404);
  });
});

describe('Rotas', () => {
  test('rota inexistente retorna 404', async () => {
    const res = await request(app).get('/nao-existe');
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('não foi encontrada');
  });
});
