// Generate embedding for a text using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check if API key is available
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("OpenAI API key is not set")
      // Return a fallback embedding (all zeros) if API key is missing
      return new Array(1536).fill(0)
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API error details:", errorData)
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    // Return a fallback embedding (all zeros) in case of error
    return new Array(1536).fill(0)
  }
}
