exports.moeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

exports.dataHora = (valor) => {
  const [data, hora] = String(valor).split(' ');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
};

exports.status = {
  recebido: { texto: 'Recebido', cor: 'info' },
  em_preparo: { texto: 'Em preparo', cor: 'warning' },
  pronto: { texto: 'Pronto', cor: 'primary' },
  entregue: { texto: 'Entregue', cor: 'success' },
  cancelado: { texto: 'Cancelado', cor: 'danger' }
};

exports.pagamentos = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro'
};
