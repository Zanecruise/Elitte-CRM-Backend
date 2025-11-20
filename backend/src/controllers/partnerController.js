const prisma = require('../lib/prisma');

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

const buildPartnerResponse = (partner) => {
  if (!partner) return null;
  return {
    ...partner,
    totalVolume: toNumber(partner.totalVolume) ?? 0,
  };
};

const getAllPartners = async (_req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(partners.map(buildPartnerResponse));
  } catch (error) {
    console.error('Erro ao listar parceiros:', error);
    res.status(500).json({ message: 'Erro ao buscar parceiros.' });
  }
};

const createPartner = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }

  try {
    const partner = await prisma.partner.create({
      data: {
        name,
        phone: req.body.phone,
        address: req.body.address || null,
        responsiblePersons: req.body.responsiblePersons || [],
        contract: req.body.contract || null,
        indicatedClientsCount: req.body.indicatedClientsCount || 0,
        totalVolume: req.body.totalVolume || 0,
      },
    });
    res.status(201).json(buildPartnerResponse(partner));
  } catch (error) {
    console.error('Erro ao criar parceiro:', error);
    res.status(500).json({ message: 'Erro ao criar parceiro.' });
  }
};

const updatePartner = async (req, res) => {
  try {
    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(buildPartnerResponse(partner));
  } catch (error) {
    console.error('Erro ao atualizar parceiro:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Parceiro não encontrado.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar parceiro.' });
  }
};

const deletePartner = async (req, res) => {
  try {
    await prisma.partner.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover parceiro:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Parceiro não encontrado.' });
    }
    res.status(500).json({ message: 'Erro ao remover parceiro.' });
  }
};

module.exports = {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
};
