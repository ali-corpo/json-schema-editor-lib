import { CheckCircle, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { exampleSchema } from "../../demo/utils/schemaExample.ts";
import { JsonSampleGenerator } from "../../src/components/features/JsonSampleGenerator.tsx";
import { JsonValidator } from "../../src/components/features/JsonValidator.tsx";
import JsonSchemaEditor from "../../src/components/SchemaEditor/JsonSchemaEditor.tsx";
import { Button } from "../../src/components/ui/button.tsx";
import { en } from "../../src/i18n/locales/en.ts";
import { TranslationContext } from "../../src/i18n/translation-context.ts";
import type { JSONSchema } from "../../src/types/jsonSchema.ts";

/** True when this page is embedded inside an iframe */
const isIframe = window.parent !== window;

const Index = () => {
  const [schema, setSchema] = useState<JSONSchema>(exampleSchema);
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [translation] = useState(en);

  // Incoming: { type: 'jsonjoy:loadSchema', schema: JSONSchema }
  // Incoming: { type: 'jsonjoy:setReadOnly', readOnly: boolean }
  // Outgoing: { type: 'jsonjoy:schemaChanged', schema: JSONSchema }
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === "jsonjoy:loadSchema") {
        const incoming = event.data.schema;
        if (incoming && typeof incoming === "object") {
          setSchema(incoming as JSONSchema);
        }
      } else if (event.data.type === "jsonjoy:setReadOnly") {
        setReadOnly(Boolean(event.data.readOnly));
      }
    };
    window.addEventListener("message", handler);
    if (isIframe) {
      window.parent.postMessage({ type: "jsonjoy:ready" }, "*");
    }
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSchemaChange = (next: JSONSchema) => {
    setSchema(next);
    if (isIframe) {
      window.parent.postMessage(
        { type: "jsonjoy:schemaChanged", schema: next },
        "*",
      );
    }
  };



  return (
    <TranslationContext value={translation}>
      <div className="min-h-screen bg-linear-to-b from-background to-background/95 relative overflow-hidden jsonjoy">
        <div className="container mx-auto px-0 sm:px-2 md:px-6 lg:px-8 pt-8 pb-16 relative z-10">
          <div className="max-w-4xl mx-auto lg:max-w-none">
            <JsonSchemaEditor
              schema={schema}
              readOnly={readOnly}
              setSchema={handleSchemaChange}
              className="shadow-lg animate-in border-border/50 backdrop-blur-xs"
              visualToolbarActions={
                <>
                  
                  <Button
                    variant="outline"
                    onClick={() => setGenerateDialogOpen(true)}
                    className="gap-2"
                    size="sm"
                  >
                    <Shuffle size={16} />
                    Example JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setValidateDialogOpen(true)}
                    className="gap-2"
                    size="sm"
                  >
                    <CheckCircle size={16} />
                    Check JSON
                  </Button>
                  
                </>
              }
            />
          </div>

          <JsonValidator
            open={validateDialogOpen}
            onOpenChange={setValidateDialogOpen}
            schema={schema}
          />

          <JsonSampleGenerator
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            schema={schema}
          />
        </div>
      </div>
    </TranslationContext>
  );
};

export default Index;
