const db = require('../config/database');

exports.listarAtivos = async (busca) => {
  let sql = 'SELECT * FROM produtos WHERE ativo = TRUE';
  const params = [];

  if (busca) {
    sql += ' AND (nome LIKE ? OR ingredientes LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }

  sql += ' ORDER BY estoque = 0, nome';
  const [produtos] = await db.query(sql, params);
  return produtos;
};

exports.buscarPorId = async (id) => {
  const [produtos] = await db.query('SELECT * FROM produtos WHERE id = ? AND ativo = TRUE', [id]);
  return produtos[0];
};

exports.buscarPorIds = async (ids) => {
  if (ids.length === 0) {
    return [];
  }
  const [produtos] = await db.query('SELECT * FROM produtos WHERE ativo = TRUE AND id IN (?)', [ids]);
  return produtos;
};

exports.listarTodos = async () => {
  const [produtos] = await db.query('SELECT * FROM produtos ORDER BY nome');
  return produtos;
};

exports.buscarQualquer = async (id) => {
  const [produtos] = await db.query('SELECT * FROM produtos WHERE id = ?', [id]);
  return produtos[0];
};

exports.criar = async (produto) => {
  const [resultado] = await db.query(
    'INSERT INTO produtos (nome, descricao, ingredientes, alergenicos, preco, estoque, imagem_url, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [produto.nome, produto.descricao, produto.ingredientes, produto.alergenicos || null, produto.preco, produto.estoque, produto.imagem_url || null, produto.ativo]
  );
  return resultado.insertId;
};

exports.atualizar = async (id, produto) => {
  await db.query(
    'UPDATE produtos SET nome = ?, descricao = ?, ingredientes = ?, alergenicos = ?, preco = ?, imagem_url = ?, ativo = ? WHERE id = ?',
    [produto.nome, produto.descricao, produto.ingredientes, produto.alergenicos || null, produto.preco, produto.imagem_url || null, produto.ativo, id]
  );
};

exports.ajustarEstoque = async (id, quantidade, justificativa, usuarioId) => {
  const conexao = await db.getConnection();

  try {
    await conexao.beginTransaction();
    const [produtos] = await conexao.query('SELECT estoque FROM produtos WHERE id = ? FOR UPDATE', [id]);
    await conexao.query('UPDATE produtos SET estoque = ? WHERE id = ?', [quantidade, id]);
    await conexao.query(
      'INSERT INTO movimentacoes_estoque (produto_id, usuario_id, quantidade_anterior, quantidade_nova, justificativa) VALUES (?, ?, ?, ?, ?)',
      [id, usuarioId, produtos[0].estoque, quantidade, justificativa]
    );
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
};

exports.listarMovimentacoes = async () => {
  const [movimentacoes] = await db.query(
    `SELECT m.*, p.nome AS produto, u.nome AS usuario
     FROM movimentacoes_estoque m
     JOIN produtos p ON p.id = m.produto_id
     JOIN usuarios u ON u.id = m.usuario_id
     ORDER BY m.id DESC
     LIMIT 10`
  );
  return movimentacoes;
};
