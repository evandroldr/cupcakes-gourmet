const db = require('../config/database');

exports.listarPorUsuario = async (usuarioId) => {
  const [enderecos] = await db.query('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY padrao DESC, id DESC', [usuarioId]);
  return enderecos;
};

exports.buscar = async (id, usuarioId) => {
  const [enderecos] = await db.query('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
  return enderecos[0];
};

exports.criar = async (usuarioId, endereco) => {
  const [resultado] = await db.query(
    'INSERT INTO enderecos (usuario_id, cep, logradouro, numero, complemento, bairro, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [usuarioId, endereco.cep, endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, endereco.estado]
  );
  return resultado.insertId;
};
