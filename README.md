#♻️ Repurp.AI Backend

An AI-powered backend agent that seamlessly transforms a single URL into multiple, ready-to-publish social media contents. Built for speed and efficiency using edge computing and lightning-fast LLM inference.

🚀 Key Features

    Web Scraping: Extracts clean, readable text from any given URL using the Jina Reader API.

    Prompt Chaining: Utilizes advanced prompt engineering and chaining to break down tasks (e.g., summary -> Twitter thread -> LinkedIn post).

    JSON Structured Output: Guarantees predictable and perfectly formatted JSON responses from the AI, making frontend integration effortless.


🛠️ Tech Stack

    Environment: Supabase Edge Functions (Deno)

    LLM Engine: Groq API (Powered by Llama 3.3 for ultra-low latency)

    Content Extraction: Jina Reader API


⚙️ How It Works

    Input: The user provides a URL (e.g., a blog post or news article).

    Scrape: Jina Reader API fetches and converts the webpage content into clean Markdown.

    Process: The text is sent to Llama 3.3 (via Groq API) using a chained prompt strategy to generate tailored content for platforms like Twitter, LinkedIn, and Instagram.

    Output: The Edge Function returns a structured JSON object containing all the generated social media posts.


💻 Getting Started

Prerequisites

    Supabase CLI installed
    Groq API Key
    Jina Reader API Key (if required by your usage tier)

Setup

    Clone this repository:
    
    Bash
    git clone https://github.com/yourusername/repurp-ai-backend.git
    cd repurp-ai-backend

    Create a .env.local file in the supabase directory and add your API keys:
    Code snippet

    GROQ_API_KEY=your_groq_api_key
    JINA_API_KEY=your_jina_api_key

    Run the Supabase Edge Function locally:
   
    Bash
    supabase start
    supabase functions serve repurp-agent --env-file ./supabase/.env.local

    Deploy to production:
    
    Bash
    supabase functions deploy repurp-agent
