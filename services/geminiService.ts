import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedRecipe, ChefPersona, ChefProfile } from "../types";
import { CHEF_PROFILES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRecipe = async (
  ingredients: string[],
  chefId: ChefPersona
): Promise<GeneratedRecipe> => {
  const chef: ChefProfile = CHEF_PROFILES.find(c => c.id === chefId) || CHEF_PROFILES[0];
  
  const prompt = `
    Kullanıcının elindeki malzemeler: ${ingredients.join(", ")}.
    
    Lütfen bu malzemeleri (ve gerekirse temel kiler malzemelerini: yağ, tuz, baharat vb.) kullanarak harika bir yemek tarifi oluştur.
    
    Şef Kişiliği: ${chef.promptStyle}

    Önemli Not: Önerilen içecek (beveragePairing) kesinlikle alkolsüz olmalıdır (Örn: Ayran, şerbet, limonata, çay, meyve suyu vb.).
    
    Yanıtın kesinlikle aşağıdaki JSON formatında olmalı. Başka bir metin ekleme.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recipeName: { type: Type.STRING, description: "Yemeğin yaratıcı ismi" },
          description: { type: Type.STRING, description: "Yemeğin iştah açıcı kısa bir açıklaması" },
          ingredientsList: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Miktarlarıyla birlikte tam malzeme listesi" 
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                instruction: { type: Type.STRING, description: "Adım açıklaması" }
              }
            },
            description: "Hazırlanış adımları"
          },
          prepTime: { type: Type.STRING, description: "Hazırlık süresi (dk)" },
          cookingTime: { type: Type.STRING, description: "Pişirme süresi (dk)" },
          calories: { type: Type.INTEGER, description: "Tahmini kalori (porsiyon başı)" },
          difficulty: { type: Type.STRING, enum: ["Kolay", "Orta", "Zor"] },
          beveragePairing: { type: Type.STRING, description: "Bu yemeğin yanına gidecek alkolsüz bir içecek önerisi" },
          chefComment: { type: Type.STRING, description: "Şefin kişiliğine uygun özel bir yorum veya püf noktası" }
        },
        required: ["recipeName", "description", "ingredientsList", "steps", "prepTime", "cookingTime", "difficulty", "chefComment"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Tarif oluşturulamadı.");
  }

  return JSON.parse(response.text) as GeneratedRecipe;
};

export const generateDishImage = async (recipe: GeneratedRecipe): Promise<string | null> => {
  // Use gemini-2.5-flash-image for visual generation with strict adherence to ingredients
  const ingredientsContext = recipe.ingredientsList.join(", ");
  
  const prompt = `
    Create a highly realistic, professional food photography shot of the dish named: "${recipe.recipeName}".
    
    VISUAL REQUIREMENTS:
    1. The dish MUST look like: ${recipe.description}.
    2. VISIBLE INGREDIENTS: Use ONLY these main ingredients visually: ${ingredientsContext}. Do NOT add random ingredients that are not listed (e.g., if no meat is listed, do not show meat).
    3. STYLE: High resolution, 4k, appetizing, soft studio lighting, macro food photography depth of field.
    4. PRESENTATION: The plating should match the cooking method (e.g., if it's a soup, show it in a bowl; if baked, show texture).
    
    Exclude: Alcohol, pork, blurry elements, text overlays, ingredients not in the recipe.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        // No responseMimeType for image gen on this model
      }
    });

    // Extract image from response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Image generation error:", error);
    // Fallback logic handled in UI
    return null;
  }

  // Fallback if no image generated (or model only returned text)
  return null;
};

export const editDishImage = async (imageSrc: string, editPrompt: string): Promise<string | null> => {
  // Extract base64 data from Data URI
  const base64Data = imageSrc.split(',')[1];
  const mimeType = imageSrc.split(':')[1].split(';')[0];

  const prompt = `Edit this image based on the following instruction: "${editPrompt}". Keep the photorealistic food photography style and high resolution.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Image editing error:", error);
    return null;
  }
  return null;
};
