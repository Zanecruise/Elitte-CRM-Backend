const prisma = require('../lib/prisma');

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

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
  };
};

const getAllClients = async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: { partner: true },
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
      include: { partner: true },
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
      .json({ message: 'Nome, e-mail e tipo são obrigatórios.' });
  }

  const {
    phone,
    cpf,
    cnpj,
    sector,
    servicePreferences = [],
    advisors = [],
    complianceStatus = 'Pendente',
    walletValue = 0,
    financialProfile = null,
    address = null,
    contactPersons = [],
    partners = [],
    partnerId,
    partnerData = partners,
    citizenship,
    interactionHistory = [],
    reminders = [],
    lastActivity = new Date().toISOString(),
  } = req.body;

  try {
    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        type,
        phone,
        cpf,
        cnpj,
        sector,
        servicePreferences,
        advisors,
        complianceStatus,
        walletValue,
        financialProfile,
        address,
        contactPersons,
        partnerData,
        citizenship,
        interactionHistory,
        reminders,
        partnerId,
        lastActivity,
      },
      include: { partner: true },
    });
    res.status(201).json(buildClientResponse(newClient));
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
};

const updateClient = async (req, res) => {
  try {
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
      include: { partner: true },
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
