const { searchWithGemini } = require('../services/geminiService');

const search = async (req, res) => {
    const { query, context } = req.body;

    if (!query || !context) {
        return res.status(400).json({ error: 'Query and context are required' });
    }

    try {
        const results = await searchWithGemini(query, context);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { search };
