import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedRecipe, ChefPersona, ChefProfile } from "../types";
import { CHEF_PROFILES } from "../constants";

// --- API ANAHTARI ALMA ---
export const getApiKey = () => {
  // 1. ÖNCELİK: Vite / Vercel (Modern Web)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Hata olursa sessizce geç
  }

  // 2. YEDEK: Klasik Process Env (AI Studio / Yerel Node.js)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }

  return '';
};

// Helper to get dynamic AI instance
const getAI = () => {
  const key = getApiKey();
  return key ? new GoogleGenAI({ apiKey: key }) : null;
};

export const generateRecipe = async (
  ingredients: string[],
  chefId: ChefPersona
): Promise<GeneratedRecipe> => {
  const ai = getAI();
  if (!ai) throw new Error("API_KEY_MISSING");

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

// --- IMAGE GENERATION STRATEGY ---
// 1. Try Gemini 2.5 Flash Image (High Quality) - With timeout
// 2. Fallback to Pollinations.ai (Free, unlimited) - Optimized size

export const generateDishImage = async (recipe: GeneratedRecipe): Promise<string | null> => {
  const ai = getAI();
  
  // 1. Try Gemini First if AI is available
  if (ai) {
    try {
      // Create a timeout promise (2.5 seconds)
      // If Gemini takes too long (e.g. queue or cold start), we skip to fallback to keep UI snappy.
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 2500)
      );

      // Focus on ingredients for better visual relevance
      const ingredientsContext = recipe.ingredientsList.slice(0, 5).join(", ");
      const prompt = `
        Professional food photography close-up.
        Dish: ${recipe.recipeName}.
        Main Ingredients visible: ${ingredientsContext}.
        Style: 4k, photorealistic, appetizing, soft studio lighting, macro depth of field.
        No text, no people, no alcohol.
      `;

      const apiCall = ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {}
      });

      // Race API call against timeout
      const response = await Promise.race([apiCall, timeoutPromise]) as any;

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (error) {
      console.warn("Gemini Image Gen skipped (Error or Timeout). Switching to Pollinations fallback...", error);
      // Hata alınca kod durmuyor, aşağıya devam edip Pollinations'ı çalıştırıyor.
    }
  }

  // 2. Fallback: Pollinations.ai
  return generatePollinationsImage(recipe);
};

const generatePollinationsImage = (recipe: GeneratedRecipe): string => {
  // Construct a prompt for Pollinations
  // We include ingredients in the fallback prompt to ensure the image looks like the actual food
  // even if the model doesn't know the Turkish dish name.
  const ingredientsShort = recipe.ingredientsList.slice(0, 4).join(", ");
  const prompt = `food photography of ${recipe.recipeName}, made of ${ingredientsShort}, ${recipe.description}, delicious, studio lighting, photorealistic, 4k`;
  const encodedPrompt = encodeURIComponent(prompt);
  
  const seed = Math.floor(Math.random() * 10000);
  
  // OPTIMIZATION: Reduced size to 512x512 for much faster loading (4x faster than 1024)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;
};

export const editDishImage = async (imageSrc: string, editPrompt: string): Promise<string | null> => {
  const ai = getAI();
  if (!ai) return null;

  try {
    if (!imageSrc.startsWith('data:')) {
      alert("Şu an sadece AI tarafından oluşturulan orijinal görseller düzenlenebilir.");
      return null;
    }

    const base64Data = imageSrc.split(',')[1];
    const mimeType = imageSrc.split(':')[1].split(';')[0];

    const prompt = `Edit this image based on the following instruction: "${editPrompt}". Keep the photorealistic food photography style.`;

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
