"use client"

import type React from "react"

import { useChat } from "@ai-sdk/react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Loader2, Send, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Document {
  id: string
  name: string
  content: string
  chunks?: { content: string; embedding: number[] }[]
}

interface ChatProps {
  mode: "general" | "docs"
  documents?: Document[]
}

interface MessageWithSource {
  content: string
  sources?: {
    documentId: string
    documentName: string
    content: string
  }[]
}

export function Chat({ mode, documents = [] }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatLoading,
    error: chatError,
    reload,
  } = useChat({
    api: mode === "general" ? "/api/chat" : "/api/docs-qa",
    body: mode === "docs" ? { documents } : undefined,
    onResponse: (response) => {
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
      }
      setIsLoading(false)
      setError(null)
    },
    onError: (error) => {
      console.error("Chat error:", error)
      setIsLoading(false)
      setError(error.message || "An error occurred while processing your request")
      toast({
        title: "Error",
        description: error.message || "Failed to get a response. Please try again.",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim()) {
      setIsLoading(true)
      setError(null)
      try {
        handleSubmit(e)
      } catch (err) {
        console.error("Error submitting form:", err)
        setIsLoading(false)
        setError("Failed to send message. Please try again.")
      }
    }
  }

  const handleRetry = () => {
    setError(null)
    reload()
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {mode === "general" ? "Ask me anything!" : "Upload documents and ask questions about them"}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const typedMessage = message as MessageWithSource
              return (
                <div
                  key={message.id}
                  className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
                >
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <Avatar className="h-8 w-8">
                      <div className="flex h-full items-center justify-center bg-primary text-primary-foreground text-sm font-medium">
                        {message.role === "user" ? "U" : "AI"}
                      </div>
                    </Avatar>
                    <Card
                      className={cn("p-3", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>

                      {typedMessage.sources && typedMessage.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold mb-1">Sources:</p>
                          {typedMessage.sources.map((source, index) => (
                            <div key={index} className="text-xs bg-background/50 p-2 rounded mt-1">
                              <p className="font-medium">{source.documentName}</p>
                              <p className="text-muted-foreground">{source.content.substring(0, 150)}...</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )
            })
          )}
          {error && (
            <div className="flex items-center justify-center p-4">
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={mode === "general" ? "Ask a question..." : "Ask about your documents..."}
            disabled={isLoading || (mode === "docs" && documents.length === 0)}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim() || (mode === "docs" && documents.length === 0)}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {mode === "docs" && documents.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">Upload documents to start asking questions</p>
        )}
      </div>
    </div>
  )
}
