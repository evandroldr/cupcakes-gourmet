const db = require('../config/database');

exports.buscarPorEmail = async (email) => {
  const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return usuarios[0];
};

exports.criar = async (usuario) => {
  const [resultado] = await db.query(
    'INSERT INTO usuarios (nome, email, telefone, senha) VALUES (?, ?, ?, ?)',
    [usuario.nome, usuario.email, usuario.telefone, usuario.senha]
  );
  return resultado.insertId;
};
