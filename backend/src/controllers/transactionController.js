const prisma = require('../lib/prisma');

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

const buildTransactionResponse = (transaction) => {
  if (!transaction) return null;
  return {
    ...transaction,
    value: toNumber(transaction.value) ?? 0,
    unitValue: toNumber(transaction.unitValue),
    clientName: transaction.client?.name || transaction.clientName || '',
  };
};

const getAllTransactions = async (_req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { client: true },
      orderBy: { timestamp: 'desc' },
    });
    res.json(transactions.map(buildTransactionResponse));
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ message: 'Erro ao buscar transações.' });
  }
};

const createTransaction = async (req, res) => {
  const { clientId, type, status } = req.body;
  if (!clientId || !type || !status) {
    return res
      .status(400)
      .json({ message: 'Cliente, tipo e status são obrigatórios.' });
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        clientId,
        type,
        product: req.body.product || null,
        value: req.body.value || 0,
        unitValue: req.body.unitValue || null,
        quantity: req.body.quantity || null,
        reservationDate: req.body.reservationDate
          ? new Date(req.body.reservationDate)
          : null,
        liquidationDate: req.body.liquidationDate
          ? new Date(req.body.liquidationDate)
          : null,
        timestamp: req.body.timestamp
          ? new Date(req.body.timestamp)
          : new Date(),
        status,
        institution: req.body.institution,
        docRef: req.body.docRef,
      },
      include: { client: true },
    });
    res.status(201).json(buildTransactionResponse(transaction));
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ message: 'Erro ao criar transação.' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: req.body,
      include: { client: true },
    });
    res.json(buildTransactionResponse(transaction));
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Transação não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar transação.' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover transação:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Transação não encontrada.' });
    }
    res.status(500).json({ message: 'Erro ao remover transação.' });
  }
};

module.exports = {
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
