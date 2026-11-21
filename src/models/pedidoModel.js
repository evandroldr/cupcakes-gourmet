const db = require('../config/database');

exports.criar = async (pedido) => {
  const conexao = await db.getConnection();

  try {
    await conexao.beginTransaction();

    for (const item of pedido.itens) {
      const [produtos] = await conexao.query('SELECT nome, preco, estoque FROM produtos WHERE id = ? AND ativo = TRUE FOR UPDATE', [item.id]);
      const produto = produtos[0];

      if (!produto) {
        await conexao.rollback();
        return { erro: 'Um produto do carrinho não está mais disponível. Ajuste o carrinho.' };
      }
      if (produto.estoque < item.quantidade) {
        await conexao.rollback();
        return { erro: `O produto ${produto.nome} não tem estoque suficiente. Ajuste o carrinho.` };
      }
      item.preco = produto.preco;
    }

    const [resultado] = await conexao.query(
      'INSERT INTO pedidos (usuario_id, endereco_id, modalidade, data_retirada, forma_pagamento) VALUES (?, ?, ?, ?, ?)',
      [pedido.usuarioId, pedido.enderecoId || null, pedido.modalidade, pedido.dataRetirada || null, pedido.formaPagamento]
    );
    const pedidoId = resultado.insertId;

    for (const item of pedido.itens) {
      await conexao.query('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [pedidoId, item.id, item.quantidade, item.preco]);
      await conexao.query('UPDATE produtos SET estoque = estoque - ? WHERE id = ?', [item.quantidade, item.id]);
    }

    await conexao.query("INSERT INTO historico_status (pedido_id, usuario_id, status) VALUES (?, ?, 'recebido')", [pedidoId, pedido.usuarioId]);
    await conexao.commit();
    return { id: pedidoId };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
};

exports.listarPorUsuario = async (usuarioId) => {
  const [pedidos] = await db.query(
    `SELECT p.id, p.status, p.modalidade, p.criado_em, SUM(i.quantidade * i.preco_unitario) + p.taxa_entrega AS total
     FROM pedidos p
     JOIN itens_pedido i ON i.pedido_id = p.id
     WHERE p.usuario_id = ?
     GROUP BY p.id, p.status, p.modalidade, p.criado_em, p.taxa_entrega
     ORDER BY p.id DESC`,
    [usuarioId]
  );
  return pedidos;
};

exports.buscarPorId = async (id) => {
  const [pedidos] = await db.query(
    `SELECT p.*, u.nome AS cliente, u.telefone, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado, e.cep
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN enderecos e ON e.id = p.endereco_id
     WHERE p.id = ?`,
    [id]
  );
  const pedido = pedidos[0];

  if (!pedido) {
    return undefined;
  }

  const [itens] = await db.query(
    `SELECT i.quantidade, i.preco_unitario, pr.nome
     FROM itens_pedido i
     JOIN produtos pr ON pr.id = i.produto_id
     WHERE i.pedido_id = ?`,
    [id]
  );
  const [historico] = await db.query(
    `SELECT h.status, h.criado_em, u.nome AS usuario
     FROM historico_status h
     JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.pedido_id = ?
     ORDER BY h.id`,
    [id]
  );

  pedido.itens = itens;
  pedido.historico = historico;
  pedido.total = itens.reduce((soma, item) => soma + item.quantidade * item.preco_unitario, 0) + pedido.taxa_entrega;
  return pedido;
};

exports.listarTodos = async (status) => {
  const params = [];
  let filtro = '';

  if (status) {
    filtro = 'WHERE p.status = ?';
    params.push(status);
  }

  const [pedidos] = await db.query(
    `SELECT p.id, p.status, p.modalidade, p.forma_pagamento, p.criado_em, u.nome AS cliente,
            SUM(i.quantidade * i.preco_unitario) + p.taxa_entrega AS total
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     JOIN itens_pedido i ON i.pedido_id = p.id
     ${filtro}
     GROUP BY p.id, p.status, p.modalidade, p.forma_pagamento, p.criado_em, u.nome, p.taxa_entrega
     ORDER BY p.status IN ('entregue', 'cancelado'), p.id`,
    params
  );
  return pedidos;
};

exports.alterarStatus = async (id, status, usuarioId) => {
  const conexao = await db.getConnection();

  try {
    await conexao.beginTransaction();
    await conexao.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
    await conexao.query('INSERT INTO historico_status (pedido_id, usuario_id, status) VALUES (?, ?, ?)', [id, usuarioId, status]);

    if (status === 'cancelado') {
      await conexao.query(
        'UPDATE produtos p JOIN itens_pedido i ON i.produto_id = p.id SET p.estoque = p.estoque + i.quantidade WHERE i.pedido_id = ?',
        [id]
      );
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
};
