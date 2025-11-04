// app/api/analyze-menu/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai'; // <-- CORRECT IMPORT

// Initialize Gemini with the new SDK
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // <-- CORRECT INITIALIZATION

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('menu');

    if (!file) {
      return NextResponse.json(
        { error: 'No menu image provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const prompt = `Analyze this restaurant menu image and extract all dishes. For each dish, provide:
1. Dish name
2. Price (if visible)
3. A detailed description (2-3 sentences explaining what it is)
4. Main ingredients (list 4-6 key ingredients)

Return the response as a valid JSON array with this exact structure:
[
  {
    "name": "Dish Name",
    "price": "$XX.XX" or null,
    "description": "Detailed description of the dish",
    "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
  }
]

Important: Return ONLY the JSON array, no additional text or markdown formatting.`;

    // --- THIS IS THE CORRECT API CALL ---
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash', // <-- Correct model
      contents: [
        // <-- Correct contents property
        prompt,
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
      ],
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
      // ---------------------
    });

    // --- THIS IS THE CORRECT RESPONSE HANDLING ---
    const response = result.response;

    // --- ADDED SAFETY CHECK ---
    // This prevents the "Cannot read properties of undefined" error
    // if the AI response is blocked by safety settings.
    if (!response) {
      console.error('AI response was empty or blocked.', result);
      throw new Error(
        'AI failed to return a valid response. This may be due to safety settings.'
      );
    }

    let text = response.text();
    // ---------------------------------------------

    // Clean the response (remove markdown code blocks if present)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('--- RAW RESPONSE FROM GEMINI ---');
    console.log(text);
    console.log('--- END OF RAW RESPONSE ---');

    // Parse the JSON response
    let dishes;
    try {
      dishes = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Invalid response format from AI');
    }

    // Fetch images for each dish
    const dishesWithImages = await Promise.all(
      dishes.map(async (dish) => {
        const images = await fetchDishImages(dish.name);
        return { ...dish, images };
      })
    );

    return NextResponse.json({ dishes: dishesWithImages });
  } catch (error) {
    console.error('Error analyzing menu:', error);
    return NextResponse.json(
      { error: 'Failed to analyze menu', details: error.message },
      { status: 500 }
    );
  }
}

// Function to fetch dish images
async function fetchDishImages(dishName) {
  try {
    // Using Unsplash API
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        dishName + ' food'
      )}&per_page=4&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
      console.error('Failed to fetch images from Unsplash');
      return [];
    }

    const data = await response.json();
    return data.results.map((photo) => photo.urls.small);
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
}