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
const commentRoutes = require('./routes/commentRoutes');

const app = express();
const port = process.env.PORT || 3000;
const env = (process.env.NODE_ENV || '').toLowerCase();
const isRunningOnCloudRun = Boolean(
  process.env.K_SERVICE || process.env.K_REVISION
);
const isProduction =
  env === 'production' ||
  env === 'prod' ||
  isRunningOnCloudRun ||
  process.env.FORCE_SECURE_COOKIES === 'true';

if (isProduction) {
  app.set('trust proxy', 1);
}

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

const parseBasePath = (basePath = '') => {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
};

const apiBasePaths = Array.from(
  new Set(
    (process.env.API_BASE_PATHS || '/api,/')
      .split(',')
      .map(parseBasePath)
  )
);

const registerRoutes = (relativePath, router) => {
  const normalizedRelative = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;

  apiBasePaths.forEach((basePath) => {
    app.use(`${basePath}${normalizedRelative}`, router);
  });
};

const registerApiGet = (relativePath, handler) => {
  const normalizedRelative = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;

  apiBasePaths.forEach((basePath) => {
    app.get(`${basePath}${normalizedRelative}`, handler);
  });
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

const parseBooleanEnv = (value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
};

const parseSameSiteEnv = (value) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['lax', 'strict', 'none'].includes(normalized)) {
    return normalized;
  }
  console.warn(
    `SESSION_COOKIE_SAMESITE "${value}" invalido. Valores aceitos: lax, strict ou none.`
  );
  return undefined;
};

const secureOverride = parseBooleanEnv(process.env.SESSION_COOKIE_SECURE);
const sameSiteOverride = parseSameSiteEnv(process.env.SESSION_COOKIE_SAMESITE);
const shouldUseSecureCookies =
  typeof secureOverride === 'boolean' ? secureOverride : isProduction;

const sessionCookieConfig = {
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: sameSiteOverride || (shouldUseSecureCookies ? 'none' : 'lax'),
  secure: shouldUseSecureCookies,
};

if (sessionCookieConfig.sameSite === 'none' && !sessionCookieConfig.secure) {
  console.warn(
    'sameSite=None exige cookies seguros. Ativando "secure" automaticamente.'
  );
  sessionCookieConfig.secure = true;
}

if (process.env.SESSION_COOKIE_DOMAIN) {
  sessionCookieConfig.domain = process.env.SESSION_COOKIE_DOMAIN;
}

const sessionConfig = {
  secret: process.env.COOKIE_KEY || 'uma_chave_secreta_de_fallback_muito_longa',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: sessionCookieConfig,
};

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

registerRoutes('/auth', authRoutes);
registerRoutes('/clients', clientRoutes);
registerRoutes('/partners', partnerRoutes);
registerRoutes('/opportunities', opportunityRoutes);
registerRoutes('/transactions', transactionRoutes);
registerRoutes('/activities', activityRoutes);
registerRoutes('/comments', commentRoutes);

app.get('/', (_req, res) => {
  res.send('Backend do CRM Financeiro está em execução!');
});

registerApiGet('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
