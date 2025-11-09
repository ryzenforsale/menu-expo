// app/api/analyze-menu/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ORIGIN_ALLOWLIST = new Set([
  process.env.APP_ORIGIN,     // e.g. https://your-app.com
  'http://localhost:3000',    // dev
]);

export async function POST(request) {
  try {
    // ---- Basic CSRF / Origin check ----
    const origin = request.headers.get('origin');
    if (!origin || ![...ORIGIN_ALLOWLIST].filter(Boolean).some((o) => o === origin)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('menu');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No menu image provided' }, { status: 400 });
    }

    // ---- Validate file type & size ----
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }
    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const base64Image = Buffer.from(bytes).toString('base64');

    const prompt = `Analyze this restaurant menu image and extract all dishes. For each dish, provide:
1. Dish name
2. Price (if visible)
3. A detailed description (2-3 sentences explaining what it is)
4. Main ingredients (list 6-7 key ingredients)

Return ONLY a valid JSON array of:
[
  {
    "name": "Dish Name",
    "price": "$XX.XX" or null,
    "description": "Detailed description of the dish",
    "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
  }
]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // or 'gemini-1.5-flash'

    const parts = [
      { text: prompt },
      { inlineData: { mimeType: file.type, data: base64Image } },
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const response = result?.response;
    if (!response) {
      throw new Error('Model returned no response (possibly blocked by safety settings).');
    }

    let text = response.text().trim();
    // Clean stray code fences just in case
    text = text.replace(/```json\s*|\s*```/g, '');

    let dishes;
    try {
      dishes = JSON.parse(text);
      if (!Array.isArray(dishes)) throw new Error('Top-level JSON is not an array.');
    } catch (e) {
      // Log full text for debugging but don’t return to client
      console.error('Failed to parse model JSON:', e, '\nRaw:', text);
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 502 }
      );
    }

    const dishesWithImages = await Promise.all(
      dishes.map(async (dish) => {
        const images = await fetchDishImages(dish?.name ?? '');
        return { ...dish, images };
      })
    );

    return NextResponse.json({ dishes: dishesWithImages });
  } catch (error) {
    console.error('Error analyzing menu:', error);
    // Return generic message; don’t leak internals
    return NextResponse.json(
      { error: 'Failed to analyze menu' },
      { status: 500 }
    );
  }
}

// ---------- PEXELS VERSION ----------
async function fetchDishImages(dishName) {
  if (!dishName) return [];
  try {
    const url = new URL('https://api.pexels.com/v1/search');
    // Adding "food" bias improves relevance
    url.searchParams.set('query', `${dishName} food`);
    url.searchParams.set('per_page', '4');
    url.searchParams.set('orientation', 'landscape'); // nicer for cards

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: process.env.PEXELS_API_KEY, // <-- set this in .env.local
      },
      // cache: 'force-cache',
      // next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('Pexels error:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data?.photos)) return [];

    // Use medium for UI thumbnails; upgrade to large2x/original where needed
    const urls = data.photos
      .map((p) => p?.src?.medium || p?.src?.large || p?.src?.original)
      .filter(Boolean);

    return urls.slice(0, 4);
  } catch (error) {
    console.error('Error fetching images (Pexels):', error);
    return [];
  }
}
