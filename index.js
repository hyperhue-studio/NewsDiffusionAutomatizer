import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from 'node-fetch';
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config(); // Cargar las variables de entorno desde .env

const app = express();
const port = 3000;

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Inicializar la API de Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Ruta para obtener el clima
app.get("/get-weather", async (req, res) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const city = "Chihuahua"; // Puedes parametrizar la ciudad si es necesario
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=2`;

    const response = await fetch(url);
    const data = await response.json();

    const tomorrow = data.forecast.forecastday[1];
    const minTemp = Math.round(tomorrow.day.mintemp_c);
    const maxTemp = Math.round(tomorrow.day.maxtemp_c);

    res.json({ success: true, weather: { minTemp, maxTemp } });
  } catch (error) {
    console.error("Error al obtener el clima:", error);
    res.status(500).json({ success: false, error: "Hubo un error al obtener el clima." });
  }
});

// Ruta para acortar URLs
app.post("/shorten-url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "La URL es obligatoria." });
  }

  try {
    const bitlyToken = process.env.BITLY_TOKEN;
    const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bitlyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        long_url: url,
        domain: "elhdechihuahua.mx"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error en la solicitud de Bitly:", errorData);
      return res.status(500).json({ error: "Error al acortar la URL." });
    }

    const data = await response.json();
    res.json({ shortenedUrl: data.link });
  } catch (error) {
    console.error("Error al acortar la URL:", error);
    res.status(500).json({ error: "Hubo un error al acortar la URL." });
  }
});

// Ruta para obtener el emoji
app.post("/get-emoji", async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: "El título es obligatorio." });
  }

  try {
    if (title.includes("RÁFAGAS:")) {
      return res.json({ emoji: "" });
    }

    const prompt = `Genera un emoji para el siguiente título de noticia, y no respondas nada más que el puro emoji, y que solo sea 1, se sensible: "${title}"`;
    const result = await model.generateContent([prompt]);

    const emoji = result.response.text().trim();
    res.json({ emoji });
  } catch (error) {
    console.error("Error al generar el emoji:", error);
    res.status(500).json({ error: "Hubo un error al generar el emoji." });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

export default app;

