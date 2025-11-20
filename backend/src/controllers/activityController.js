const prisma = require('../lib/prisma');

const buildActivityResponse = (activity) => activity;

const getAllActivities = async (_req, res) => {
  try {
    const activities = await prisma.activity.findMany({
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
