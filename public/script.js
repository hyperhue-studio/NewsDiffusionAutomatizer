document.getElementById('instructions-button').addEventListener('click', () => {
    document.getElementById('instructions-popup').style.display = 'flex';
});

document.getElementById('close-popup').addEventListener('click', () => {
    document.getElementById('instructions-popup').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const popup = document.getElementById('instructions-popup');
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});

let cityConfigs = {};

document.addEventListener("DOMContentLoaded", async () => {
    // Cargar las configuraciones de las ciudades desde el backend
    const response = await fetch('/get-city-configs');
    cityConfigs = await response.json();
    console.log('City Configs:', cityConfigs);  // Verifica que se haya cargado correctamente
  
    
    const outputText = document.getElementById("output-text");
    const copyButton = document.getElementById("copy-button");

    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(outputText.value)
            .then(() => {
                console.log("Texto copiado al portapapeles.");
            })
            .catch((err) => {
                console.error("Error al copiar la difusión:", err);
                alert("❌ Hubo un error al copiar la difusión.");
            });
    });
});

document.getElementById('process-button').addEventListener('click', async () => {
    const inputText = document.getElementById('input-text').value.trim();
    const cityKey = document.getElementById('city-select').value;  // Obtener la ciudad seleccionada
    console.log("City Key obtenida fueee:", cityKey);  // Verifica que cityKey tenga el valor correcto
    const outputText = document.getElementById("output-text");
    const copyButton = document.getElementById("copy-button");

    // Verifica si el texto de entrada no está vacío
    if (inputText === '') {
        alert('Por favor, pega el texto de las noticias.');
        return;
    }

    // Extraemos las noticias y los enlaces
    const extractedData = await extractDataFromAI(inputText, cityKey);
    if (!extractedData || extractedData.length !== 4) {
        alert('No se pudieron extraer correctamente las 4 noticias.');
        return;
    }

    // Inicializamos el array que contendrá las líneas de la salida
    const outputLines = [];

    // Procesamos cada noticia y acortamos las URLs
    for (let i = 0; i < extractedData.length; i++) {
        const { titulo, enlace, emoji } = extractedData[i];
        const shortenedUrl = await shortenUrl(enlace, cityKey);  // Pasamos cityKey para usar el dominio correcto

        if (shortenedUrl) {
            // Si es una noticia de "RÁFAGAS", le damos un formato especial
            if (i === 1) { 
                outputLines.push(`✒️ *RÁFAGAS*\n${titulo}\n🔗 ${shortenedUrl}`);
            } else {
                outputLines.push(`${emoji} *${titulo}*\n🔗 ${shortenedUrl}`);
            }
        }
    }

    console.log("City Key (from dropdown):", cityKey);
    const weather = await getWeather(cityKey);
    
    if (!weather) {
        console.error("No se pudo obtener el clima.");
        return;
    }

    console.log("City Key obtenida:", cityKey);

    // Definimos los formatters localmente como respaldo
    const cityConfigFunctions = {
        chihuahua: {
            formatter: ({ weather, outputLines }) => `
☀️ *¡Buenos días!* 
🌡️ *Temperatura para hoy*
Mínima ${weather.min}°C | Máxima ${weather.max}°C 

📰 *EN LA PORTADA DE EL HERALDO DE CHIHUAHUA*

${outputLines.join('\n\n')}
            `.trim()
        },
        parral: {
            formatter: ({ weather, outputLines }) => `
📍 *Parral al amanecer* 
🌡️ *El clima de hoy:* 
Mínima ${weather.min}°C | Máxima ${weather.max}°C

🗞️ *Principales noticias de El Sol de Parral*

${outputLines.join('\n\n')}

💻 Más detalles en la web de El Sol de Parral
            `.trim()
        }
    };

    // Intentamos usar el formatter del server primero, si no está disponible, usamos el local
    let finalText = "";
    
    if (cityConfigs[cityKey] && typeof cityConfigs[cityKey].formatter === 'function') {
        finalText = cityConfigs[cityKey].formatter({ weather, outputLines });
    } else if (cityConfigFunctions[cityKey] && typeof cityConfigFunctions[cityKey].formatter === 'function') {
        finalText = cityConfigFunctions[cityKey].formatter({ weather, outputLines });
    } else {
        console.error("No se encontró el formatter para la ciudad:", cityKey);
        return;
    }

    console.log("Texto final:", finalText);

    // Asignamos el texto generado al campo de salida
    outputText.value = finalText;
    copyButton.classList.add("enabled");
    copyButton.disabled = false;
});

async function extractDataFromAI(text, cityKey) {
    try {
        const response = await fetch('/extract-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, cityKey })
        });
        const data = await response.json();
        return data.noticias || [];
    } catch (error) {
        console.error('Error al extraer datos de la IA:', error);
        return [];
    }
}

async function shortenUrl(url, cityKey) {
    const longUrlWithUtm = `${url}?utm_source=whatsapp&utm_medium=social&utm_campaign=canal`;

    console.log('URL antes de acortar:', longUrlWithUtm);
    console.log('Ciudad para acortar URL:', cityKey);

    try {
        const response = await fetch('/shorten-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: longUrlWithUtm,
                cityKey: cityKey  // Pasamos la ciudad para elegir el dominio correcto
            }) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en la solicitud de acortamiento:', errorData);
            alert('Hubo un error al acortar el enlace. Verifica la URL y los parámetros.');
            return null;
        }

        const data = await response.json();
        console.log('URL acortada:', data.shortenedUrl);
        return data.shortenedUrl;
    } catch (error) {
        console.error('Error al realizar la solicitud:', error);
        alert('Hubo un error al realizar la solicitud para acortar el enlace.');
        return null;
    }
}

async function getWeather(cityKey) {
    try {
        // Asegúrate de que cityKey esté siendo correctamente utilizado en la URL de la solicitud
        const response = await fetch(`/get-weather?cityKey=${cityKey}`);  // Pasa cityKey en la URL
        const data = await response.json();

        if (!data.success) {
            throw new Error('Error al obtener el clima desde el backend.');
        }

        const { minTemp, maxTemp } = data.weather;
        console.log('Clima obtenido:', { minTemp, maxTemp });
        return { min: minTemp, max: maxTemp };
    } catch (error) {
        console.error('Error al obtener el clima:', error);
        alert('Hubo un error al obtener el clima. Por favor, intenta nuevamente.');
        return null;
    }
}

async function getEmojiForTitleFromServer(title) {
    try {
        const response = await fetch('/get-emoji', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        const data = await response.json();
        return data.emoji || '📰';
    } catch (error) {
        console.error('Error al obtener el emoji:', error);
        return '📰';
    }
}