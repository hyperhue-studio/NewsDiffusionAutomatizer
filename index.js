import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from 'node-fetch';
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get("/get-weather", async (req, res) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const cityKey = req.query.cityKey;
    
    const cityMapping = {
      chihuahua: "chihuahua",
      juarez: "ciudad-juarez",
      parral: "establo-el-parral"
    };

    const city = cityMapping[cityKey] || "chihuahua";

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=2`;
    console.log("URL del clima:", url);

    const response = await fetch(url);
    const data = await response.json();

    const tomorrow = data.forecast.forecastday[1];
    const minTemp = Math.round(tomorrow.day.mintemp_c);
    const maxTemp = Math.round(tomorrow.day.maxtemp_c);

    res.json({ success: true, weather: { minTemp, maxTemp } });
    console.log("Clima obtenido:", { minTemp, maxTemp });
  } catch (error) {
    console.error("Error al obtener el clima:", error);
    res.status(500).json({ success: false, error: "Hubo un error al obtener el clima." });
  }
});

app.post("/shorten-url", async (req, res) => {
  console.log("POST /shorten-url called");
  const { url, cityKey } = req.body;
  console.log("URL to shorten:", url);
  console.log("City Key for domain:", cityKey);

  if (!url) {
      return res.status(400).json({ error: "La URL es obligatoria." });
  }

  try {
      const bitlyToken = process.env.BITLY_TOKEN;
      const cityDomains = {
          chihuahua: "elhdechihuahua.mx",
          juarez: "bit.ly",
          parral: "bit.ly",
      };

      const domain = cityDomains[cityKey] || "bit.ly";

      console.log(`Using domain: ${domain} for city: ${cityKey}`);

      const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
          method: "POST",
          headers: {
              Authorization: `Bearer ${bitlyToken}`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              long_url: url,
              domain: domain
          })
      });

      if (!response.ok) {
          const errorData = await response.json();
          console.error("Error en la solicitud de Bitly:", errorData);
          return res.status(500).json({ error: "Error al acortar la URL." });
      }

      const data = await response.json();
      console.log("Shortened URL:", data.link);
      res.json({ shortenedUrl: data.link });
  } catch (error) {
      console.error("Error al acortar la URL:", error);
      res.status(500).json({ error: "Hubo un error al acortar la URL." });
  }
});

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

app.post("/extract-data", async (req, res) => {
  const { text, cityKey } = req.body;

  if (!text || !cityKey) {
    return res.status(400).json({ error: "El texto y la ciudad son obligatorios." });
  }

  try {
    const cityPrompts = {
      chihuahua: `
        Vas a recibir un texto con 4 noticias. Cada noticia contiene un título y su respectivo enlace.
        - Tu tarea es extraer exactamente 4 títulos y sus enlaces, ignorando cualquier prefijo o estructura innecesaria como "PROGRAMADA:", "RÁFAGAS:", errores tipográficos o acompañamientos basura.
        - Devuélvelos en un JSON puro con la siguiente estructura:

        {
          "noticias": [
            {"titulo": "Título 1", "enlace": "URL 1", "emoji": "📰"},
            {"titulo": "Título 2", "enlace": "URL 2", "emoji": "📰"},
            {"titulo": "Título 3", "enlace": "URL 3", "emoji": "📰"},
            {"titulo": "Título 4", "enlace": "URL 4", "emoji": "📰"}
          ]
        }

        Reglas específicas:
        - Genera un emoji representativo para cada título basado en su contenido.
        - No inventes noticias ni enlaces, simplemente extrae y estructura los datos.
        - No devuelvas más de 4 elementos, si el usuario ingresó más, ignora los extras.
        - Si una noticia pertenece a RÁFAGAS, conserva cualquier guion que aparezca al inicio del título.
        - No pongas comentarios ni explicación adicional, solo devuelve el JSON limpio.
        
        Texto de entrada:
        "${text}"
      `,
      juarez: `
        Vas a recibir un texto con 4 noticias. Cada noticia contiene un título y su respectivo enlace.
        - Tu tarea es extraer exactamente 4 títulos y sus enlaces, ignorando cualquier prefijo o estructura innecesaria como "PROGRAMADA:", "RÁFAGAS:", errores tipográficos o acompañamientos basura.
        - Devuélvelos en un JSON puro con la siguiente estructura:

        {
          "noticias": [
            {"titulo": "Título 1", "enlace": "URL 1", "emoji": "📰"},
            {"titulo": "Título 2", "enlace": "URL 2", "emoji": "📰"},
            {"titulo": "Título 3", "enlace": "URL 3", "emoji": "📰"},
            {"titulo": "Título 4", "enlace": "URL 4", "emoji": "📰"}
          ]
        }

        Reglas específicas:
        - Genera un emoji representativo para cada título basado en su contenido.
        - No inventes noticias ni enlaces, simplemente extrae y estructura los datos.
        - No devuelvas más de 4 elementos, si el usuario ingresó más, ignora los extras.
        - Si una noticia pertenece a RÁFAGAS, conserva cualquier guion que aparezca al inicio del título.
        - No pongas comentarios ni explicación adicional, solo devuelve el JSON limpio.
        
        Texto de entrada:
        "${text}"
      `,
      parral: `
        Vas a recibir un texto con 5 noticias. Cada noticia contiene un título y su respectivo enlace.
        - Tu tarea es extraer exactamente 5 títulos y sus enlaces, ignorando cualquier prefijo o estructura innecesaria como "PROGRAMADA:", "RÁFAGAS:", errores tipográficos o acompañamientos basura.
        - Devuélvelos en un JSON puro con la siguiente estructura:

        {
          "noticias": [
            {"titulo": "Título 1", "enlace": "URL 1", "emoji": "📰"},
            {"titulo": "Título 2", "enlace": "URL 2", "emoji": "📰"},
            {"titulo": "Título 3", "enlace": "URL 3", "emoji": "📰"},
            {"titulo": "Título 4", "enlace": "URL 4", "emoji": "📰"},
            {"titulo": "Título 5", "enlace": "URL 5", "emoji": "📰"}
          ]
        }

        Reglas específicas:
        - Genera un emoji representativo para cada título basado en su contenido.
        - No inventes noticias ni enlaces, simplemente extrae y estructura los datos.
        - No devuelvas más de 5 elementos, si el usuario ingresó más, ignora los extras.
        - Si una noticia pertenece a RÁFAGAS, conserva cualquier guion que aparezca al inicio del título.
        - Si es una columna, indícalo de manera clara.
        - No pongas comentarios ni explicación adicional, solo devuelve el JSON limpio.

        Texto de entrada:
        "${text}"
      `
    };

    const prompt = cityPrompts[cityKey];

    if (!prompt) {
      return res.status(400).json({ error: "No se encontró el prompt para la ciudad seleccionada." });
    }

    const result = await model.generateContent([prompt]);
    let responseText = result.response.text().trim();

    responseText = responseText.replace(/```json|```/g, "").trim();

    try {
      const parsedData = JSON.parse(responseText);
      res.json({ success: true, noticias: parsedData.noticias });
    } catch (jsonError) {
      console.error("Error al parsear la respuesta de la IA:", responseText);
      res.status(500).json({ error: "Error al procesar la respuesta de la IA." });
    }
  } catch (error) {
    console.error("Error al extraer datos:", error);
    res.status(500).json({ error: "Hubo un error al extraer los datos." });
  }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

export default app;
