import React, { useState, useEffect } from 'react';
import { GeneratedRecipe } from '../types';
import { generateDishImage, editDishImage } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import { FALLBACK_FOOD_IMAGES } from '../constants';

interface RecipeDisplayProps {
  recipe: GeneratedRecipe;
  isSaved?: boolean;
  onSave?: (imageUrl: string | null) => void;
  onClose?: () => void;
  initialImageUrl?: string | null;
  onImageGenerated?: (url: string) => void;
}

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ 
  recipe, 
  isSaved = false, 
  onSave, 
  onClose, 
  initialImageUrl,
  onImageGenerated 
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showFallbackPicker, setShowFallbackPicker] = useState(false);
  
  // Image Editing State
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Function to handle image generation logic
  const performImageGeneration = async () => {
    setLoadingImage(true);
    setShowFallbackPicker(false);
    setShowEditInput(false);
    try {
      // Pass the full recipe object to ensure image accuracy based on ingredients
      const url = await generateDishImage(recipe);
      if (url) {
        setImageUrl(url);
        if (onImageGenerated) onImageGenerated(url);
      } else {
        setShowFallbackPicker(true);
      }
    } catch (error) {
      console.error("Image gen failed", error);
      setShowFallbackPicker(true);
    } finally {
      setLoadingImage(false);
    }
  };

  useEffect(() => {
    // Reset states when recipe changes
    setShowFallbackPicker(false);
    setShowEditInput(false);
    setEditPrompt('');
    setIsExportOpen(false);

    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
      setLoadingImage(false);
    } else {
      // Automatic generation for new recipes
      setImageUrl(null);
      performImageGeneration();
    }
    // We rely on recipe.recipeName to detect a "new" recipe being loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.recipeName, initialImageUrl]);

  const handleEditImage = async () => {
    if (!imageUrl || !editPrompt.trim()) return;

    setIsEditing(true);
    try {
      const newUrl = await editDishImage(imageUrl, editPrompt);
      if (newUrl) {
        setImageUrl(newUrl);
        if (onImageGenerated) onImageGenerated(newUrl);
        setShowEditInput(false);
        setEditPrompt('');
      } else {
        // Handle error visually if needed
        alert("Görsel düzenlenemedi, lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Edit failed", error);
      alert("Bir hata oluştu.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleSelectFallback = (url: string) => {
    setImageUrl(url);
    if (onImageGenerated) onImageGenerated(url);
    setShowFallbackPicker(false);
  };

  const cleanTextForPDF = (text: string) => {
    // Basic transliteration for PDF standard fonts which lack full Turkish support in jsPDF default config
    const map: Record<string, string> = {
      'ğ': 'g', 'Ğ': 'G', 'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I', 'ç': 'c', 'Ç': 'C', 'ö': 'o', 'Ö': 'O', 'ü': 'u', 'Ü': 'U'
    };
    return text.replace(/[ğĞşŞıİçÇöÖüÜ]/g, (char) => map[char] || char);
  };

  const handleExportTXT = () => {
    const content = `
${recipe.recipeName.toUpperCase()}
----------------------------------------
${recipe.description}

HAZIRLIK: ${recipe.prepTime}
PİŞİRME: ${recipe.cookingTime}
KALORİ: ${recipe.calories} kcal
ZORLUK: ${recipe.difficulty}

MALZEMELER:
${recipe.ingredientsList.map(i => `- ${i}`).join('\n')}

HAZIRLANIŞI:
${recipe.steps.map(s => `${s.stepNumber}. ${s.instruction}`).join('\n')}

EŞLİKÇİ: ${recipe.beveragePairing}

ŞEFİN NOTU:
${recipe.chefComment}

Tarhana AI tarafından oluşturulmuştur.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.recipeName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    // Helper to add text with wrapping
    const addText = (text: string, fontSize: number, fontStyle: string = 'normal', color: [number, number, number] = [0, 0, 0]) => {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      
      const cleanLine = cleanTextForPDF(text);
      const lines = doc.splitTextToSize(cleanLine, contentWidth);
      
      doc.text(lines, margin, y);
      y += (lines.length * fontSize * 0.4) + 2; // Line height approximation
    };

    // Title
    addText(recipe.recipeName.toUpperCase(), 18, 'bold', [234, 88, 12]); // Chef color
    y += 5;

    // Description
    addText(recipe.description, 11, 'italic', [80, 80, 80]);
    y += 5;

    // Meta
    addText(`Hazirlik: ${cleanTextForPDF(recipe.prepTime)} | Pisirme: ${cleanTextForPDF(recipe.cookingTime)} | ${recipe.calories} kcal`, 10, 'normal');
    y += 10;

    // Ingredients
    addText("MALZEMELER", 12, 'bold');
    recipe.ingredientsList.forEach(ing => {
      addText(`• ${ing}`, 10);
    });
    y += 5;

    // Steps
    addText("HAZIRLANISI", 12, 'bold');
    recipe.steps.forEach(step => {
      addText(`${step.stepNumber}. ${step.instruction}`, 10);
      y += 2;
    });
    y += 5;

    // Notes
    addText("SEFIN NOTU", 12, 'bold');
    addText(recipe.chefComment, 10, 'italic');
    
    // Footer
    y = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Tarhana AI tarafindan olusturulmustur.", margin, y);

    doc.save(`${recipe.recipeName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${recipe.recipeName} - Tarhana AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Playfair Display', 'serif'] },
            colors: { chef: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' } }
          }
        }
      }
    </script>
</head>
<body class="bg-orange-50 min-h-screen py-10 px-4 flex justify-center items-start">
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
        <!-- Header -->
        <div class="bg-chef-600 text-white p-8 relative overflow-hidden">
            <h1 class="text-4xl md:text-5xl font-serif font-bold mb-4 relative z-10">${recipe.recipeName}</h1>
            <p class="text-chef-100 text-lg italic relative z-10">"${recipe.description}"</p>
            <div class="flex flex-wrap gap-4 mt-6 relative z-10">
                <div class="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">⏱️ ${recipe.prepTime}</div>
                <div class="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">🔥 ${recipe.cookingTime}</div>
                <div class="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">📊 ${recipe.calories} kcal</div>
                <div class="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">💪 ${recipe.difficulty}</div>
            </div>
        </div>

        <!-- Image -->
        ${imageUrl ? `
        <div class="w-full h-[400px] overflow-hidden">
            <img src="${imageUrl}" class="w-full h-full object-cover" alt="${recipe.recipeName}">
        </div>
        ` : ''}

        <div class="grid md:grid-cols-3 gap-8 p-8">
            <!-- Sidebar -->
            <div class="md:col-span-1 space-y-6">
                <div class="bg-orange-50 p-6 rounded-xl border border-orange-100">
                    <h3 class="font-bold text-xl text-gray-800 mb-4 flex items-center"><span class="mr-2">🛒</span> Malzemeler</h3>
                    <ul class="space-y-2">
                        ${recipe.ingredientsList.map(ing => `
                        <li class="flex items-start text-gray-700 text-sm">
                            <span class="w-2 h-2 bg-chef-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span> ${ing}
                        </li>`).join('')}
                    </ul>
                </div>
                <div class="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <h3 class="font-bold text-xl text-gray-800 mb-4 flex items-center"><span class="mr-2">🍷</span> Eşlikçi</h3>
                    <p class="text-gray-700 italic text-sm">${recipe.beveragePairing}</p>
                </div>
                <div class="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 class="font-bold text-xl text-gray-800 mb-3">Şefin Notu</h3>
                    <p class="text-gray-700 text-sm font-medium font-serif leading-relaxed">"${recipe.chefComment}"</p>
                </div>
            </div>

            <!-- Steps -->
            <div class="md:col-span-2">
                <h3 class="font-bold text-2xl text-gray-800 mb-6 flex items-center border-b pb-4"><span class="mr-3">👨‍🍳</span> Hazırlanışı</h3>
                <div class="space-y-6">
                    ${recipe.steps.map(step => `
                    <div class="flex gap-4">
                        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-chef-100 text-chef-700 font-bold flex items-center justify-center border-2 border-chef-200">
                            ${step.stepNumber}
                        </div>
                        <div class="pt-1"><p class="text-gray-700 leading-relaxed text-lg">${step.instruction}</p></div>
                    </div>`).join('')}
                </div>
            </div>
        </div>
        <div class="bg-gray-50 p-4 text-center text-gray-400 text-xs border-t">
            Tarhana AI tarafından oluşturulmuştur.
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.recipeName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full fade-in my-8 relative">
      
      {/* Action Bar (Top Toolbar) - Solves overlap issue */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-white border-b border-gray-100 gap-4">
        
        {/* Left Side: New Recipe (Back) */}
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-chef-600 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors w-full md:w-auto justify-center md:justify-start"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Yeni Tarif
          </button>
        )}

        {/* Right Side: Export & Save */}
        <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
          {/* Export Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Dışa Aktar
            </button>
            
            {isExportOpen && (
               <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-[fadeIn_0.2s_ease-out] z-30">
                  <button 
                    onClick={() => { handleExportHTML(); setIsExportOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 text-gray-700 text-sm flex items-center gap-2 border-b border-gray-50"
                  >
                    🌐 Web Sayfası (.html)
                  </button>
                  <button 
                    onClick={() => { handleExportTXT(); setIsExportOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 text-gray-700 text-sm flex items-center gap-2"
                  >
                    📄 Metin Dosyası (.txt)
                  </button>
                  <button 
                    onClick={() => { handleExportPDF(); setIsExportOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 text-gray-700 text-sm flex items-center gap-2"
                  >
                    📑 PDF Dosyası (.pdf)
                  </button>
               </div>
            )}
          </div>

          {/* Save Button */}
          {onSave && (
            <button 
              onClick={() => onSave(imageUrl)}
              disabled={isSaved}
              className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 border ${
                isSaved 
                  ? 'bg-green-50 border-green-200 text-green-700 cursor-default' 
                  : 'bg-chef-600 border-chef-600 text-white hover:bg-chef-700'
              }`}
            >
              {isSaved ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Kaydedildi
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  Kaydet
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Header Section - Now clear of buttons */}
      <div className="bg-chef-600 text-white p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl transform rotate-12">🍽️</div>
        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 relative z-10">{recipe.recipeName}</h2>
        <p className="text-chef-100 text-lg italic relative z-10">"{recipe.description}"</p>
        
        <div className="flex flex-wrap gap-4 mt-6 relative z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">
            <span className="mr-2">⏱️</span> Hazırlık: {recipe.prepTime}
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">
            <span className="mr-2">🔥</span> Pişirme: {recipe.cookingTime}
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">
            <span className="mr-2">📊</span> {recipe.calories} kcal
          </div>
           <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 flex items-center">
            <span className="mr-2">💪</span> {recipe.difficulty}
          </div>
        </div>
      </div>

      {/* Visual Surprise Section */}
      <div className="p-8 border-b border-gray-100 flex flex-col items-center">
        {showFallbackPicker ? (
           <div className="w-full bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
             <div className="text-center mb-6">
               <h4 className="text-lg font-bold text-gray-700">Görsel oluşturulamadı 😔</h4>
               <p className="text-gray-500 text-sm">Üzülmeyin! Aşağıdaki galeriden tarifinize en uygun resmi seçebilirsiniz:</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {FALLBACK_FOOD_IMAGES.map((url, idx) => (
                 <button 
                   key={idx}
                   onClick={() => handleSelectFallback(url)}
                   className="relative aspect-square rounded-lg overflow-hidden group hover:ring-4 hover:ring-chef-400 transition-all"
                 >
                   <img src={url} alt="Seçenek" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                 </button>
               ))}
             </div>
             <button 
                onClick={() => setShowFallbackPicker(false)}
                className="mt-6 mx-auto block text-sm text-gray-500 hover:text-gray-700 underline"
             >
                Vazgeç ve resimsiz devam et
             </button>
           </div>
        ) : !imageUrl ? (
          <div 
            className="group relative w-full md:w-2/3 h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden"
          >
             <div className="absolute inset-0 w-full h-full bg-gray-50 flex flex-col items-center justify-center overflow-hidden z-20">
               {/* Shimmer Effect */}
               <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-orange-100/40 to-gray-50 bg-[length:200%_100%] animate-[shimmerLoad_2s_linear_infinite]"></div>
               
               {/* Content */}
               <div className="relative z-10 flex flex-col items-center">
                 <div className="relative">
                   <span className="text-5xl animate-bounce block">📸</span>
                   <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/5 rounded-[50%] animate-pulse blur-[1px]"></span>
                 </div>
                 
                 <div className="mt-4 text-center">
                   <h4 className="text-chef-800 font-bold text-lg">Fotoğraf Çekiliyor</h4>
                   <p className="text-chef-600/70 text-xs mt-1 font-medium">Yapay zeka tabağınızı hazırlarken bekleyin...</p>
                 </div>

                 {/* Custom Loading Bar */}
                 <div className="w-40 h-1.5 bg-gray-200/60 rounded-full mt-5 overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-chef-400 to-chef-600 animate-[loadingSlide_1.5s_ease-in-out_infinite]"></div>
                 </div>
               </div>

               <style>{`
                  @keyframes shimmerLoad {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                  @keyframes loadingSlide {
                    0% { transform: translateX(-100%); width: 40%; }
                    50% { width: 70%; }
                    100% { transform: translateX(200%); width: 40%; }
                  }
               `}</style>
             </div>
          </div>
        ) : (
          <div className="relative w-full md:w-2/3 h-auto rounded-xl overflow-hidden shadow-lg fade-in group">
             
             {isEditing ? (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <div className="text-4xl animate-bounce mb-4">🪄</div>
                  <h4 className="font-bold text-gray-800 mb-2">Görsel Düzenleniyor</h4>
                  <p className="text-sm text-gray-600 animate-pulse">Tarifiniz sihirli bir dokunuşla yenileniyor...</p>
                </div>
             ) : null}

             <img src={imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover max-h-[500px]" />
             
             {/* Edit Button Overlay */}
             {!isEditing && !showEditInput && (
               <button 
                 onClick={() => setShowEditInput(true)}
                 className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-gray-700 hover:text-chef-600 px-3 py-2 rounded-lg text-sm font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 duration-300"
               >
                 <span>🪄</span> Resmi Düzenle
               </button>
             )}

             {/* Edit Input Overlay */}
             {showEditInput && !isEditing && (
               <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 animate-[slideUp_0.3s_ease-out] z-20">
                  <div className="flex flex-col gap-2 max-w-lg mx-auto">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">Sihirli Düzenleme</span>
                      <button onClick={() => setShowEditInput(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Örn: 'Maydanoz ekle', 'Daha aydınlık olsun'..." 
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-chef-500 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleEditImage()}
                      />
                      <button 
                        onClick={handleEditImage}
                        disabled={!editPrompt.trim()}
                        className="bg-chef-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-chef-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        ✨ Uygula
                      </button>
                    </div>
                  </div>
               </div>
             )}
            
            {/* Show AI label only when edit input is NOT showing to avoid overlap */}
             {!showEditInput && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pointer-events-none">
                    <span className="text-white text-sm font-medium">✨ AI tarafından oluşturuldu</span>
                </div>
             )}
             
             <style>{`
               @keyframes slideUp {
                 from { transform: translateY(100%); opacity: 0; }
                 to { transform: translateY(0); opacity: 1; }
               }
             `}</style>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 p-8">
        {/* Sidebar: Ingredients & Chef Notes */}
        <div className="md:col-span-1 space-y-8">
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🛒</span> Malzemeler
            </h3>
            <ul className="space-y-2">
              {recipe.ingredientsList.map((ing, idx) => (
                <li key={idx} className="flex items-start text-gray-700 text-sm">
                  <span className="w-2 h-2 bg-chef-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
             <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🍷</span> Eşlikçi
            </h3>
            <p className="text-gray-700 italic text-sm">{recipe.beveragePairing}</p>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 relative">
             <div className="absolute -top-3 -right-3 text-4xl">💬</div>
             <h3 className="font-bold text-xl text-gray-800 mb-3">Şefin Notu</h3>
             <p className="text-gray-700 text-sm font-medium font-serif leading-relaxed">
               "{recipe.chefComment}"
             </p>
          </div>
        </div>

        {/* Main: Steps */}
        <div className="md:col-span-2">
           <h3 className="font-bold text-2xl text-gray-800 mb-6 flex items-center border-b pb-4">
              <span className="text-3xl mr-3">👨‍🍳</span> Hazırlanışı
            </h3>
            <div className="space-y-6">
              {recipe.steps.map((step) => (
                <div key={step.stepNumber} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-chef-100 text-chef-700 font-bold flex items-center justify-center border-2 border-chef-200 group-hover:bg-chef-500 group-hover:text-white transition-colors">
                    {step.stepNumber}
                  </div>
                  <div className="pt-1">
                    <p className="text-gray-700 leading-relaxed text-lg">{step.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplay;