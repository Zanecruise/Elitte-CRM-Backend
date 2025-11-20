const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

const searchWithGemini = async (query, context) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = `
        Você é um assistente de busca para um CRM financeiro. Sua tarefa é buscar clientes, oportunidades e tarefas com base na consulta do usuário.
        O contexto de dados é fornecido como um objeto JSON. Você deve retornar uma lista de resultados em formato JSON.

        Contexto:
        ${JSON.stringify(context)}

        Consulta: "${query}"

        Retorne uma lista de resultados no seguinte formato JSON:
        {
            "clients": [],
            "opportunities": [],
            "tasks": []
        }

        Se nenhum resultado for encontrado, retorne um objeto JSON vazio com as chaves "clients", "opportunities" e "tasks".
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error searching with Gemini", error);
        return { clients: [], opportunities: [], tasks: [] };
    }
};

const summarizeHistory = async (interactions) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = `
        Você é um assistente de CRM financeiro. Sua tarefa é resumir um histórico de interações com um cliente.
        O histórico é fornecido como um array de objetos JSON.
        Retorne um resumo conciso em bullet points (formato markdown) destacando os pontos mais importantes, as últimas decisões e os próximos passos acordados.

        Histórico de Interações:
        ${JSON.stringify(interactions, null, 2)}

        Resumo:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return { summary: text };
    } catch (error) {
        console.error("Error summarizing with Gemini", error);
        return { summary: "Não foi possível gerar o resumo." };
    }
};

module.exports = { searchWithGemini, summarizeHistory };
