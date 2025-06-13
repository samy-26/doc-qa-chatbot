import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { processDocument } from "@/lib/documents"

export async function POST(req: Request) {
  try {
    const { name, content } = await req.json()

    if (!name || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is not set. Using fallback processing.")
      // Return a simplified document without embeddings
      const document = {
        id: uuidv4(),
        name,
        content,
      }
      return NextResponse.json(document)
    }

    // Process the document (chunk and generate embeddings)
    const processedDocument = await processDocument({
      id: uuidv4(),
      name,
      content,
    })

    return NextResponse.json(processedDocument)
  } catch (error) {
    console.error("Document upload error:", error)
    // Return a basic document without embeddings in case of error
    const document = {
      id: uuidv4(),
      name: req.body?.name || "Document",
      content: req.body?.content || "",
      error: "Failed to process document with embeddings",
    }
    return NextResponse.json(document)
  }
}
