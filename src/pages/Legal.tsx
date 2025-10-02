
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
// Markdown support removed to reduce bundle size


type LegalDocument = {
  title: string;
  content: string;
  version: string;
  published_date: string;
}

const Legal = () => {
  const [documents, setDocuments] = useState<Record<string, LegalDocument>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLegalDocuments = async () => {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .filter('is_current', 'eq', true);

      if (error) {
        return;
      }

      const docs = data.reduce((acc, doc) => ({
        ...acc,
        [doc.document_type]: {
          title: doc.title,
          content: doc.content,
          version: doc.version,
          published_date: new Date(doc.published_date).toLocaleDateString(),
        }
      }), {});

      setDocuments(docs);
      setLoading(false);
    };

    fetchLegalDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-white py-24">
          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h1 className="mb-8 text-4xl font-bold text-primary text-center">
                Legal Documents
              </h1>

              <Tabs defaultValue="privacy_policy" className="space-y-6">
                <TabsList className="w-full">
                  <TabsTrigger value="privacy_policy" className="w-1/2">Privacy Policy</TabsTrigger>
                  <TabsTrigger value="terms_of_service" className="w-1/2">Terms of Service</TabsTrigger>
                </TabsList>

                {['privacy_policy', 'terms_of_service'].map((docType) => {
                  const doc = documents[docType];
                  return doc && (
                    <TabsContent key={docType} value={docType} className="mt-6">
                      <div className="rounded-lg border bg-card p-6">
                        <div className="mb-6 flex justify-between items-center border-b pb-4">
                          <h2 className="text-2xl font-semibold">{doc.title}</h2>
                          <div className="text-sm text-muted-foreground">
                            <p>Version {doc.version}</p>
                            <p>Last updated: {doc.published_date}</p>
                          </div>
                        </div>
                        <ScrollArea className="h-[60vh]">
                          <div 
                            className="prose prose-slate max-w-none whitespace-pre-wrap"
                          >
                            {doc.content}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
