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
    { value: "html-tailwind-bootstrap", label: "HTML + Tailwind + Bootstrap" },
  ];

  const [outputScreen, setOutputScreen] = useState(false);
  const [tab, setTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [frameWork, setFrameWork] = useState(options[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ================= UTIL ================= */
  const extractCode = (response) => {
    const match = response.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    return match ? match[1].trim() : response.trim();
  };

  // API Call
  
  const getResponse = async () => {
    if (!prompt.trim()) {
      return toast.error("Please describe your component first");
    }

    try {
      setLoading(true);

      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing VITE_GOOGLE_AI_API_KEY");
      }

      const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
  model: "gemini-3.6-flash",
  contents: `
You are an expert web developer and UI/UX designer.

Create a modern, animated, fully responsive UI component.

Component description:
${prompt}

Framework:
${frameWork.value}

Rules:

- Return ONLY code
- Use Markdown fenced code blocks
- Single HTML file only
- No explanations, no comments
`,
});

      setCode(extractCode(response.text));
      setOutputScreen(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIONS ================= */
  const copyCode = async () => {
    if (!code) return toast.error("No code to copy");
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const downloadFile = () => {
    if (!code) return toast.error("No code to download");

    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "GenUI-Code.html";
    a.click();

    URL.revokeObjectURL(url);
    toast.success("File downloaded");
  };

  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-16">
        {/* LEFT */}
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
            onChange={setFrameWork}
          />

          <p className="mt-5 font-bold">Describe your component</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="field-bg w-full min-h-[200px] mt-3 p-3 rounded-xl outline-none"
            placeholder="Describe your component..."
          />

          <button
            onClick={getResponse}
            className="mt-4 flex items-center gap-2 px-5 py-3 rounded-lg bg-purple-600 hover:opacity-90"
          >
            {loading ? <ClipLoader size={18} color="white" /> : <BsStars />}
            Generate
          </button>
        </div>

        {/* RIGHT */}
        <div className="surface-secondary rounded-xl h-[80vh] overflow-hidden">
          {!outputScreen ? (
            <div className="h-full flex flex-col items-center justify-center">
              <HiOutlineCode size={40} />
              <p className="muted-text mt-3">
                Your generated code will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="surface-tertiary flex">
                <button
                  onClick={() => setTab(1)}
                  className={`w-1/2 p-2 ${
                    tab === 1 ? "bg-purple-600" : ""
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setTab(2)}
                  className={`w-1/2 p-2 ${
                    tab === 2 ? "bg-purple-600" : ""
                  }`}
                >
                  Preview
                </button>
              </div>

              {tab === 1 ? (
                <Editor
                  value={code}
                  height="100%"
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  language="html"
                />
              ) : (
                <iframe
                  key={refreshKey}
                  srcDoc={code}
                  className="w-full h-full bg-white"
                />
              )}
            </>
          )}
        </div>
      </div>

      {isNewTabOpen && (
        <div className="fixed inset-0 bg-white">
          <button
            onClick={() => setIsNewTabOpen(false)}
            className="absolute top-3 right-3"
          >
            <IoCloseSharp />
          </button>
          <iframe srcDoc={code} className="w-full h-full" />
        </div>
      )}
    </>
  );
};

export default Home;
