import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { schemaEditor } from "../../src/lib/iframeEmbed.ts";
import { Button } from "../../src/components/ui/button.tsx";

const initialSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 },
  },
  required: ["name"],
};

const IframeExample = () => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const basePath = (import.meta.env.PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const editor = schemaEditor(input, {
      iframeUrl: `${basePath}/`,
      height: "560px",
    });

    return () => editor.destroy();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-background/95 jsonjoy">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/" className="gap-2">
                <ArrowLeft size={16} />
                Back to editor
              </Link>
            </Button>
            <a
              href={`${basePath}/iframe-example.html`}
              target="_blank"
              rel="noreferrer"
              className="text-sm inline-flex items-center gap-2 text-primary hover:underline"
            >
              Open plain HTML example
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-xs">
            <h1 className="text-2xl font-semibold">Iframe embed example</h1>
            <p className="text-sm text-muted-foreground mt-2">
              This page initializes the iframe integration using
              <code className="ml-1">schemaEditor(input, options)</code>.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The hidden textarea below is the source of truth. Changes in the iframe
              update this value, and vice versa.
            </p>
          </div>

          <textarea
            ref={inputRef}
            className="schema-editor"
            defaultValue={JSON.stringify(initialSchema)}
            aria-label="Schema JSON"
          />
        </div>
      </div>
    </div>
  );
};

export default IframeExample;