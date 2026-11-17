const Endereco = require('../models/enderecoModel');
const Pedido = require('../models/pedidoModel');
const { montarItens } = require('../helpers/carrinho');

const formasPagamento = ['pix', 'cartao', 'dinheiro'];

const erro = (req, res, texto, destino) => {
  req.session.mensagem = { tipo: 'danger', texto };
  res.redirect(destino);
};

exports.entrega = async (req, res) => {
  const carrinho = req.session.carrinho || [];

  if (carrinho.length === 0) {
    return res.redirect('/carrinho');
  }

  const enderecos = await Endereco.listarPorUsuario(req.session.usuario.id);
  res.render('checkout', { titulo: 'Finalizar pedido', enderecos });
};

exports.salvarEntrega = async (req, res) => {
  const usuarioId = req.session.usuario.id;

  if (req.body.modalidade === 'retirada') {
    if (!req.body.data || !req.body.hora) {
      return erro(req, res, 'Informe a data e o horário da retirada.', '/checkout');
    }
    req.session.checkout = { modalidade: 'retirada', dataRetirada: `${req.body.data} ${req.body.hora}` };
    return res.redirect('/checkout/pagamento');
  }

  let enderecoId = Number(req.body.enderecoId);

  if (enderecoId) {
    const endereco = await Endereco.buscar(enderecoId, usuarioId);
    if (!endereco) {
      return erro(req, res, 'Escolha um endereço de entrega.', '/checkout');
    }
  } else {
    enderecoId = await Endereco.criar(usuarioId, {
      cep: req.body.cep || '',
      logradouro: req.body.logradouro || '',
      numero: req.body.numero || '',
      complemento: req.body.complemento || '',
      bairro: req.body.bairro || '',
      cidade: req.body.cidade || '',
      estado: req.body.estado || ''
    });
  }

  req.session.checkout = { modalidade: 'entrega', enderecoId };
  res.redirect('/checkout/pagamento');
};

exports.pagamento = async (req, res) => {
  const checkout = req.session.checkout;
  const carrinho = req.session.carrinho || [];

  if (carrinho.length === 0) {
    return res.redirect('/carrinho');
  }
  if (!checkout) {
    return res.redirect('/checkout');
  }

  const { itens, total } = await montarItens(carrinho);
  let endereco;
  if (checkout.modalidade === 'entrega') {
    endereco = await Endereco.buscar(checkout.enderecoId, req.session.usuario.id);
  }

  res.render('pagamento', { titulo: 'Pagamento', itens, total, checkout, endereco });
};

exports.confirmar = async (req, res) => {
  const checkout = req.session.checkout;
  const carrinho = req.session.carrinho || [];

  if (carrinho.length === 0 || !checkout) {
    return res.redirect('/carrinho');
  }
  if (!formasPagamento.includes(req.body.formaPagamento)) {
    return erro(req, res, 'Escolha uma forma de pagamento.', '/checkout/pagamento');
  }

  const resultado = await Pedido.criar({
    usuarioId: req.session.usuario.id,
    modalidade: checkout.modalidade,
    enderecoId: checkout.enderecoId,
    dataRetirada: checkout.dataRetirada,
    formaPagamento: req.body.formaPagamento,
    itens: carrinho.map((item) => ({ id: item.id, quantidade: item.quantidade }))
  });

  if (resultado.erro) {
    return erro(req, res, resultado.erro, '/carrinho');
  }

  delete req.session.carrinho;
  delete req.session.checkout;
  res.redirect(`/pedidos/${resultado.id}?novo=1`);
};
