import { StreamingTextResponse } from "ai"
import { openai } from "@ai-sdk/openai"
import { searchDocuments } from "@/lib/documents"

interface SearchResult {
  documentId: string
  documentName: string
  content: string
}

export const maxDuration = 30 // 30 seconds max duration

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, documents } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid or missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(JSON.stringify({ error: "No documents provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get the user's question (last message)
    const userQuestion = messages[messages.length - 1].content

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Search for relevant document chunks
    let searchResults: SearchResult[] = []
    try {
      searchResults = await searchDocuments(userQuestion, documents)
    } catch (error) {
      console.error("Search error:", error)
      // Continue with empty search results
    }

    // Prepare context from search results
    const context = searchResults
      .map((result) => `Document: ${result.documentName}\nContent: ${result.content}`)
      .join("\n\n")

    // Prepare sources for citation
    const sources = searchResults.map((result) => ({
      documentId: result.documentId,
      documentName: result.documentName,
      content: result.content,
    }))

    // Create a system prompt that instructs the model to use the context
    const systemPrompt = `
      You are a helpful assistant that answers questions based on the provided documents.
      Use ONLY the information from the documents to answer the question.
      If the documents don't contain the answer, say you don't have enough information.
      Always cite your sources by referring to the document names.
      Be concise and accurate.
    `

    // Create a prompt that includes the context and the user's question
    const augmentedUserPrompt = `
      I need information from the following documents:
      
      ${context}
      
      Based on these documents only, ${userQuestion}
    `

    try {
      // Create the completion request
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Using a more widely available model
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(0, -1),
            { role: "user", content: augmentedUserPrompt },
          ],
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

      if (!response.body) {
        return new Response(JSON.stringify({ error: "No response body from OpenAI" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Create a transformed stream that includes the sources
      const encoder = new TextEncoder()
      const transformedStream = new TransformStream({
        start(controller) {
          // Add sources as a special message at the beginning
          const sourcesJson = JSON.stringify({ sources })
          controller.enqueue(encoder.encode(sourcesJson + "\n"))
        },
        transform(chunk, controller) {
          controller.enqueue(chunk)
        },
      })

      // Return the streaming response with the transform
      return new StreamingTextResponse(response.body.pipeThrough(transformedStream))
    } catch (streamError) {
      console.error("Streaming error:", streamError)
      return new Response(JSON.stringify({ error: "Failed to generate streaming response" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("Document Q&A error:", error)
    return new Response(JSON.stringify({ error: "Failed to process your question" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
