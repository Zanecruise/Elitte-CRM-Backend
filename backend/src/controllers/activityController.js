const prisma = require('../lib/prisma');

const buildActivityResponse = (activity) => activity;

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

  try {
    const activity = await prisma.activity.create({
      data: {
        title,
        type,
        clientId: req.body.clientId || null,
        opportunityId: req.body.opportunityId || null,
        assessor: req.body.assessor,
        guests: req.body.guests || [],
        location: req.body.location,
        dueDate: new Date(dueDate),
        priority,
        status,
        notes: req.body.notes,
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

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: req.body,
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
