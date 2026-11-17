require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const routes = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.locals.moeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'sessao',
  keys: [process.env.SESSION_SECRET || 'desenvolvimento'],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario;
  res.locals.mensagem = req.session.mensagem;
  res.locals.qtdCarrinho = (req.session.carrinho || []).reduce((soma, item) => soma + item.quantidade, 0);
  delete req.session.mensagem;
  next();
});

app.use(routes);

app.use((req, res) => {
  res.status(404).render('404', { titulo: 'Página não encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('erro', { titulo: 'Erro' });
});

if (require.main === module) {
  const porta = process.env.PORT || 3000;
  app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
  });
}

module.exports = app;
