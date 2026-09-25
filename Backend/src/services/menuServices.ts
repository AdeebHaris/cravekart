const pureVegKeywords = [
  'krishna', 'sree krishna', 'sri krishna', 'udupi', 'udipi', 'saravana',
  'saravana bhavan', 'govinda', 'govindas', 'sattvik', 'satvik', 'jain',
  'shiva', 'swagath', 'ananda', 'ananda bhavan', 'balaji', 'bhavan',
  'pure veg', 'pure vegetarian', 'vegetarian', 'buddha', 'iskcon',
  'sai', 'giri', 'shanti', 'lakshmi', 'laxmi', 'ram', 'rama', 'sree ram',
  'saravanaa'
];

const isPureVegRestaurant = (name: string): boolean => {
  const lower = name.toLowerCase();
  return pureVegKeywords.some(keyword => lower.includes(keyword));
};

export const fetchMenuFromGroq = async (restaurantName: string) => {
  const isPureVeg = isPureVegRestaurant(restaurantName);

  const priceRulesPrompt = `
STRICT REALISTIC PRICING FRAMEWORK (KOCHI, INDIA / INR):
Assign realistic local market prices in INR based on dish category:
- Breads & Plain Staples (Porotta, Parotta, Idiyappam, Appam, Chapati, Roti, Pathiri, Puttu): ₹10 to ₹20 per piece (NEVER price plain breads or staples above ₹25!).
- Stuffed / Premium Breads (Naan, Kulcha, Bhature, Stuffed Paratha): ₹30 to ₹60.
- Basic Beverages (Chai, Coffee, Lime Juice, Sharbat, Soda): ₹15 to ₹35.
- Premium Drinks & Shakes (Milkshakes, Smoothies, Lassi, Mojitos): ₹50 to ₹110.
- Desserts & Sweets (Ice Cream, Gulab Jamun, Sizzling Brownie, Payasam, Kulfi, Cake, Pudding): ₹40 to ₹120.
- Snacks & Starters (Samosa, Vada, Cutlet, Fries, Gobi Manchurian): ₹25 to ₹110.
- Light Breakfast (Idli, Poori, Dosa, Upma): ₹35 to ₹80.
- Main Course Curries (Dal, Paneer Butter Masala, Chicken Curry, Veg Kurma): ₹110 to ₹230.
- Biryani, Meals & Special Non-Veg (Chicken Biryani, Beef Roast, Fish Fry, Prawns): ₹140 to ₹280.

BE VIGILANT: Double check the price of every item before returning. Plain breads and basic teas must NEVER be priced like full meals or main courses.
`;

  const promptContent = isPureVeg
    ? `Generate a realistic 100% PURE VEGETARIAN menu for "${restaurantName}" in Kochi, India.

MANDATORY RULES FOR PURE VEGETARIAN RESTAURANT:
1. STRICTLY PURE VEGETARIAN: "${restaurantName}" is a pure vegetarian restaurant. ALL items generated MUST be 100% Vegetarian ("veg": true).
2. DISHES TO INCLUDE: South Indian & North Indian veg items like Masala Dosa, Idli, Medu Vada, Ghee Roast, Poori Bhaji, Paneer Butter Masala, Dal Tadka, Veg Biryani, Chapati, Parotta.
3. DRINKS & DESSERTS REQUIRED: Include 4 to 6 items of drinks and desserts (e.g. Filter Coffee, Masala Chai, Mango Lassi, Fresh Lime Juice, Milkshakes, Ice Cream, Gulab Jamun, Payasam, Kulfi) marked as "veg": true.
4. ABSOLUTELY NO MEAT: DO NOT include any Chicken, Beef, Mutton, Fish, Seafood, Pork, or Egg items under any circumstances.
5. ${priceRulesPrompt}
6. OUTPUT FORMAT: Respond ONLY with a valid JSON array. No markdown formatting, no code block backticks, no extra text.
Format: [{ "id": 1, "name": "...", "price": 15, "description": "...", "veg": true }]

Generate 14 to 18 items for "${restaurantName}".`
    : `Generate a realistic food and drink menu for a restaurant named "${restaurantName}" in Kochi, India.

RULES FOR GENERAL RESTAURANT:
1. MIXED MENU: For cafes, bistros, or general restaurants (like "${restaurantName}"), generate a realistic mix of BOTH Non-Vegetarian items ("veg": false — e.g. Chicken, Beef, Fish, Seafood, Eggs) AND Vegetarian items ("veg": true).
2. DRINKS & DESSERTS REQUIRED: Include a dedicated selection of 4 to 6 drinks and desserts (e.g. Cold Coffee, Fresh Juices, Milkshakes, Ice Cream, Sizzling Brownie, Gulab Jamun, Payasam) marked as "veg": true.
3. DISH MARKING: Any item containing Chicken, Beef, Fish, Seafood, Prawns, Mutton, Pork, Bacon, or Egg MUST be marked as "veg": false.
4. ${priceRulesPrompt}
5. OUTPUT FORMAT: Respond ONLY with a valid JSON array. No markdown formatting, no code block backticks, no extra text.
Format: [{ "id": 1, "name": "...", "price": 15, "description": "...", "veg": true }]

Generate 14 to 18 items for "${restaurantName}".`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: promptContent }],
      temperature: 0.5,
    })
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    console.error('Groq API error response:', JSON.stringify(data));
    throw new Error(data.error?.message || 'Groq API returned an unexpected response');
  }

  const text = data.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  const nonVegPattern = /\b(chicken|beef|mutton|pork|fish|prawn|prawns|shrimp|seafood|bacon|ham|egg|eggs|steak|pepperoni|meat|tuna|salmon|duck|crab|squid)\b/i;

  const sanitized = parsed.map((item: any) => {
    let finalItem = { ...item };

    if (isPureVeg) {
      const textContent = `${finalItem.name} ${finalItem.description || ''}`;
      if (nonVegPattern.test(textContent)) {
        return {
          ...finalItem,
          name: 'Special Paneer Butter Masala',
          description: 'Rich and creamy cottage cheese curry cooked with aromatic spices',
          veg: true,
          price: Math.min(Number(finalItem.price) || 180, 220)
        };
      }
      return { ...finalItem, veg: true };
    }

    const textContent = `${finalItem.name} ${finalItem.description || ''}`;
    if (nonVegPattern.test(textContent)) {
      return { ...finalItem, veg: false };
    }
    return finalItem;
  });

  return sanitized;
};

export const generateItemDescriptions = async (
  itemName: string,
  isVeg: boolean,
  restaurantName: string
): Promise<string[]> => {
  const vegLabel = isVeg ? 'vegetarian' : 'non-vegetarian';

  const systemPrompt = `You are a professional menu copywriter for a food delivery platform. Your job is to write short, vivid, mouth-watering dish descriptions that make people want to order immediately.

Your descriptions are:
- Specific to the dish — they describe how it tastes, feels, smells, or looks
- 2 sentences, around 35-50 words total
- Written in plain English — no flowery language, no hotel-brochure tone
- Never mention the restaurant name
- Never start with cliché marketing words like "Savor", "Indulge", "Experience", "Delight", or "Enjoy"
- Each of the 4 descriptions MUST start with a completely different opening word from each other (e.g. start directly with sensory words like "Crispy", "Rich", "Slow-cooked", "Tossed", "Juicy")
- Each description has a clearly different personality: one comforting, one bold, one fresh, one indulgent

You ONLY respond with a valid JSON array of 4 strings. No markdown, no explanation.`;

  const userPrompt = `Write 4 descriptions for: "${itemName}" (${vegLabel} dish)

Here are examples of the style and quality I want (these are for different dishes, just to show the format):
- "Crispy, golden-fried patties with a soft, spiced interior that melts in your mouth. Served hot — the kind of snack you can't stop at one."
- "Smoky, charred edges and a juicy center packed with bold seasoning. Every bite hits deep and leaves you reaching for another."
- "Light and fragrant, this dish is clean on the palate but full of character. A wholesome option that doesn't compromise on flavor."
- "Rich, slow-cooked and deeply aromatic — the kind of dish that fills the room with its smell before it even reaches the table."

Now write 4 in that same style for "${itemName}" (${vegLabel}). Return ONLY a JSON array of 4 strings.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
    }),
  });

  const data = await response.json();

  if (!data.choices?.[0]) {
    throw new Error(data.error?.message || 'Groq API error');
  }

  const text = data.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed: string[] = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid response format from AI');
  }

  return parsed.slice(0, 4);
};


export interface AISearchIntent {
  keywords: string[];
  veg: boolean | null;
  maxPrice: number | null;
  restaurantName?: string | null;
  summary: string;
  isValidQuery?: boolean;
}

const STOP_WORDS = new Set([
  'veg', 'vegetarian', 'nonveg', 'non-veg', 'non',
  'dish', 'dishes', 'food', 'item', 'items', 'stuff',
  'under', 'below', 'above', 'over', 'cheap', 'price', 'budget',
  'rs', 'rupees', 'inr', 'near', 'me', 'best', 'good', 'top', 'tasty', 'delicious',
  'around', 'less', 'than', 'more', 'for', 'with', 'and', 'or', 'in', 'a', 'the'
]);

export const parseSearchQueryWithGroq = async (userQuery: string): Promise<AISearchIntent> => {
  const trimmed = userQuery.trim();

  const isRepeatedChar = /^(.)\1{4,}$/i.test(trimmed);
  const isNoVowelsLongWord = trimmed.length > 5 && !/[aeiouy]/i.test(trimmed);
  const isNoiseOnly = /^[^a-zA-Z0-9]+$/.test(trimmed);

  if (isRepeatedChar || isNoVowelsLongWord || isNoiseOnly) {
    return {
      keywords: [],
      veg: null,
      maxPrice: null,
      restaurantName: null,
      summary: `No results found for "${trimmed}"`,
      isValidQuery: false
    };
  }

  const prompt = `You are a search intent parser for a food delivery platform.

Analyze this food search query: "${userQuery}"

Task:
1. Determine if the query is a VALID, MEANINGFUL query related to food, dishes, restaurants, dining, cuisines, or prices.
   - If the query is random gibberish (e.g. "asdfghjk", "ggggggg", "123123123"), completely unrelated nonsense, or random keys: Set "isValidQuery": false.
   - Otherwise: Set "isValidQuery": true.

2. Identify if the query is searching for a SPECIFIC RESTAURANT, HOTEL, OR BRAND NAME (e.g. "Trident", "Saravana Bhavan", "Dominos", "KFC").
   - If YES: Set "restaurantName" to that name. Set "keywords": [the restaurant name].
   - If NO: Set "restaurantName": null.
   - NEVER classify generic terms like "non veg", "veg", "vegetarian", "food", "drinks" as a restaurantName.

3. Extract relevant food/dish/taste/flavor keywords or synonyms.
   - CRITICAL RULE: ONLY extract dish/food keywords if the user EXPLICITLY mentioned a specific dish, cuisine, or protein (e.g. "biryani", "pizza", "chicken").
   - IF THE QUERY ONLY CONTAINS DIET OR PRICE FILTERS (e.g. "non veg items under 300", "veg food below 200", "under 100"), STRICTLY RETURN "keywords": [].
   - NEVER include generic filter words like "veg", "non-veg", "food", "item", "cheap", "price", "rs".
   - If a specific meat/protein (e.g. "chicken", "beef", "mutton", "pork", "fish", "prawn") is mentioned, strictly include ONLY that protein.

4. Identify veg requirement (true/false/null).
5. Extract maximum price budget in INR if mentioned, otherwise null.
6. Write a 1-sentence user-friendly summary (e.g. "Searching for burgers" or "No results found for invalid input").

Respond ONLY with a valid JSON object matching this schema:
{
  "isValidQuery": true | false,
  "restaurantName": string | null,
  "keywords": ["word1", "word2"],
  "veg": true | false | null,
  "maxPrice": number | null,
  "summary": "string"
}

No markdown tags, no code block backticks, no extra text.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!data.choices?.[0]) {
      throw new Error('Groq API failed');
    }

    const text = data.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed: AISearchIntent = JSON.parse(cleaned);

    if (parsed.isValidQuery === false) {
      return {
        keywords: [],
        veg: null,
        maxPrice: null,
        restaurantName: null,
        summary: `No results found for "${userQuery}"`,
        isValidQuery: false
      };
    }

    const categorySearchTerms = ['burger', 'pizza', 'biryani', 'shawarma', 'dosa', 'pasta', 'noodle', 'momos', 'sandwich', 'shake', 'juice', 'ice cream'];
    const lowerQuery = userQuery.toLowerCase();
    const isCategorySearch = categorySearchTerms.some(term => lowerQuery.includes(term));
    const genericBroadWords = new Set(['beef', 'chicken', 'mutton', 'pork', 'fish', 'prawn', 'meat', 'egg', 'roast', 'fry', 'curry', 'gravy', 'masala', 'rice', 'bread', 'sauce']);

    const rawKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : userQuery.split(/\s+/);
    let filteredKeywords = rawKeywords
      .map((k: string) => String(k).toLowerCase().trim())
      .filter((k: string) => {
        const clean = k.replace(/[-_]/g, '');
        return k.length > 1 && !STOP_WORDS.has(k) && !STOP_WORDS.has(clean) && !/^\d+$/.test(k);
      });

    if (parsed.maxPrice !== null || parsed.veg !== null) {
      filteredKeywords = filteredKeywords.filter(k => lowerQuery.includes(k));
    }

    if (isCategorySearch) {
      filteredKeywords = filteredKeywords.filter(k => !genericBroadWords.has(k) || lowerQuery.includes(k));
    }

    let cleanRestaurantName = typeof parsed.restaurantName === 'string' && parsed.restaurantName.trim() ? parsed.restaurantName.trim() : null;
    if (cleanRestaurantName) {
      const lowerName = cleanRestaurantName.toLowerCase();
      if (['veg', 'vegetarian', 'nonveg', 'non veg', 'non-veg', 'non', 'food', 'dishes', 'item', 'items', 'drinks', 'desserts'].includes(lowerName)) {
        cleanRestaurantName = null;
      }
    }

    return {
      keywords: filteredKeywords,
      veg: typeof parsed.veg === 'boolean' ? parsed.veg : null,
      maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null,
      restaurantName: cleanRestaurantName,
      summary: parsed.summary || `Results for "${userQuery}"`,
      isValidQuery: true
    };
  } catch (error) {
    console.error('Error parsing search with Groq, fallback to basic:', error);
    const matchPrice = userQuery.match(/(?:under|below|less than|rs\.?|₹)\s*(\d+)/i) || userQuery.match(/(\d+)\s*(?:rs|rupees|inr)?/i);
    const maxPrice = matchPrice ? Number(matchPrice[1]) : null;

    const fallbackKeywords = userQuery
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    return {
      keywords: fallbackKeywords,
      veg: null,
      maxPrice: maxPrice,
      restaurantName: null,
      summary: maxPrice ? `Searching for food items under ₹${maxPrice}` : `Searching for "${userQuery}"`,
      isValidQuery: fallbackKeywords.length > 0 || maxPrice !== null
    };
  }
};
