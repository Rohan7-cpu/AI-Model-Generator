import React, { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [fileToken, setFileToken] = useState("");
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("https://ai-model-generator.onrender.com/process-file", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setFileToken(data.fileToken);
    alert("File processed successfully!");
  };

  const generateAnswer = async () => {
    setLoading(true);

    const res = await fetch("https://ai-model-generator.onrender.com/generate-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, fileToken, email }),
    });

    const data = await res.json();
    setResult(data.result);
    setLoading(false);
  };

  return (
    <div className="main">
      <h1>⚡ InsightForge AI</h1>
      <p>Smart PDF Question Engine</p>

      <div className="box">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={uploadFile}>Process File</button>
      </div>

      <div className="box">
        <input
          type="text"
          placeholder="Ask about your document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div className="box">
        <input
          type="email"
          placeholder="Enter your email to receive response..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button onClick={generateAnswer}>Generate & Send Email</button>

      {loading && <p>Thinking...</p>}

      {result && (
        <div className="result">
          <h3>AI Output</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App;