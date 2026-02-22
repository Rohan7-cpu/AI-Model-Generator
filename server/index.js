require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const OpenAI = require("openai");
const PDFParser = require("pdf2json");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🔹 AI CLIENT SETUP
========================= */

const aiClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/* =========================
   🔹 FILE STORAGE
========================= */

const upload = multer({ dest: "storage/" });
let fileMemory = {};

/* =========================
   🔹 PROCESS FILE ROUTE
========================= */

app.post("/process-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errData) => {
      console.error("PDF Parse Error:", errData.parserError);
      return res.status(500).json({ error: "PDF parsing failed" });
    });

    parser.on("pdfParser_dataReady", (pdfData) => {
      let extractedText = "";

      pdfData.Pages.forEach((page) => {
        page.Texts.forEach((textItem) => {
          textItem.R.forEach((t) => {
            extractedText += decodeURIComponent(t.T) + " ";
          });
        });
      });

      const fileToken = uuidv4();
      fileMemory[fileToken] = extractedText;

      console.log("✅ File processed. Token:", fileToken);

      res.json({ fileToken });
    });

    parser.loadPDF(req.file.path);

  } catch (err) {
    console.error("🔥 File Processing Error:", err.message);
    res.status(500).json({ error: "File processing failed" });
  }
});

/* =========================
   🔹 GENERATE ANSWER ROUTE
========================= */

app.post("/generate-answer", async (req, res) => {
  try {
    const { question, fileToken, email } = req.body;

    console.log("📩 Question:", question);
    console.log("🔑 Token:", fileToken);

    if (!question || !fileToken) {
      return res.status(400).json({ error: "Missing question or token" });
    }

    const fileContent = fileMemory[fileToken];

    if (!fileContent) {
      return res.status(400).json({ error: "Invalid File Token" });
    }

    /* 🔹 AI CALL */
    const completion = await aiClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Answer strictly based on this document:\n\n" + fileContent,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const generatedResponse =
      completion.choices[0].message.content;

    console.log("🤖 AI Response Generated");

    /* 🔹 WEBHOOK CALL (SAFE) */
    try {
      await axios.post(process.env.N8N_WEBHOOK_URL, {
      user_question: question,
      ai_response: generatedResponse,
        user_email: email,
     });
      console.log("📨 Webhook sent successfully");
    } catch (webhookErr) {
      console.log("⚠ Webhook failed:", webhookErr.message);
    }

    res.json({ result: generatedResponse });

  } catch (err) {
    console.error(
      "🔥 AI ERROR:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* =========================
   🔹 START SERVER
========================= */

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 InsightForge AI running on port 5000");
});