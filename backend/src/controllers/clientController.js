const prisma = require('../lib/prisma');

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

const CLIENT_LIST_NOTE_LIMIT = 5;
const CLIENT_DETAIL_NOTE_LIMIT = 50;

const buildClientInclude = ({ noteLimit } = {}) => {
  const collaborationNotes = {
    orderBy: { createdAt: 'desc' },
  };

  if (Number.isInteger(noteLimit) && noteLimit > 0) {
    collaborationNotes.take = noteLimit;
  }

  return {
    partner: true,
    collaborationNotes,
  };
};

const buildCollaborationNotes = (notes) => {
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes.map((note) => ({
    ...note,
    mentions: Array.isArray(note.mentions) ? note.mentions : [],
  }));
};

const buildClientResponse = (client) => {
  if (!client) return null;
  return {
    ...client,
    walletValue: toNumber(client.walletValue) ?? 0,
    financialProfile:
      client.financialProfile || {
        investorProfile: 'Moderado',
        assetPreferences: [],
        financialNeeds: [],
        meetingAgendaSuggestions: [],
      },
    address: client.address || null,
    contactPersons: client.contactPersons || [],
    partners: client.partnerData || [],
    interactionHistory: client.interactionHistory || [],
    reminders: client.reminders || [],
    partner: client.partner || null,
    collaborationNotes: buildCollaborationNotes(client.collaborationNotes),
  };
};

const normalizeStringArray = (value) => {
  if (value === undefined) {
    return undefined;
  }
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((item) => item.trim())
      : [];

  return rawValues
    .map((item) => (item == null ? '' : String(item).trim()))
    .filter(Boolean);
};

const normalizeDecimalValue = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = toNumber(value);
  if (parsed === null) {
    return null;
  }
  return Number.isNaN(parsed) ? fallback ?? null : parsed;
};

const normalizeDateValue = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback ?? null;
  }
  return parsed;
};

const buildJsonValue = (value) =>
  value === undefined ? undefined : value ?? null;

const buildClientData = (payload = {}, { partial = false } = {}) => {
  const data = {};
  const assign = (key, value) => {
    if (value !== undefined) {
      data[key] = Array.isArray(value) ? [...value] : value;
    }
  };

  const stringFields = [
    'name',
    'email',
    'type',
    'phone',
    'cpf',
    'cnpj',
    'sector',
    'complianceStatus',
    'citizenship',
    'partnerId',
  ];

  stringFields.forEach((field) => {
    if (payload[field] !== undefined) {
      assign(field, payload[field]);
    } else if (!partial && field === 'complianceStatus') {
      assign(field, 'Pendente');
    }
  });

  const walletValue = normalizeDecimalValue(
    payload.walletValue,
    partial ? undefined : 0
  );
  assign('walletValue', walletValue);

  const servicePreferences = normalizeStringArray(payload.servicePreferences);
  if (servicePreferences !== undefined) {
    assign('servicePreferences', servicePreferences);
  } else if (!partial) {
    assign('servicePreferences', []);
  }

  const advisors = normalizeStringArray(payload.advisors);
  if (advisors !== undefined) {
    assign('advisors', advisors);
  } else if (!partial) {
    assign('advisors', []);
  }

  const jsonFields = [
    ['financialProfile', null],
    ['address', null],
    ['contactPersons', []],
    ['interactionHistory', []],
    ['reminders', []],
  ];

  jsonFields.forEach(([field, fallback]) => {
    const normalized = buildJsonValue(payload[field]);
    if (normalized !== undefined) {
      assign(field, normalized);
    } else if (!partial) {
      assign(field, Array.isArray(fallback) ? [...fallback] : fallback);
    }
  });

  if (payload.partnerData !== undefined) {
    const normalized = buildJsonValue(payload.partnerData);
    assign('partnerData', normalized);
  } else if (payload.partners !== undefined) {
    const normalized = buildJsonValue(payload.partners);
    assign('partnerData', normalized);
  } else if (!partial) {
    assign('partnerData', []);
  }

  const lastActivity = normalizeDateValue(
    payload.lastActivity,
    partial ? undefined : new Date()
  );
  assign('lastActivity', lastActivity);

  return data;
};

const getAllClients = async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: buildClientInclude({ noteLimit: CLIENT_LIST_NOTE_LIMIT }),
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients.map(buildClientResponse));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ message: 'Erro interno ao buscar clientes.' });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: buildClientInclude({ noteLimit: CLIENT_DETAIL_NOTE_LIMIT }),
    });
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    res.json(buildClientResponse(client));
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro interno ao buscar cliente.' });
  }
};

const createClient = async (req, res) => {
  const { name, email, type } = req.body;
  if (!name || !email || !type) {
    return res
      .status(400)
      .json({ message: 'Nome, e-mail e tipo sao obrigatorios.' });
  }

  const clientData = buildClientData(req.body);

  try {
    const newClient = await prisma.client.create({
      data: clientData,
      include: buildClientInclude({ noteLimit: CLIENT_LIST_NOTE_LIMIT }),
    });
    res.status(201).json(buildClientResponse(newClient));
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
};

const updateClient = async (req, res) => {
  const updateData = buildClientData(req.body, { partial: true });

  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ message: 'Nenhum campo foi enviado para atualizacao.' });
  }

  try {
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: updateData,
      include: buildClientInclude({ noteLimit: CLIENT_LIST_NOTE_LIMIT }),
    });
    res.json(buildClientResponse(updated));
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar cliente.' });
  }
};

const deleteClient = async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }
    res.status(500).json({ message: 'Erro ao remover cliente.' });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
