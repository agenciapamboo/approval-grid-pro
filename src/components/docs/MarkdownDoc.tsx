import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, Database } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface MarkdownDocProps {
  title: string;
  content: string;
  breadcrumb: Breadcrumb[];
}

export function MarkdownDoc({ title, content, breadcrumb }: MarkdownDocProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-2">
              {item.href ? (
                <button
                  onClick={() => navigate(item.href)}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
              {index < breadcrumb.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">{title}</h1>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Markdown Content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <article className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-border">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-6 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mt-3 mb-2">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-7">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="ml-4">{children}</li>
                  ),
                  code: ({ inline, children, ...props }: any) =>
                    inline ? (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4"
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                  pre: ({ children }) => (
                    <pre className="mb-4">{children}</pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-border rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-4 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-4 py-2">
                      {children}
                    </td>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-foreground">
                      {children}
                    </strong>
                  ),
                  hr: () => <hr className="my-8 border-border" />,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>

        {/* Related Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Relacionados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => navigate("/docs/secrets-recovery")}
            >
              <Shield className="h-4 w-4" />
              Guia de Secrets
            </Button>
            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => navigate("/docs/backup-guide")}
            >
              <Database className="h-4 w-4" />
              Guia de Backup
            </Button>
            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => navigate("/docs/migration-guide")}
            >
              <FileText className="h-4 w-4" />
              Guia de Migração
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
