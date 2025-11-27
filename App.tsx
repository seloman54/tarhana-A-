import React, { useState, useEffect } from 'react';
import { ChefPersona, GeneratedRecipe, SavedRecipe } from './types';
import { CHEF_PROFILES } from './constants';
import { generateRecipe, getApiKey } from './services/geminiService';
import ChefCard from './components/ChefCard';
import RecipeDisplay from './components/RecipeDisplay';
import Logo from './components/Logo';

// Common ingredients for quick selection
const POPULAR_INGREDIENTS = [
  'Yumurta', 'Domates', 'Soğan', 'Patates', 
  'Tavuk', 'Kıyma', 'Pirinç', 'Makarna', 
  'Peynir', 'Süt', 'Sarımsak', 'Zeytinyağı'
];

const App: React.FC = () => {
  // State
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedChef, setSelectedChef] = useState<ChefPersona>(ChefPersona.GRANDMA);
  
  // Recipe Data State
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [currentRecipeImage, setCurrentRecipeImage] = useState<string | null>(null);
  
  // View State (INPUT vs RESULT)
  const [viewMode, setViewMode] = useState<'INPUT' | 'RESULT'>('INPUT');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cookbook State
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isCookbookOpen, setIsCookbookOpen] = useState(false);

  // Initial Checks
  useEffect(() => {
    // Check for saved recipes
    const saved = localStorage.getItem('lechef-recipes');
    if (saved) {
      try {
        setSavedRecipes(JSON.parse(saved));
      } catch (e) {
        console.error("Could not parse saved recipes", e);
      }
    }
  }, []);

  // Handlers
  const handleAddIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentInput.trim()) {
      addIngredientToList(currentInput.trim());
      setCurrentInput('');
    }
  };

  const addIngredientToList = (ing: string) => {
    // Case insensitive check for duplicates
    const exists = ingredients.some(i => i.toLowerCase() === ing.toLowerCase());
    if (!exists) {
      setIngredients([...ingredients, ing]);
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };
  
  const clearAllIngredients = () => {
    setIngredients([]);
  };

  const handleCreateRecipe = async () => {
    if (ingredients.length === 0) {
      setError("Lütfen en az bir malzeme ekleyin.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateRecipe(ingredients, selectedChef);
      setRecipe(result);
      setCurrentRecipeImage(null); // Reset image for new recipe
      setViewMode('RESULT');
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING') {
         setError("API Anahtarı bulunamadı. Lütfen yapılandırmayı kontrol edin.");
      } else {
        setError("Tarif oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = (imageUrl: string | null) => {
    if (!recipe) return;

    // Avoid duplicates based on name and description
    if (savedRecipes.some(r => r.recipeName === recipe.recipeName && r.description === recipe.description)) {
      return;
    }

    const newSavedRecipe: SavedRecipe = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: Date.now(),
      imageUrl: imageUrl
    };

    const updatedRecipes = [newSavedRecipe, ...savedRecipes];
    setSavedRecipes(updatedRecipes);
    localStorage.setItem('lechef-recipes', JSON.stringify(updatedRecipes));
    setCurrentRecipeImage(imageUrl); // Sync current view just in case
  };

  const handleDeleteRecipe = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedRecipes.filter(r => r.id !== id);
    setSavedRecipes(updated);
    localStorage.setItem('lechef-recipes', JSON.stringify(updated));
  };

  const handleViewSaved = (saved: SavedRecipe) => {
    setRecipe(saved);
    setCurrentRecipeImage(saved.imageUrl || null);
    setIsCookbookOpen(false);
    setViewMode('RESULT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleBackToInputs = () => {
    // Just switch view, keep recipe data
    setViewMode('INPUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRecipe = () => {
    if (recipe) {
      setViewMode('RESULT');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImageGenerated = (url: string) => {
    setCurrentRecipeImage(url);
  };

  const isCurrentRecipeSaved = recipe 
    ? savedRecipes.some(r => r.recipeName === recipe.recipeName && r.description === recipe.description)
    : false;

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-900 flex flex-col relative">
      {/* Navbar - Compact */}
      <nav className="bg-white border-b border-orange-100 sticky top-0 z-50 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
            <Logo className="w-8 h-8 shadow-md rounded-lg transition-transform transform group-hover:scale-110" />
            <h1 className="text-xl font-serif font-bold text-chef-700 tracking-tight hidden md:block">Tarhana AI</h1>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCookbookOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-chef-700 font-medium hover:bg-orange-50 rounded-lg transition-colors text-sm"
            >
              <span className="text-lg">📒</span>
              <span className="hidden md:inline">Tarif Defterim</span>
              <span className="bg-chef-100 text-chef-800 text-xs px-1.5 py-0.5 rounded-full">{savedRecipes.length}</span>
            </button>
            <button 
              onClick={() => {
                 setRecipe(null);
                 setViewMode('INPUT');
              }}
              className="text-xs font-medium bg-chef-600 text-white px-3 py-1.5 rounded-lg hover:bg-chef-700 transition-colors md:block hidden"
            >
              Yeni Tarif
            </button>
          </div>
        </div>
      </nav>

      {/* Cookbook Modal */}
      {isCookbookOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsCookbookOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-[slideIn_0.3s_ease-out]">
            <div className="p-4 border-b flex justify-between items-center bg-orange-50">
              <h2 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
                📒 Tarif Defterim
              </h2>
              <button onClick={() => setIsCookbookOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-200 text-gray-600">✕</button>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {savedRecipes.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <div className="text-5xl mb-3">📓</div>
                  <p className="text-sm">Henüz kaydedilmiş tarifin yok.</p>
                </div>
              ) : (
                savedRecipes.map((saved) => (
                  <div 
                    key={saved.id}
                    onClick={() => handleViewSaved(saved)}
                    className="group bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex gap-3"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {saved.imageUrl ? (
                        <img src={saved.imageUrl} alt={saved.recipeName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🥘</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate group-hover:text-chef-600 transition-colors">
                        {saved.recipeName}
                      </h3>
                      <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 mb-1">
                        {saved.description}
                      </p>
                      <div className="flex items-center text-[10px] text-gray-400 gap-2">
                         <span>🔥 {saved.calories} kcal</span>
                         <span>⏱️ {saved.cookingTime}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteRecipe(e, saved.id)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full flex flex-col md:justify-center overflow-auto">
        
        {/* Input & Selection View */}
        {viewMode === 'INPUT' ? (
          <div className="flex flex-col h-full md:justify-center fade-in">
            {/* Intro Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-800 leading-tight">
                Bugün ne pişirelim?
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Malzemeleri gir, şefini seç, tarifin hazır olsun.
              </p>
            </div>

            <div className="grid md:grid-cols-12 gap-6 w-full items-stretch">
              {/* Left Col: Ingredients (7 cols) */}
              <div className="md:col-span-7 bg-white rounded-2xl shadow-sm border border-orange-100 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    🛒 Dolabındaki Malzemeler
                  </label>
                  {ingredients.length > 0 && (
                    <button 
                      onClick={clearAllIngredients}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddIngredient} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Örn: Yumurta, Soğan..."
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-chef-500 outline-none text-sm"
                  />
                  <button type="submit" className="bg-chef-600 hover:bg-chef-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                    Ekle
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                  {ingredients.length > 0 ? ingredients.map((ing, idx) => (
                    <span key={idx} className="inline-flex items-center bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-medium animate-[popIn_0.3s_ease-out]">
                      {ing}
                      <button onClick={() => removeIngredient(ing)} className="ml-1 hover:text-red-600">×</button>
                    </span>
                  )) : (
                    <span className="text-xs text-gray-400 italic py-1">Liste boş...</span>
                  )}
                </div>

                {/* Popular Ingredients */}
                <div className="mt-auto pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Popüler Seçimler</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_INGREDIENTS.slice(0, 10).map((item) => {
                      const isAdded = ingredients.some(i => i.toLowerCase() === item.toLowerCase());
                      return (
                        <button
                          key={item}
                          onClick={() => !isAdded && addIngredientToList(item)}
                          disabled={isAdded}
                          className={`px-2 py-1 rounded border text-xs transition-colors ${isAdded ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-chef-400 hover:text-chef-600'}`}
                        >
                          {isAdded ? '✓' : '+'} {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Col: Chef Selection (5 cols) */}
              <div className="md:col-span-5 flex flex-col justify-between gap-4">
                 <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5 flex-1">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      👨‍🍳 Şefini Seç
                    </h3>
                    <div className="grid grid-cols-2 gap-3 h-full content-start">
                      {CHEF_PROFILES.map((chef) => (
                        <ChefCard
                          key={chef.id}
                          chef={chef}
                          isSelected={selectedChef === chef.id}
                          onClick={() => setSelectedChef(chef.id)}
                        />
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            {/* Generate Button Area */}
            <div className="mt-6 flex flex-col items-center">
              
              {/* Return to last recipe button */}
              {recipe && !loading && (
                <button
                  onClick={handleBackToRecipe}
                  className="mb-3 text-sm text-chef-600 hover:text-chef-800 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>🔙</span> "{recipe.recipeName}" Tarifine Dön
                </button>
              )}

              <button
                onClick={handleCreateRecipe}
                disabled={loading || ingredients.length === 0}
                className={`
                  w-full md:w-auto px-12 py-3 rounded-xl text-lg font-bold text-white shadow-lg transition-all transform
                  ${loading || ingredients.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-chef-500 to-red-600 hover:shadow-xl hover:-translate-y-1 hover:scale-105'}
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Düşünülüyor...
                  </span>
                ) : (
                  "✨ Bana Özel Tarif Oluştur"
                )}
              </button>
              
              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Result View */
          recipe && (
            <div className="w-full flex justify-center">
               <RecipeDisplay 
                  recipe={recipe} 
                  isSaved={isCurrentRecipeSaved}
                  onSave={handleSaveRecipe}
                  onClose={handleBackToInputs}
                  initialImageUrl={currentRecipeImage}
                  onImageGenerated={handleImageGenerated}
               />
            </div>
          )
        )}
      </main>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;