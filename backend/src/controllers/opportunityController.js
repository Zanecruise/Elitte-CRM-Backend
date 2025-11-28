const prisma = require('../lib/prisma');

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

const buildOpportunityResponse = (opportunity) => {
  if (!opportunity) return null;
  return {
    ...opportunity,
    estimatedValue: toNumber(opportunity.estimatedValue) ?? 0,
    clientName: opportunity.client?.name || opportunity.clientName || '',
  };
};

const ensureClientOwnership = async (clientId, userId) =>
  prisma.client.findFirst({ where: { id: clientId, ownerId: userId } });

const ensureOpportunityOwnership = async (opportunityId, userId) =>
  prisma.opportunity.findFirst({
    where: { id: opportunityId, ownerId: userId },
    include: { client: true },
  });

const getAllOpportunities = async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { ownerId: req.user.id },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(opportunities.map(buildOpportunityResponse));
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error);
    res.status(500).json({ message: 'Erro ao buscar oportunidades.' });
  }
};

const createOpportunity = async (req, res) => {
  const { title, clientId, stage } = req.body;
  if (!title || !clientId || !stage) {
    return res
      .status(400)
      .json({ message: 'Título, cliente e estágio são obrigatórios.' });
  }

  const client = await ensureClientOwnership(clientId, req.user.id);
  if (!client) {
    return res.status(404).json({ message: 'Cliente não encontrado.' });
  }

  try {
    const opportunity = await prisma.opportunity.create({
      data: {
        title,
        clientId,
        source: req.body.source,
        estimatedValue: req.body.estimatedValue || 0,
        stage,
        probability: req.body.probability ?? 0,
        expectedCloseDate: req.body.expectedCloseDate
          ? new Date(req.body.expectedCloseDate)
          : null,
        responsible: req.body.responsible,
        nextAction: req.body.nextAction,
        ownerId: req.user.id,
      },
      include: { client: true },
    });
    res.status(201).json(buildOpportunityResponse(opportunity));
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error);
    res.status(500).json({ message: 'Erro ao criar oportunidade.' });
  }
};

const updateOpportunity = async (req, res) => {
  try {
    const existing = await ensureOpportunityOwnership(
      req.params.id,
      req.user.id
    );

    if (!existing) {
      return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    }

    if (req.body.clientId && req.body.clientId !== existing.clientId) {
      const client = await ensureClientOwnership(req.body.clientId, req.user.id);
      if (!client) {
        return res.status(404).json({ message: 'Cliente não encontrado.' });
      }
    }

    const opportunity = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: req.body,
      include: { client: true },
    });
    res.json(buildOpportunityResponse(opportunity));
  } catch (error) {
    console.error('Erro ao atualizar oportunidade:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar oportunidade.' });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    const existing = await ensureOpportunityOwnership(
      req.params.id,
      req.user.id
    );
    if (!existing) {
      return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    }

    await prisma.opportunity.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover oportunidade:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao remover oportunidade.' });
  }
};

module.exports = {
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
};
