import { generateEmbedding } from "@/lib/embeddings"

interface Document {
  id: string
  name: string
  content: string
  chunks?: DocumentChunk[]
}

interface DocumentChunk {
  content: string
  embedding: number[]
}

interface SearchResult {
  documentId: string
  documentName: string
  content: string
  score: number
}

// Process a document by chunking it and generating embeddings
export async function processDocument(document: Document): Promise<Document> {
  try {
    // Split the document into chunks
    const chunks = chunkDocument(document.content)

    // Generate embeddings for each chunk
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk)
          return {
            content: chunk,
            embedding,
          }
        } catch (error) {
          console.error(`Error generating embedding for chunk: ${error}`)
          // Return a fallback embedding (all zeros) for this chunk
          return {
            content: chunk,
            embedding: new Array(1536).fill(0),
          }
        }
      }),
    )

    return {
      ...document,
      chunks: chunksWithEmbeddings,
    }
  } catch (error) {
    console.error("Error processing document:", error)
    throw error
  }
}

// Split a document into chunks
function chunkDocument(text: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = []

  // Simple chunking by paragraphs first
  const paragraphs = text.split(/\n\s*\n/)

  let currentChunk = ""

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max chunk size,
    // save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ""
    }

    // If a single paragraph is larger than the max chunk size,
    // split it into sentences
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = ""
        }

        currentChunk += sentence + " "
      }
    } else {
      currentChunk += paragraph + "\n\n"
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

// Search for relevant document chunks based on a query
export async function searchDocuments(query: string, documents: Document[]): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    let queryEmbedding: number[]
    try {
      queryEmbedding = await generateEmbedding(query)
    } catch (error) {
      console.error("Error generating query embedding:", error)
      // If we can't get an embedding, fall back to simple text search
      return simpleTextSearch(query, documents)
    }

    // Rest of the function remains the same...
    // Collect all chunks from all documents
    const allChunks: Array<{
      documentId: string
      documentName: string
      content: string
      embedding: number[]
    }> = []

    for (const doc of documents) {
      if (doc.chunks) {
        for (const chunk of doc.chunks) {
          allChunks.push({
            documentId: doc.id,
            documentName: doc.name,
            content: chunk.content,
            embedding: chunk.embedding,
          })
        }
      } else {
        // If no chunks are available, use the whole document
        const embedding = await generateEmbedding(doc.content)
        allChunks.push({
          documentId: doc.id,
          documentName: doc.name,
          content: doc.content,
          embedding,
        })
      }
    }

    // Calculate similarity scores
    const results = allChunks.map((chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding)
      return {
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        content: chunk.content,
        score,
      }
    })

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score)

    // Return top results (adjust the number as needed)
    return results.slice(0, 3)
  } catch (error) {
    console.error("Error searching documents:", error)
    // Fall back to simple text search if semantic search fails
    return simpleTextSearch(query, documents)
  }
}

// Add a simple text search as fallback
function simpleTextSearch(query: string, documents: Document[]): SearchResult[] {
  const results: SearchResult[] = []
  const queryTerms = query.toLowerCase().split(/\s+/)

  for (const doc of documents) {
    if (doc.chunks) {
      for (const chunk of doc.chunks) {
        const content = chunk.content.toLowerCase()
        let score = 0

        // Simple term frequency scoring
        for (const term of queryTerms) {
          const regex = new RegExp(term, "gi")
          const matches = content.match(regex)
          if (matches) {
            score += matches.length
          }
        }

        if (score > 0) {
          results.push({
            documentId: doc.id,
            documentName: doc.name,
            content: chunk.content,
            score: score / queryTerms.length, // Normalize score
          })
        }
      }
    } else {
      const content = doc.content.toLowerCase()
      let score = 0

      // Simple term frequency scoring
      for (const term of queryTerms) {
        const regex = new RegExp(term, "gi")
        const matches = content.match(regex)
        if (matches) {
          score += matches.length
        }
      }

      if (score > 0) {
        results.push({
          documentId: doc.id,
          documentName: doc.name,
          content: doc.content,
          score: score / queryTerms.length, // Normalize score
        })
      }
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score)

  // Return top results
  return results.slice(0, 3)
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}
