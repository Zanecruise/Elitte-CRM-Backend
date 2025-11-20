const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, password: hashedPassword, name },
    });

    res.status(201).json({
      message: 'Usuário registrado com sucesso!',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Ocorreu um erro no servidor.' });
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res
        .status(401)
        .json({ message: info?.message || 'Credenciais inválidas.' });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.status(200).json({
        message: 'Login realizado com sucesso!',
        user: sanitizeUser(user),
      });
    });
  })(req, res, next);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logout realizado com sucesso!' });
  });
});

router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: sanitizeUser(req.user) });
  }
  return res.status(401).json({ message: 'Não autenticado.' });
});

module.exports = router;
