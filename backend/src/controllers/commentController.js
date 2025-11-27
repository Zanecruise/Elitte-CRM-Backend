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

const getNotesByClient = async (req, res) => {
  const { clientId } = req.params;
  const { limit } = req.query;

  if (!clientId) {
    return res
      .status(400)
      .json({ message: 'O identificador do cliente e obrigatorio.' });
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
    console.error('Erro ao buscar notas de colaboracao:', error);
    res.status(500).json({ message: 'Erro ao buscar notas de colaboracao.' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await prisma.collaborationNote.findUnique({
      where: { id: req.params.id },
    });
    if (!note) {
      return res.status(404).json({ message: 'Nota nao encontrada.' });
    }
    res.json(buildNoteResponse(note));
  } catch (error) {
    console.error('Erro ao buscar nota:', error);
    res.status(500).json({ message: 'Erro ao buscar nota.' });
  }
};

const createNote = async (req, res) => {
  const { clientId } = req.params;
  const { content, mentions, authorId, authorName } = req.body;

  if (!clientId) {
    return res
      .status(400)
      .json({ message: 'O identificador do cliente e obrigatorio.' });
  }

  const sanitizedContent = toTrimmedString(content);

  if (!sanitizedContent) {
    return res
      .status(400)
      .json({ message: 'O conteudo da nota e obrigatorio.' });
  }

  const sanitizedMentions = normalizeMentions(mentions);

  try {
    const note = await prisma.collaborationNote.create({
      data: {
        clientId,
        content: sanitizedContent,
        mentions: sanitizedMentions,
        authorId: authorId ? String(authorId) : null,
        authorName: toTrimmedString(authorName) || null,
      },
    });
    res.status(201).json(buildNoteResponse(note));
  } catch (error) {
    console.error('Erro ao criar nota de colaboracao:', error);
    if (error.code === 'P2003') {
      return res
        .status(404)
        .json({ message: 'Cliente nao encontrado para associar a nota.' });
    }
    res.status(500).json({ message: 'Erro ao criar nota de colaboracao.' });
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
        .json({ message: 'O conteudo nao pode ficar vazio.' });
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
      .json({ message: 'Nenhum campo valido foi enviado para atualizacao.' });
  }

  try {
    const updated = await prisma.collaborationNote.update({
      where: { id: req.params.id },
      data,
    });
    res.json(buildNoteResponse(updated));
  } catch (error) {
    console.error('Erro ao atualizar nota de colaboracao:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Nota nao encontrada.' });
    }
    res
      .status(500)
      .json({ message: 'Erro ao atualizar nota de colaboracao.' });
  }
};

const deleteNote = async (req, res) => {
  try {
    await prisma.collaborationNote.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover nota de colaboracao:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Nota nao encontrada.' });
    }
    res
      .status(500)
      .json({ message: 'Erro ao remover nota de colaboracao.' });
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
