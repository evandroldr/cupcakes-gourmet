exports.exigirLogin = (req, res, next) => {
  if (!req.session.usuario) {
    if (req.method === 'GET') {
      req.session.voltarPara = req.originalUrl;
    }
    req.session.mensagem = { tipo: 'warning', texto: 'Faça login para continuar.' };
    return res.redirect('/login');
  }
  next();
};
