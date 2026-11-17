const Produto = require('../models/produtoModel');

exports.montarItens = async (carrinho) => {
  const produtos = await Produto.buscarPorIds(carrinho.map((item) => item.id));
  const itens = [];

  carrinho.forEach((item) => {
    const produto = produtos.find((p) => p.id === item.id);
    if (produto) {
      itens.push({ ...produto, quantidade: item.quantidade, subtotal: produto.preco * item.quantidade });
    }
  });

  const total = itens.reduce((soma, item) => soma + item.subtotal, 0);
  return { itens, total };
};
