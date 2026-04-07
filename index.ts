import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Ambil data dari Frontend (Hanya URL dan Platforms, TIDAK PERLU user_token lagi)
    const { source_url, platforms } = await req.json()

    if (!source_url || !platforms) {
      throw new Error('Missing source_url or platforms in JSON body')
    }

    // 2. BACA TIKET/Token DARI HEADER (Bukan dari Body)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header in request')
    }

    // 3. Inisialisasi Supabase Client pakai Token dari Header
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } } // Langsung pakai authHeader
    )

    // 4. SCRAPING: Ambil teks dari URL pakai Jina Reader
    const jinaResponse = await fetch(`https://r.jina.ai/${source_url}`)
    if (!jinaResponse.ok) throw new Error('Failed to scrape URL. Is the URL valid?')
    const rawText = await jinaResponse.text()

    // Batasi teks agar tidak melewati limit token gratisan Gemini
    const truncatedText = rawText.substring(0, 12000) 

    // 5. AI PROCESSING: Kirim ke Google Gemini
        // 5. AI PROCESSING: Kirim ke Groq (Menggunakan format OpenAI API)
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    // Prompt yang sama, tapi kita pecah jadi System dan User agar Llama 3 lebih patuh
    const systemPrompt = "Kamu adalah expert Social Media Manager. Kamu WAJIB mengembalikan output secara eksklusif dalam format JSON yang valid. Jangan tambahkan markdown atau text apapun di luar JSON. Format: {\"results\": [{\"platform\": \"nama_platform\", \"content\": \"isi konten\"}]}"
    
    const userPrompt = `Ubah teks berikut menjadi konten untuk platform: ${platforms.join(', ')}. Gunakan bahasa yang sama dengan sumber. \n\nTEKS SUMBER:\n${truncatedText}`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Model Llama 3 terbaik di Groq
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }, // Memaksa output JSON murni
        temperature: 0.7
      })
    })

    const groqData = await groqResponse.json()

    // Error handling jika limit Groq kebaca
    if (groqData.error) {
      throw new Error(groqData.error.message)
    }

    // Ambil string JSON dari response Groq
    const aiJsonString = groqData.choices[0].message.content
    const parsedAIResult = JSON.parse(aiJsonString)

    // 6. SAVE TO DB (DI-KOMEN DULU UNTUK TESTING POSTMAN)
    // Karena kita pakai Anon Key di Postman, kita tidak punya User ID yang valid.
    // Nanti di Minggu 2, saat Frontend ada Login Google, hapus komentar di bawah ini.
    
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Invalid user token')

    const { data, error } = await supabase
      .from('contents')
      .insert([
        { 
          user_id: userData.user.id, 
          source_url: source_url, 
          platforms: platforms, 
          generated_json: parsedAIResult 
        }
      ])
      .select()

    if (error) throw error
    

    // Return sukses langsung dari hasil AI (tanpa simpan ke DB dulu)
    return new Response(JSON.stringify({ success: true, data: { generated_json: parsedAIResult } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
