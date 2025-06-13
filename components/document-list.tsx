"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Trash2 } from "lucide-react"

interface Document {
  id: string
  name: string
  content: string
}

interface DocumentListProps {
  documents: Document[]
  onDelete: (id: string) => void
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return <div className="border rounded-lg p-4 text-center text-muted-foreground">No documents uploaded yet</div>
  }

  return (
    <div className="border rounded-lg">
      <div className="p-3 border-b bg-muted/50">
        <h3 className="font-medium">Uploaded Documents ({documents.length})</h3>
      </div>
      <ScrollArea className="h-[200px]">
        <ul className="divide-y">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{doc.name}</span>
                <span className="text-xs text-muted-foreground">({Math.round(doc.content.length / 1000)}KB)</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(doc.id)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}
