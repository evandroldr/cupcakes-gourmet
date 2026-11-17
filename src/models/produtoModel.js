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
