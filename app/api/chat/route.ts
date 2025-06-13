import { openai } from "@ai-sdk/openai"
import { StreamingTextResponse } from "ai"

export async function POST(req: Request) {
  try {
    // Parse the request body
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Create a simple completion without streaming for testing
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Using a more widely available model
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error("OpenAI API error:", error)
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status} ${response.statusText}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Return the streaming response
    return new StreamingTextResponse(response.body)
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ error: "An internal server error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
