import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getFinancialInsights = async (financialData: any) => {
  try {
    const prompt = `
      En tant qu'expert comptable et analyste financier pour le logiciel "VI Compt PRO", analyse les données financières suivantes et fournis des recommandations stratégiques.
      
      Données :
      ${JSON.stringify(financialData, null, 2)}
      
      Format de réponse attendu (Markdown) :
      1. Résumé de la situation actuelle
      2. Points d'attention (risques potentiels)
      3. Opportunités d'optimisation
      4. Prévisions à court terme
      
      Sois précis, professionnel et encourageant. Utilise un ton d'expert.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Désolé, je n'ai pas pu générer d'analyses pour le moment. Veuillez vérifier vos données ou réessayer plus tard.";
  }
};

export const categorizeExpense = async (description: string) => {
  try {
    const prompt = `
      Catégorise cette dépense comptable : "${description}".
      Réponds uniquement avec le nom de la catégorie suggérée (ex: Fournitures de bureau, Transport, Loyer, etc.) et un code de compte suggéré (ex: 6010).
      Format: Catégorie | Code
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return "Divers | 6000";
  }
};
