const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return done(null, false, { message: 'Usuário não encontrado' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return done(null, false, { message: 'Senha inválida' });

    return done(null, { id: user.id, name: user.name, username: user.username });
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return done(null, false);
    done(null, { id: user.id, name: user.name, username: user.username });
  } catch (error) {
    done(error, null);
  }
});
