import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Select from "react-select";
import { BsStars } from "react-icons/bs";
import { HiOutlineCode } from "react-icons/hi";
import Editor from "@monaco-editor/react";
import { IoCopy } from "react-icons/io5";
import { PiExportBold } from "react-icons/pi";
import { ImNewTab } from "react-icons/im";
import { FiRefreshCcw } from "react-icons/fi";
import { GoogleGenAI } from "@google/genai";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

// Vite: key must be set as VITE_GOOGLE_AI_API_KEY (in .env locally,
// and in Vercel -> Settings -> Environment Variables). Redeploy after changing it.
// (Create React App users: use process.env.REACT_APP_GOOGLE_AI_API_KEY instead)
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

// Tried in order. If one is overloaded or missing, the next one is used.
const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];
const RETRIES_PER_MODEL = 1;

const options = [
  { value: "html-css", label: "HTML + CSS" },
  { value: "html-tailwind", label: "HTML + Tailwind CSS" },
  { value: "html-bootstrap", label: "HTML + Bootstrap" },
  { value: "html-css-js", label: "HTML + CSS + JS" },
  {
    value: "html-tailwind-bootstrap",
    label: "HTML + Tailwind + Bootstrap",
  },
];

// Extract code from Markdown fences (handles unclosed fences too)
const extractCode = (response = "") => {
  const text = response.trim();

  const closed = text.match(/```(?:html|html5)?\s*([\s\S]*?)```/i);
  if (closed) return closed[1].trim();

  return text.replace(/^```(?:html|html5)?\s*/i, "").trim();
};

const getErrorInfo = (err) => ({
  message: String(err?.message || err),
  status: err?.status ?? err?.statusCode ?? err?.error?.code,
});

const isRateLimit = (err) => {
  const { message, status } = getErrorInfo(err);
  return status === 429 || /429|RESOURCE_EXHAUSTED/i.test(message);
};

const isRetryable = (err) => {
  const { message, status } = getErrorInfo(err);
  return (
    [500, 503, 429].includes(status) ||
    /503|429|500|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(
      message
    )
  );
};

const isModelMissing = (err) => {
  const { message, status } = getErrorInfo(err);
  return status === 404 || /404|NOT_FOUND|not found/i.test(message);
};

// Try each model in order, with a short retry on each
const generateWithFallback = async (ai, contents, onRetry) => {
  let lastError;

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      try {
        return await ai.models.generateContent({ model, contents });
      } catch (err) {
        lastError = err;

        if (isModelMissing(err)) break; // move on to the next model
        if (!isRetryable(err)) throw err; // bad key, bad request, etc.

        if (attempt < RETRIES_PER_MODEL) {
          const delay = 1500 * 2 ** attempt;
          onRetry?.(model, delay);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  throw lastError;
};

const Home = ({ theme, onToggleTheme }) => {
  const [outputScreen, setOutputScreen] = useState(false);
  const [tab, setTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [frameWork, setFrameWork] = useState(options[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate component with model fallback
  const getResponse = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your component first");
      return;
    }

    if (!API_KEY) {
      toast.error(
        "Gemini API key is missing. Add VITE_GOOGLE_AI_API_KEY and redeploy."
      );
      return;
    }

    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      const contents = `
You are an expert web developer and UI/UX designer.

Create a modern, animated, fully responsive UI component.

Component description:
${prompt}

Framework:
${frameWork.value}

Requirements:
- Return only the complete HTML code.
- Include CSS and JavaScript inside the same HTML file when needed.
- For HTML + CSS, use plain HTML and CSS.
- For HTML + CSS + JS, use plain HTML, CSS, and JavaScript.
- For HTML + Tailwind CSS, use Tailwind through its CDN.
- For HTML + Bootstrap, use Bootstrap through its CDN.
- For HTML + Tailwind + Bootstrap, use both CDNs.
- Make the layout responsive on mobile, tablet, and desktop.
- Use modern UI design, good spacing, and accessible contrast.
- Add animations only where appropriate.
- Do not include explanations outside the code.
- Return the result inside one HTML Markdown code block.
`;

      const response = await generateWithFallback(
        ai,
        contents,
        (model, delay) =>
          toast.info(`${model} is busy. Retrying in ${delay / 1000}s...`)
      );

      const generatedCode = response?.text;

      if (!generatedCode?.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setCode(extractCode(generatedCode));
      setOutputScreen(true);
      setTab(1);

      toast.success("Component generated successfully!");
    } catch (err) {
      console.error("Gemini API Error:", err);

      const { message } = getErrorInfo(err);

      if (isRateLimit(err)) {
        toast.error("API quota or rate limit reached. Check your usage.");
      } else if (isRetryable(err)) {
        toast.error(
          "All Gemini models are busy right now. Try again in a minute."
        );
      } else if (isModelMissing(err)) {
        toast.error("No configured model is available. Update the MODELS list.");
      } else if (/API key|API_KEY_INVALID|401|403/i.test(message)) {
        toast.error("Check your Gemini API key and permissions.");
      } else {
        toast.error("Failed to generate code. Check the console.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy generated code
  const copyCode = async () => {
    if (!code) {
      toast.error("No code to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied successfully!");
    } catch (err) {
      console.error("Copy error:", err);
      toast.error("Unable to copy code. Check browser permissions.");
    }
  };

  // Download generated HTML
  const downloadFile = () => {
    if (!code) {
      toast.error("No code to download");
      return;
    }

    const blob = new Blob([code], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "GenUI-Code.html";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  // Refresh preview
  const refreshPreview = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Open preview in a new browser tab
  const openPreviewInNewTab = () => {
    if (!code) {
      toast.error("Generate some code first");
      return;
    }

    const blob = new Blob([code], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const newTab = window.open(url, "_blank");

    if (!newTab) {
      URL.revokeObjectURL(url);
      toast.error("Popup blocked. Allow popups and try again.");
      return;
    }

    // Keep the Blob URL alive for 5 minutes so the tab can load/refresh
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  };

  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-16">
        {/* LEFT PANEL */}
        <div className="surface-secondary mt-5 p-5 rounded-xl">
          <h3 className="text-[25px] font-semibold">AI Component Generator</h3>

          <p className="muted-text mt-2">
            Describe your component and let AI code it for you.
          </p>

          <p className="mt-4 font-bold">Framework</p>

          <Select
            className="mt-2"
            options={options}
            value={frameWork}
            onChange={(selected) => {
              if (selected) setFrameWork(selected);
            }}
            isDisabled={loading}
          />

          <p className="mt-5 font-bold">Describe your component</p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="field-bg w-full min-h-[200px] mt-3 p-3 rounded-xl outline-none"
            placeholder="Example: Create a modern animated login page with a gradient background..."
          />

          <button
            onClick={getResponse}
            disabled={loading}
            className="mt-4 flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-600 hover:opacity-90 disabled:opacity-60 text-white"
          >
            {loading ? <ClipLoader size={18} color="white" /> : <BsStars />}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="surface-secondary rounded-xl h-[80vh] overflow-hidden flex flex-col">
          {!outputScreen ? (
            <div className="h-full flex flex-col items-center justify-center">
              <HiOutlineCode size={40} />

              <p className="muted-text mt-3 text-center px-4">
                Your generated code will appear here
              </p>
            </div>
          ) : (
            <>
              {/* TOOLBAR */}
              <div className="surface-tertiary flex items-center justify-between">
                <div className="flex flex-1">
                  <button
                    onClick={() => setTab(1)}
                    className={`w-1/2 p-3 ${
                      tab === 1 ? "bg-purple-600 text-white" : ""
                    }`}
                  >
                    Code
                  </button>

                  <button
                    onClick={() => setTab(2)}
                    className={`w-1/2 p-3 ${
                      tab === 2 ? "bg-purple-600 text-white" : ""
                    }`}
                  >
                    Preview
                  </button>
                </div>

                <div className="flex items-center gap-3 px-3">
                  <button
                    onClick={copyCode}
                    title="Copy code"
                    aria-label="Copy code"
                  >
                    <IoCopy size={18} />
                  </button>

                  <button
                    onClick={downloadFile}
                    title="Download HTML"
                    aria-label="Download HTML"
                  >
                    <PiExportBold size={18} />
                  </button>

                  <button
                    onClick={refreshPreview}
                    title="Refresh preview"
                    aria-label="Refresh preview"
                  >
                    <FiRefreshCcw size={18} />
                  </button>

                  <button
                    onClick={openPreviewInNewTab}
                    title="Open preview in new tab"
                    aria-label="Open preview in new tab"
                  >
                    <ImNewTab size={18} />
                  </button>
                </div>
              </div>

              {/* EDITOR / PREVIEW */}
              <div className="flex-1 min-h-0">
                {tab === 1 ? (
                  <Editor
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                    height="100%"
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    language="html"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: "on",
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <iframe
                    key={refreshKey}
                    title="Generated component preview"
                    srcDoc={code}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    className="w-full h-full bg-white border-0"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
