const prisma = require('../lib/prisma');

const buildActivityResponse = (activity) => activity;
const INVALID_DUE_DATE_ERROR = 'INVALID_DUE_DATE';

const ensureActivityOwnership = async (activityId, userId) =>
  prisma.activity.findFirst({ where: { id: activityId, ownerId: userId } });

const ensureClientOwnership = async (clientId, userId) => {
  if (!clientId) return null;
  return prisma.client.findFirst({ where: { id: clientId, ownerId: userId } });
};

const ensureOpportunityOwnership = async (opportunityId, userId) => {
  if (!opportunityId) return null;
  return prisma.opportunity.findFirst({
    where: { id: opportunityId, ownerId: userId },
  });
};

const toNullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeGuests = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value
      .map((guest) => (guest == null ? '' : String(guest).trim()))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((guest) => guest.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeDueDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Data de vencimento inválida.');
    error.code = INVALID_DUE_DATE_ERROR;
    throw error;
  }
  return parsed;
};

const buildActivityData = (payload = {}, { partial = false } = {}) => {
  const data = {};
  const assign = (key, value) => {
    if (value !== undefined) {
      data[key] = value;
    }
  };

  const scalarFields = [
    'title',
    'type',
    'assessor',
    'location',
    'priority',
    'status',
    'notes',
  ];

  scalarFields.forEach((field) => {
    if (payload[field] !== undefined) {
      assign(field, payload[field]);
    }
  });

  ['clientId', 'opportunityId'].forEach((field) => {
    const normalized = toNullableString(payload[field]);
    if (normalized !== undefined) {
      assign(field, normalized);
    }
  });

  const guests = normalizeGuests(payload.guests);
  if (guests !== undefined) {
    assign('guests', guests);
  } else if (!partial) {
    assign('guests', []);
  }

  const dueDate = normalizeDueDate(payload.dueDate);
  if (dueDate !== undefined) {
    assign('dueDate', dueDate);
  }

  return data;
};

const validateActivityRelations = async (req, res) => {
  if (req.body.clientId) {
    const client = await ensureClientOwnership(req.body.clientId, req.user.id);
    if (!client) {
      res.status(404).json({ message: 'Cliente não encontrado.' });
      return false;
    }
  }

  if (req.body.opportunityId) {
    const opportunity = await ensureOpportunityOwnership(
      req.body.opportunityId,
      req.user.id
    );
    if (!opportunity) {
      res.status(404).json({ message: 'Oportunidade não encontrada.' });
      return false;
    }
  }

  return true;
};

const getAllActivities = async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { ownerId: req.user.id },
      orderBy: { dueDate: 'desc' },
    });
    res.json(activities.map(buildActivityResponse));
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ message: 'Erro ao buscar atividades.' });
  }
};

const createActivity = async (req, res) => {
  const { title, dueDate, priority, status, type } = req.body;
  if (!title || !dueDate || !priority || !status || !type) {
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
  }

  if (!(await validateActivityRelations(req, res))) {
    return;
  }

  let activityData;
  try {
    activityData = buildActivityData(req.body);
  } catch (error) {
    if (error.code === INVALID_DUE_DATE_ERROR) {
      return res
        .status(400)
        .json({ message: 'Data de vencimento inválida.' });
    }
    throw error;
  }

  try {
    const activity = await prisma.activity.create({
      data: {
        ...activityData,
        ownerId: req.user.id,
      },
    });
    res.status(201).json(buildActivityResponse(activity));
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    res.status(500).json({ message: 'Erro ao criar atividade.' });
  }
};

const updateActivity = async (req, res) => {
  try {
    const existing = await ensureActivityOwnership(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }

    if (!(await validateActivityRelations(req, res))) {
      return;
    }

    let updateData;
    try {
      updateData = buildActivityData(req.body, { partial: true });
    } catch (error) {
      if (error.code === INVALID_DUE_DATE_ERROR) {
        return res
          .status(400)
          .json({ message: 'Data de vencimento inválida.' });
      }
      throw error;
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: 'Nenhum campo foi enviado para atualização.' });
    }

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(buildActivityResponse(activity));
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar atividade.' });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const existing = await ensureActivityOwnership(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }

    await prisma.activity.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover atividade:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao remover atividade.' });
  }
};

module.exports = {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity,
};
