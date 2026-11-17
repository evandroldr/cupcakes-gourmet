const express = require('express');
const homeController = require('../controllers/homeController');
const produtoController = require('../controllers/produtoController');
const authController = require('../controllers/authController');
const carrinhoController = require('../controllers/carrinhoController');

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

module.exports = router;
