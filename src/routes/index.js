const express = require('express');
const { exigirLogin } = require('../middlewares/auth');
const homeController = require('../controllers/homeController');
const produtoController = require('../controllers/produtoController');
const authController = require('../controllers/authController');
const carrinhoController = require('../controllers/carrinhoController');
const checkoutController = require('../controllers/checkoutController');
const pedidoController = require('../controllers/pedidoController');

const router = express.Router();

router.get('/', homeController.index);
router.get('/produtos/:id', produtoController.detalhes);

router.get('/login', authController.formLogin);
router.post('/login', authController.login);
router.get('/cadastro', authController.formCadastro);
router.post('/cadastro', authController.cadastrar);
router.post('/logout', authController.logout);

router.get('/carrinho', carrinhoController.ver);
router.post('/carrinho/adicionar', carrinhoController.adicionar);
router.post('/carrinho/atualizar', carrinhoController.atualizar);
router.post('/carrinho/remover', carrinhoController.remover);

router.get('/checkout', exigirLogin, checkoutController.entrega);
router.post('/checkout', exigirLogin, checkoutController.salvarEntrega);
router.get('/checkout/pagamento', exigirLogin, checkoutController.pagamento);
router.post('/pedidos', exigirLogin, checkoutController.confirmar);

router.get('/pedidos', exigirLogin, pedidoController.listar);
router.get('/pedidos/:id', exigirLogin, pedidoController.detalhes);

module.exports = router;
