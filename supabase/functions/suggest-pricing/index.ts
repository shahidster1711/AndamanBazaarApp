import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

interface PriceSuggestion {
  avg_price: number;
  min_price: number;
  max_price: number;
  listing_count: number;
  confidence: 'high' | 'medium' | 'low';
  days_to_sell_avg: number;
  price_distribution: { range: string; count: number }[];
  ai_analysis: string;
}

serve(async (req) => {
  try {
    const { title, category, condition } = await req.json();

    if (!title || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing title or category' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query similar sold listings (last 90 days)
    const { data: similarListings, error: queryError } = await supabase
      .from('listings')
      .select('price, status, created_at, title')
      .eq('category_id', category)
      .eq('status', 'sold')
      .gt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // If not enough data, include active listings too
    let listingsToAnalyze = similarListings || [];
    
    if (listingsToAnalyze.length < 5) {
      const { data: activeListings } = await supabase
        .from('listings')
        .select('price, status, created_at, title')
        .eq('category_id', category)
        .eq('status', 'active')
        .limit(30);
      
      listingsToAnalyze = [...listingsToAnalyze, ...(activeListings || [])];
    }

    // Calculate statistics
    let suggestion: PriceSuggestion;

    if (listingsToAnalyze.length === 0) {
      suggestion = {
        avg_price: 0,
        min_price: 0,
        max_price: 0,
        listing_count: 0,
        confidence: 'low',
        days_to_sell_avg: 0,
        price_distribution: [],
        ai_analysis: 'No similar listings found. Consider researching similar items on other platforms.',
      };
    } else {
      const prices = listingsToAnalyze.map(l => l.price);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Calculate price distribution (quartiles)
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
      const q2 = sortedPrices[Math.floor(sortedPrices.length * 0.5)];
      const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];

      const distribution = [
        { range: `₹${Math.floor(minPrice)} - ₹${Math.floor(q1)}`, count: prices.filter(p => p <= q1).length },
        { range: `₹${Math.floor(q1)} - ₹${Math.floor(q2)}`, count: prices.filter(p => p > q1 && p <= q2).length },
        { range: `₹${Math.floor(q2)} - ₹${Math.floor(q3)}`, count: prices.filter(p => p > q2 && p <= q3).length },
        { range: `₹${Math.floor(q3)} - ₹${Math.floor(maxPrice)}`, count: prices.filter(p => p > q3).length },
      ];

      // Estimate confidence based on sample size
      const confidence = listingsToAnalyze.length >= 20 ? 'high' : 
                        listingsToAnalyze.length >= 10 ? 'medium' : 'low';

      // Estimate days to sell (simplified)
      const daysToSell = listingsToAnalyze
        .filter(l => l.status === 'sold')
        .map(l => {
          const created = new Date(l.created_at);
          const now = new Date();
          return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgDaysToSell = daysToSell.length > 0 
        ? Math.floor(daysToSell.reduce((a, b) => a + b, 0) / daysToSell.length)
        : 7; // Default estimate

      // Generate AI analysis
      let aiAnalysis = '';
      
      if (GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const prompt = `Analyze pricing for this item:
Title: ${title}
Category: ${category}
Condition: ${condition || 'good'}
Market Data:
- Average price: ₹${Math.floor(avgPrice)}
- Range: ₹${Math.floor(minPrice)} - ₹${Math.floor(maxPrice)}
- Sample size: ${listingsToAnalyze.length} listings

Provide a brief pricing recommendation (2-3 sentences) for a seller on an island marketplace. Be encouraging but realistic about local market conditions.`;

          const result = await model.generateContent(prompt);
          aiAnalysis = result.response.text();
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
          aiAnalysis = `Based on ${listingsToAnalyze.length} similar listings, the average price is ₹${Math.floor(avgPrice)}. Consider pricing within this range for quick sale.`;
        }
      } else {
        aiAnalysis = `Based on ${listingsToAnalyze.length} similar listings, the average price is ₹${Math.floor(avgPrice)}. Items in the lower range tend to sell faster.`;
      }

      suggestion = {
        avg_price: Math.floor(avgPrice),
        min_price: Math.floor(minPrice),
        max_price: Math.floor(maxPrice),
        listing_count: listingsToAnalyze.length,
        confidence,
        days_to_sell_avg: avgDaysToSell,
        price_distribution: distribution,
        ai_analysis: aiAnalysis,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestion,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-pricing:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
