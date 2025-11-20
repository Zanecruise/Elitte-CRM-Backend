const { summarizeHistory } = require('../services/geminiService');

const summarize = async (req, res) => {
    const { interactions } = req.body;

    if (!interactions || !Array.isArray(interactions)) {
        return res.status(400).json({ error: 'O histórico de interações (um array) é obrigatório.' });
    }

    try {
        const result = await summarizeHistory(interactions);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor ao gerar o resumo.' });
    }
};

module.exports = { summarize };
