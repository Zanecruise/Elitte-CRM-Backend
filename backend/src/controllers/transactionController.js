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

const ensureClientOwnership = async (clientId, userId) =>
  prisma.client.findFirst({ where: { id: clientId, ownerId: userId } });

const ensureTransactionOwnership = async (transactionId, userId) =>
  prisma.transaction.findFirst({
    where: { id: transactionId, ownerId: userId },
    include: { client: true },
  });

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { ownerId: req.user.id },
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

  const client = await ensureClientOwnership(clientId, req.user.id);
  if (!client) {
    return res.status(404).json({ message: 'Cliente não encontrado.' });
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
        ownerId: req.user.id,
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
    const existing = await ensureTransactionOwnership(
      req.params.id,
      req.user.id
    );

    if (!existing) {
      return res.status(404).json({ message: 'Transação não encontrada.' });
    }

    if (req.body.clientId && req.body.clientId !== existing.clientId) {
      const client = await ensureClientOwnership(req.body.clientId, req.user.id);
      if (!client) {
        return res.status(404).json({ message: 'Cliente não encontrado.' });
      }
    }

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
    const existing = await ensureTransactionOwnership(
      req.params.id,
      req.user.id
    );
    if (!existing) {
      return res.status(404).json({ message: 'Transação não encontrada.' });
    }
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
