import type { JSONSchema } from "../types/jsonSchema.ts";

export interface SchemaEditorOptions {
  iframeUrl?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

export interface SchemaEditorController {
  input: HTMLInputElement | HTMLTextAreaElement;
  iframe: HTMLIFrameElement;
  destroy: () => void;
  loadSchema: (schema: JSONSchema) => void;
}

const DEFAULT_IFRAME_URL =
  "https://ali-corpo.github.io/json-schema-editor-lib/";
const DEFAULT_HEIGHT = "560px";
const DEFAULT_SCHEMA: JSONSchema = {
  type: "object",
  properties: {},
};

const initializedInputs = new WeakSet<HTMLInputElement | HTMLTextAreaElement>();

function parseSchema(raw: string): JSONSchema {
  if (!raw.trim()) return DEFAULT_SCHEMA;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as JSONSchema;
    }
  } catch {
    // Ignore invalid JSON and fallback to default schema.
  }
  return DEFAULT_SCHEMA;
}

function normalizeSchema(raw: JSONSchema): string {
  return JSON.stringify(raw, null, 2);
}

function postSchema(target: Window, schema: JSONSchema) {
  target.postMessage({ type: "jsonjoy:loadSchema", schema }, "*");
}

function postReadOnly(target: Window, readOnly: boolean) {
  target.postMessage({ type: "jsonjoy:setReadOnly", readOnly }, "*");
}

function clearTimer(timerId: number | undefined) {
  if (timerId !== undefined) {
    window.clearInterval(timerId);
  }
}

function getOrigin(url: string): string | undefined {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return undefined;
  }
}

export function schemaEditor(
  element: HTMLElement,
  options: SchemaEditorOptions = {},
): SchemaEditorController {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    throw new TypeError("schemaEditor() expects an input or textarea element");
  }

  if (initializedInputs.has(element)) {
    throw new Error("This input is already bound to a schema editor iframe");
  }

  const input = element;
  const iframe = document.createElement("iframe");
  const iframeUrl =
    options.iframeUrl ?? input.dataset.iframeUrl ?? DEFAULT_IFRAME_URL;
  const iframeOrigin = getOrigin(iframeUrl);
  const height = options.height ?? input.dataset.height ?? DEFAULT_HEIGHT;
  const readOnly = options.readOnly ?? input.dataset.readonly === "true";

  iframe.src = iframeUrl;
  iframe.title = "JSONJoy Schema Editor";
  iframe.style.width = "100%";
  iframe.style.height = height;
  iframe.style.border = "0";
  iframe.className =
    options.className ?? input.dataset.iframeClass ?? "schema-editor-iframe";

  input.hidden = true;
  input.setAttribute("aria-hidden", "true");
  input.insertAdjacentElement("afterend", iframe);
  initializedInputs.add(input);

  let suppressInputSync = false;
  let iframeReady = false;
  let bootstrapTimer: number | undefined;
  let valueWatchTimer: number | undefined;
  let bootstrapAttempts = 0;
  let lastSeenInputValue = input.value;

  const postStateToIframe = () => {
    const target = iframe.contentWindow;
    if (!target) return;
    postReadOnly(target, readOnly);
    postSchema(target, parseSchema(input.value));
  };

  const startBootstrapSync = () => {
    clearTimer(bootstrapTimer);
    bootstrapAttempts = 0;
    bootstrapTimer = window.setInterval(() => {
      if (iframeReady || bootstrapAttempts >= 20) {
        clearTimer(bootstrapTimer);
        bootstrapTimer = undefined;
        return;
      }
      bootstrapAttempts += 1;
      postStateToIframe();
    }, 250);
  };

  const syncInputToIframe = () => {
    const target = iframe.contentWindow;
    if (!target || suppressInputSync) return;
    postSchema(target, parseSchema(input.value));
  };

  const syncInputToIframeIfValueChanged = () => {
    if (suppressInputSync) return;
    if (input.value === lastSeenInputValue) return;
    lastSeenInputValue = input.value;
    syncInputToIframe();
  };

  const handleIframeLoad = () => {
    iframeReady = false;
    postStateToIframe();
    startBootstrapSync();
  };

  const handleInputChanged = () => {
    lastSeenInputValue = input.value;
    syncInputToIframe();
  };

  const handleMessage = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== "object") return;
    if (typeof event.data.type !== "string") return;

    const fromIframeWindow = event.source === iframe.contentWindow;
    const fromIframeOrigin =
      iframeOrigin !== undefined && event.origin === iframeOrigin;
    if (!fromIframeWindow && !fromIframeOrigin) return;

    if (event.data.type === "jsonjoy:ready") {
      iframeReady = true;
      clearTimer(bootstrapTimer);
      bootstrapTimer = undefined;
      postStateToIframe();
      return;
    }

    if (event.data.type !== "jsonjoy:schemaChanged") return;
    if (!event.data.schema || typeof event.data.schema !== "object") return;
    const schema = event.data.schema as JSONSchema;
    suppressInputSync = true;
    input.value = normalizeSchema(schema);
    lastSeenInputValue = input.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    suppressInputSync = false;
  };

  iframe.addEventListener("load", handleIframeLoad);
  input.addEventListener("input", handleInputChanged);
  input.addEventListener("change", handleInputChanged);
  window.addEventListener("message", handleMessage);
  valueWatchTimer = window.setInterval(syncInputToIframeIfValueChanged, 150);

  return {
    input,
    iframe,
    destroy: () => {
      clearTimer(bootstrapTimer);
      clearTimer(valueWatchTimer);
      iframe.removeEventListener("load", handleIframeLoad);
      input.removeEventListener("input", handleInputChanged);
      input.removeEventListener("change", handleInputChanged);
      window.removeEventListener("message", handleMessage);
      initializedInputs.delete(input);
      iframe.remove();
      input.hidden = false;
      input.removeAttribute("aria-hidden");
    },
    loadSchema: (schema: JSONSchema) => {
      input.value = normalizeSchema(schema);
      lastSeenInputValue = input.value;
      syncInputToIframe();
    },
  };
}

export function autoInitSchemaEditors(
  selector = ".schema-editor",
  options?: SchemaEditorOptions,
): SchemaEditorController[] {
  if (typeof document === "undefined") return [];

  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const editors: SchemaEditorController[] = [];

  for (const element of elements) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      if (!initializedInputs.has(element)) {
        editors.push(schemaEditor(element, options));
      }
    }
  }

  return editors;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      autoInitSchemaEditors();
    });
  } else {
    autoInitSchemaEditors();
  }
}
