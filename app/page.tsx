"use client"

import { useState } from "react"
import { Chat } from "@/components/chat"
import { FileUpload } from "@/components/file-upload"
import { DocumentList } from "@/components/document-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [activeMode, setActiveMode] = useState<"general" | "docs">("general")
  const [documents, setDocuments] = useState<Document[]>([])
  const { toast } = useToast()

  const handleFileUpload = async (newDocuments: Document[]) => {
    try {
      setDocuments((prev) => [...prev, ...newDocuments])
    } catch (error) {
      console.error("Error handling file upload:", error)
      toast({
        title: "Error",
        description: "Failed to process uploaded documents",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDocument = (id: string) => {
    try {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-5xl mx-auto">
      <div className="flex flex-col w-full h-full p-4 space-y-4">
        <h1 className="text-2xl font-bold text-center">AI Chat Assistant</h1>

        <Tabs
          defaultValue="general"
          value={activeMode}
          onValueChange={(value) => setActiveMode(value as "general" | "docs")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Chat</TabsTrigger>
            <TabsTrigger value="docs">Document Q&A</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="w-full">
            <Chat mode="general" />
          </TabsContent>

          <TabsContent value="docs" className="w-full space-y-4">
            <div className="flex flex-col space-y-4">
              <FileUpload onUpload={handleFileUpload} />
              <DocumentList documents={documents} onDelete={handleDeleteDocument} />
            </div>
            <Chat mode="docs" documents={documents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
