export enum ChefPersona {
  GRANDMA = 'GRANDMA',
  MICHELIN = 'MICHELIN',
  STUDENT = 'STUDENT',
  HEALTH_GURU = 'HEALTH_GURU'
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

export interface GeneratedRecipe {
  recipeName: string;
  description: string;
  ingredientsList: string[];
  steps: RecipeStep[];
  prepTime: string;
  cookingTime: string;
  calories: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  beveragePairing: string;
  chefComment: string;
}

export interface SavedRecipe extends GeneratedRecipe {
  id: string;
  createdAt: number;
  imageUrl?: string | null;
}

export interface ChefProfile {
  id: ChefPersona;
  name: string;
  description: string;
  icon: string;
  promptStyle: string;
}