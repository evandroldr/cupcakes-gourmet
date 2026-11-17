const express = require('express');
const homeController = require('../controllers/homeController');
const produtoController = require('../controllers/produtoController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/', homeController.index);
router.get('/produtos/:id', produtoController.detalhes);

router.get('/login', authController.formLogin);
router.post('/login', authController.login);
router.get('/cadastro', authController.formCadastro);
router.post('/cadastro', authController.cadastrar);
router.post('/logout', authController.logout);

module.exports = router;
