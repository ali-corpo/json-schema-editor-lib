import Editor from "@monaco-editor/react";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { generate as jsfGenerate } from "json-schema-faker";
import type { JsonSchema as JsfSchema } from "json-schema-faker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import { useMonacoTheme } from "../../hooks/use-monaco-theme.ts";
import type { JSONSchema } from "../../types/jsonSchema.ts";

/** @public */
export interface JsonSampleGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: JSONSchema;
}

/** @public */
export function JsonSampleGenerator({
  open,
  onOpenChange,
  schema,
}: JsonSampleGeneratorProps) {
  const [generatedJson, setGeneratedJson] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentTheme, defineMonacoThemes, defaultEditorOptions } =
    useMonacoTheme();

  const generate = useCallback(
    async (forceDifferent = false) => {
      setIsGenerating(true);
      try {
        const previous = generatedJson;
        const maxAttempts = forceDifferent ? 10 : 1;
        let next = previous;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const seed = Math.floor(Math.random() * 2_147_483_647);
          const sample = await jsfGenerate(schema as unknown as JsfSchema, {
            seed,
            alwaysFakeOptionals: true,
            optionalsProbability: 1,
            fillProperties: true,
          });
          next = JSON.stringify(sample, null, 2);
          if (!forceDifferent || !previous || next !== previous) break;
        }

        setGeneratedJson(next);
      } catch (e) {
        setGeneratedJson(
          `// Error generating sample:\n// ${(e as Error).message}`,
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [schema, generatedJson],
  );

  // Auto-generate when the dialog opens
  useEffect(() => {
    if (open && !generatedJson) {
      void generate(false);
    }
  }, [open, generatedJson, generate]);

  // Re-generate when the schema changes while the dialog is open
  useEffect(() => {
    if (open) {
      setGeneratedJson("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col jsonjoy">
        <DialogHeader>
          <DialogTitle>Generated Sample JSON</DialogTitle>
          <DialogDescription>
            A sample JSON document that conforms to the current schema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden gap-3 py-2">
          <div className="border rounded-md overflow-hidden">
            {isGenerating ? (
              <div className="flex items-center justify-center h-[300px] bg-secondary/30">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Editor
                height="300px"
                defaultLanguage="json"
                value={generatedJson}
                beforeMount={(monaco) => defineMonacoThemes(monaco)}
                loading={
                  <div className="flex items-center justify-center h-full w-full bg-secondary/30">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
                options={{ ...defaultEditorOptions, readOnly: true }}
                theme={currentTheme}
              />
            )}
          </div>

          <div className="flex justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void generate(true)}
              disabled={isGenerating}
              className="gap-2"
            >
              <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} />
              Regenerate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
