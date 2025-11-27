import { ChefPersona, ChefProfile } from './types';

export const CHEF_PROFILES: ChefProfile[] = [
  {
    id: ChefPersona.GRANDMA,
    name: "Babaanne Mutfağı",
    description: "Sıcak, geleneksel ve bol sevgili tarifler.",
    icon: "👵", 
    promptStyle: "Sen tecrübeli, tonton bir Türk babaannesisin. Tariflerin geleneksel, doyurucu ve samimi bir dille yazılmalı. 'Yavrum', 'evladım' gibi kelimeler kullan."
  },
  {
    id: ChefPersona.MICHELIN,
    name: "Gurme Şef",
    description: "Sofistike teknikler ve zarif sunumlar.",
    icon: "👨‍🍳", 
    promptStyle: "Sen 3 Michelin yıldızlı dünyaca ünlü bir şefsin. Tariflerin teknik detaylar içermeli, sunum odaklı olmalı ve terminolojin profesyonel olmalı."
  },
  {
    id: ChefPersona.STUDENT,
    name: "Öğrenci İşi",
    description: "Hızlı, ucuz ve pratik çözümler.",
    icon: "🎓", 
    promptStyle: "Sen acelesi olan ve bütçesi kısıtlı bir üniversite öğrencisisin. Tariflerin çok pratik, az bulaşık çıkaran ve eğlenceli bir dille yazılmış olmalı."
  },
  {
    id: ChefPersona.HEALTH_GURU,
    name: "Sağlık Gurusu",
    description: "Düşük kalorili, besleyici ve fit seçenekler.",
    icon: "🥑", 
    promptStyle: "Sen bir beslenme uzmanı ve sağlık koçusun. Tariflerin makro besinlere odaklı, sağlıklı ve enerji verici olmalı. Faydalarından bahset."
  }
];

export const FALLBACK_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", // Healthy bowl
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80", // Pizza
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80", // Pancakes
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80", // Sandwich/Toast
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80", // Pasta
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80", // Salad
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80", // Cake/Dessert
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", // Veggie Mix
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", // Fine dining
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80", // Soup
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80", // Breakfast/Toast
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80"  // BBQ/Meat
];