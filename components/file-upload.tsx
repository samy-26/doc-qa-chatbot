"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUpload: (documents: Document[]) => void
}

interface Document {
  id: string
  name: string
  content: string
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploadedDocuments: Document[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Only accept text files for now
        if (!file.type.includes("text/")) {
          toast({
            title: "Unsupported file type",
            description: `${file.name} is not a supported file type. Only text files are supported.`,
            variant: "destructive",
          })
          continue
        }

        // Read file content
        const content = await readFileContent(file)

        // Process document
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: file.name,
            content,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to process ${file.name}`)
        }

        const document = await response.json()
        uploadedDocuments.push(document)
      }

      if (uploadedDocuments.length > 0) {
        onUpload(uploadedDocuments)
        toast({
          title: "Documents uploaded",
          description: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your documents.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset the input
      e.target.value = ""
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="file-upload">Upload Documents</Label>
      <div className="flex items-center gap-2">
        <Input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          accept=".txt"
          multiple
          disabled={isUploading}
          className="flex-1"
        />
        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      <p className="text-xs text-muted-foreground">Upload text files (.txt) to ask questions about them</p>
    </div>
  )
}
