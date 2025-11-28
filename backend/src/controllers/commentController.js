const prisma = require('../lib/prisma');

const toTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeMentionRecord = (rawMention) => {
  if (rawMention == null) {
    return null;
  }

  if (typeof rawMention === 'string') {
    const label = rawMention.trim();
    return label ? { id: null, name: label, email: null } : null;
  }

  if (typeof rawMention !== 'object') {
    return null;
  }

  const id =
    rawMention.id ??
    rawMention.userId ??
    rawMention.value ??
    rawMention.email ??
    null;
  const name =
    toTrimmedString(rawMention.name) ||
    toTrimmedString(rawMention.fullName) ||
    toTrimmedString(rawMention.label);
  const email = toTrimmedString(rawMention.email);

  if (!id && !name && !email) {
    return null;
  }

  return {
    id: id ? String(id) : null,
    name: name || null,
    email: email || null,
    role: rawMention.role ? String(rawMention.role) : null,
    avatar: rawMention.avatar ? String(rawMention.avatar) : null,
  };
};

const normalizeMentions = (mentions) => {
  if (!mentions) {
    return [];
  }

  const mentionList = Array.isArray(mentions)
    ? mentions
    : typeof mentions === 'string'
      ? mentions.split(',').map((item) => item.trim())
      : [];

  return mentionList
    .map(normalizeMentionRecord)
    .filter((mention) => mention !== null);
};

const buildNoteResponse = (note) => {
  if (!note) return null;
  const mentionsArray = Array.isArray(note.mentions)
    ? note.mentions
    : normalizeMentions(note.mentions);

  return {
    ...note,
    mentions: mentionsArray,
  };
};

const ensureClientOwnership = async (clientId, userId) =>
  prisma.client.findFirst({ where: { id: clientId, ownerId: userId } });

const ensureNoteOwnership = async (noteId, userId) =>
  prisma.collaborationNote.findFirst({
    where: { id: noteId, client: { ownerId: userId } },
  });

const getNotesByClient = async (req, res) => {
  const { clientId } = req.params;
  const { limit } = req.query;

  if (!clientId) {
    return res
      .status(400)
      .json({ message: 'O identificador do cliente é obrigatório.' });
  }

  const client = await ensureClientOwnership(clientId, req.user.id);
  if (!client) {
    return res.status(404).json({ message: 'Cliente não encontrado.' });
  }

  const take = Number(limit);
  const sanitizedTake =
    Number.isInteger(take) && take > 0 ? Math.min(take, 100) : undefined;

  try {
    const notes = await prisma.collaborationNote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: sanitizedTake,
    });
    res.json(notes.map(buildNoteResponse));
  } catch (error) {
    console.error('Erro ao buscar notas de colaboração:', error);
    res.status(500).json({ message: 'Erro ao buscar notas de colaboração.' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await ensureNoteOwnership(req.params.id, req.user.id);
    if (!note) {
      return res.status(404).json({ message: 'Nota não encontrada.' });
    }
    res.json(buildNoteResponse(note));
  } catch (error) {
    console.error('Erro ao buscar nota:', error);
    res.status(500).json({ message: 'Erro ao buscar nota.' });
  }
};

const createNote = async (req, res) => {
  const { clientId } = req.params;
  const { content, mentions } = req.body;

  if (!clientId) {
    return res
      .status(400)
      .json({ message: 'O identificador do cliente é obrigatório.' });
  }

  const client = await ensureClientOwnership(clientId, req.user.id);
  if (!client) {
    return res.status(404).json({ message: 'Cliente não encontrado.' });
  }

  const sanitizedContent = toTrimmedString(content);

  if (!sanitizedContent) {
    return res
      .status(400)
      .json({ message: 'O conteúdo da nota é obrigatório.' });
  }

  const sanitizedMentions = normalizeMentions(mentions);

  try {
    const note = await prisma.collaborationNote.create({
      data: {
        clientId,
        content: sanitizedContent,
        mentions: sanitizedMentions,
        authorId: req.user.id,
        authorName: req.user.name || req.user.username,
      },
    });
    res.status(201).json(buildNoteResponse(note));
  } catch (error) {
    console.error('Erro ao criar nota de colaboração:', error);
    if (error.code === 'P2003') {
      return res
        .status(404)
        .json({ message: 'Cliente não encontrado para associar a nota.' });
    }
    res.status(500).json({ message: 'Erro ao criar nota de colaboração.' });
  }
};

const updateNote = async (req, res) => {
  const { content, mentions, authorName } = req.body;
  const data = {};

  if (content !== undefined) {
    const sanitizedContent = toTrimmedString(content);
    if (!sanitizedContent) {
      return res
        .status(400)
        .json({ message: 'O conteúdo não pode ficar vazio.' });
    }
    data.content = sanitizedContent;
  }

  if (mentions !== undefined) {
    data.mentions = normalizeMentions(mentions);
  }

  if (authorName !== undefined) {
    data.authorName = toTrimmedString(authorName) || null;
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ message: 'Nenhum campo válido foi enviado para atualização.' });
  }

  try {
    const existing = await ensureNoteOwnership(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ message: 'Nota não encontrada.' });
    }

    const updated = await prisma.collaborationNote.update({
      where: { id: req.params.id },
      data,
    });
    res.json(buildNoteResponse(updated));
  } catch (error) {
    console.error('Erro ao atualizar nota de colaboração:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Nota não encontrada.' });
    }
    res
      .status(500)
      .json({ message: 'Erro ao atualizar nota de colaboração.' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const existing = await ensureNoteOwnership(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ message: 'Nota não encontrada.' });
    }

    await prisma.collaborationNote.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover nota de colaboração:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Nota não encontrada.' });
    }
    res
      .status(500)
      .json({ message: 'Erro ao remover nota de colaboração.' });
  }
};

module.exports = {
  getNotesByClient,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  buildNoteResponse,
};
