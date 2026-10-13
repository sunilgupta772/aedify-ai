
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Select from "react-select";
import { BsStars } from "react-icons/bs";
import { HiOutlineCode } from "react-icons/hi";
import Editor from "@monaco-editor/react";
import { IoCloseSharp, IoCopy } from "react-icons/io5";
import { PiExportBold } from "react-icons/pi";
import { ImNewTab } from "react-icons/im";
import { FiRefreshCcw } from "react-icons/fi";
import { GoogleGenAI } from "@google/genai";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

const Home = ({ theme, onToggleTheme }) => {
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

  const [outputScreen, setOutputScreen] = useState(false);
  const [tab, setTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [frameWork, setFrameWork] = useState(options[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract code from Markdown fences
  const extractCode = (response = "") => {
    const match = response.match(/```(?:html|html5)?\s*([\s\S]*?)```/i);
    return match ? match[1].trim() : response.trim();
  };

  // Generate component with retry logic
  const getResponse = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your component first");
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

    if (!apiKey) {
      toast.error("Gemini API key is missing. Check your .env file.");
      return;
    }

    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const maxRetries = 3;
      let response = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await ai.models.generateContent({
            // If unavailable for your API key, choose a supported model
            // from https://ai.google.dev/gemini-api/docs/models
            model: "gemini-2.5-flash",
            contents: `
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
`,
          });

          break;
        } catch (err) {
          const message = String(err?.message || err);
          const status = err?.status ?? err?.statusCode;

          const retryable =
            status === 503 ||
            status === 429 ||
            status === 500 ||
            /503|429|500|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(
              message
            );

          if (!retryable || attempt === maxRetries) {
            throw err;
          }

          const delay = 1000 * 2 ** attempt;
          toast.info(
            `AI server busy. Retrying in ${delay / 1000} seconds...`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const generatedCode = response?.text;

      if (!generatedCode?.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      const cleanCode = extractCode(generatedCode);

      setCode(cleanCode);
      setOutputScreen(true);
      setTab(1);

      toast.success("Component generated successfully!");
    } catch (err) {
      console.error("Gemini API Error:", err);

      const message = String(err?.message || err);
      const status = err?.status ?? err?.statusCode;

      if (
        status === 503 ||
        /503|UNAVAILABLE|high demand|overloaded/i.test(message)
      ) {
        toast.error("Gemini server is busy. Please try again later.");
      } else if (
        status === 429 ||
        /429|RESOURCE_EXHAUSTED/i.test(message)
      ) {
        toast.error("API quota or rate limit reached. Check your usage.");
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

    setIsNewTabOpen(false);

    // Keep the Blob URL alive briefly for the new tab to load.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-16">
        {/* LEFT PANEL */}
        <div className="surface-secondary mt-5 p-5 rounded-xl">
          <h3 className="text-[25px] font-semibold">
            AI Component Generator
          </h3>

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
            {loading ? (
              <ClipLoader size={18} color="white" />
            ) : (
              <BsStars />
            )}

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
                    sandbox="allow-scripts"
                    className="w-full h-full bg-white border-0"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FULL-SCREEN PREVIEW */}
      {isNewTabOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <button
            onClick={() => setIsNewTabOpen(false)}
            className="absolute top-3 right-3 z-10 p-2 bg-white rounded-lg shadow"
            aria-label="Close preview"
          >
            <IoCloseSharp size={22} />
          </button>

          <iframe
            title="Full-screen component preview"
            srcDoc={code}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        </div>
      )}
    </>
  );
};

export default Home;
