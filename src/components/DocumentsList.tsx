import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Trash2, RefreshCw, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  processing_status: string;
  document_type: string;
}

interface DocumentsListProps {
  refreshTrigger?: number;
  onDocumentDeleted?: () => void;
}

export const DocumentsList = ({ refreshTrigger, onDocumentDeleted }: DocumentsListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("document_type", "resume")
        .order("upload_date", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeletingId(documentToDelete.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract file path from URL
      const urlParts = documentToDelete.file_url.split("/");
      const filePath = `${user.id}/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: "Your resume has been deleted successfully",
      });

      fetchDocuments();
      onDocumentDeleted?.();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleReanalyze = async (doc: Document) => {
    setReanalyzingId(doc.id);
    try {
      // Update status to processing
      const { error: updateError } = await supabase
        .from("documents")
        .update({ processing_status: "processing" })
        .eq("id", doc.id);

      if (updateError) throw updateError;

      // Extract file path from URL
      const urlParts = doc.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/"); // user_id/filename.pdf

      // Call edge function to reprocess
      const { error: functionError } = await supabase.functions.invoke("process-cv", {
        body: { filePath, fileName: doc.file_name }
      });

      if (functionError) throw functionError;

      toast({
        title: "Reanalysis started",
        description: "Your resume is being reanalyzed",
      });

      fetchDocuments();
    } catch (error: any) {
      console.error("Error reanalyzing document:", error);
      toast({
        title: "Reanalysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReanalyzingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      processing: { label: "Processing", variant: "default" as const },
      completed: { label: "Completed", variant: "default" as const },
      failed: { label: "Failed", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        {status === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Resumes</CardTitle>
          <CardDescription>
            Manage your uploaded resume files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No resumes uploaded</h3>
              <p className="text-muted-foreground">
                Upload your first resume to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(doc.upload_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(doc.processing_status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReanalyze(doc)}
                      disabled={reanalyzingId === doc.id || doc.processing_status === "processing"}
                      title="Re-analyze"
                    >
                      {reanalyzingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(doc)}
                      disabled={deletingId === doc.id}
                      title="Delete"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
