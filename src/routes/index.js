const express = require('express');
const { exigirLogin, exigirAdmin } = require('../middlewares/auth');
const homeController = require('../controllers/homeController');
const produtoController = require('../controllers/produtoController');
const authController = require('../controllers/authController');
const carrinhoController = require('../controllers/carrinhoController');
const checkoutController = require('../controllers/checkoutController');
const pedidoController = require('../controllers/pedidoController');
const adminPedidoController = require('../controllers/adminPedidoController');
const adminProdutoController = require('../controllers/adminProdutoController');
const adminEstoqueController = require('../controllers/adminEstoqueController');

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

router.get('/admin', exigirAdmin, (req, res) => res.redirect('/admin/pedidos'));
router.get('/admin/pedidos', exigirAdmin, adminPedidoController.listar);
router.get('/admin/pedidos/:id', exigirAdmin, adminPedidoController.detalhes);
router.post('/admin/pedidos/:id/status', exigirAdmin, adminPedidoController.alterarStatus);

router.get('/admin/produtos', exigirAdmin, adminProdutoController.listar);
router.get('/admin/produtos/novo', exigirAdmin, adminProdutoController.novo);
router.post('/admin/produtos', exigirAdmin, adminProdutoController.criar);
router.get('/admin/produtos/:id/editar', exigirAdmin, adminProdutoController.editar);
router.post('/admin/produtos/:id', exigirAdmin, adminProdutoController.atualizar);

router.get('/admin/estoque', exigirAdmin, adminEstoqueController.listar);
router.post('/admin/estoque/:id', exigirAdmin, adminEstoqueController.ajustar);

module.exports = router;
