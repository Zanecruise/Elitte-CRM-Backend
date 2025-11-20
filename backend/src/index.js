const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('./config/passport-setup');

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();
const port = process.env.PORT || 3000;

const normalizeOrigin = (origin = '') =>
  origin.trim().replace(/\/$/, '').toLowerCase();

const escapeRegex = (value) =>
  value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const rawOrigins = [
  ...defaultOrigins,
  ...(process.env.FRONTEND_URLS || '').split(','),
]
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowAllOrigins = rawOrigins.includes('*');

const exactOrigins = new Set(
  rawOrigins.filter((origin) => !origin.includes('*'))
);

const wildcardOrigins = rawOrigins
  .filter((origin) => origin.includes('*') && origin !== '*')
  .map(
    (origin) =>
      new RegExp(
        `^${escapeRegex(origin).replace(/\\\*/g, '.*')}$`
      )
  );

const isAllowedOrigin = (origin) => {
  if (!origin || origin === 'null' || allowAllOrigins) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (exactOrigins.has(normalizedOrigin)) {
    return true;
  }

  return wildcardOrigins.some((pattern) =>
    pattern.test(normalizedOrigin)
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS: origem bloqueada "${origin}"`);
      return callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.COOKIE_KEY || 'uma_chave_secreta_de_fallback_muito_longa',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/activities', activityRoutes);

app.get('/', (_req, res) => {
  res.send('Backend do CRM Financeiro está em execução!');
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
