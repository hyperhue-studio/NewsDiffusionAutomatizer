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

document.addEventListener("DOMContentLoaded", () => {
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
    const outputText = document.getElementById("output-text");
    const copyButton = document.getElementById("copy-button");

    if (inputText === '') {
        alert('Por favor, pega el texto de las noticias.');
        return;
    }

    const extractedData = await extractDataFromAI(inputText);
    if (!extractedData || extractedData.length !== 4) {
        alert('No se pudieron extraer correctamente las 4 noticias.');
        return;
    }

    const outputLines = [];

    for (let i = 0; i < extractedData.length; i++) {
        const { titulo, enlace, emoji } = extractedData[i];
        const shortenedUrl = await shortenUrl(enlace);

        if (shortenedUrl) {
            if (i === 1) { 
                outputLines.push(`✒️ *RÁFAGAS*\n${titulo}\n🔗 ${shortenedUrl}`);
            } else {
                outputLines.push(`${emoji} *${titulo}*\n🔗 ${shortenedUrl}`);
            }
        }
    }

    const weather = await getWeather();
    if (!weather) return;

    const finalText = `
☀️ *¡Buenos días!* 
🌡️ *Temperatura para hoy*
Mínima ${weather.min}°C | Máxima ${weather.max}°C 

📰 *EN LA PORTADA DE EL HERALDO DE CHIHUAHUA*

${outputLines.join('\n\n')}
    `;

    outputText.value = finalText.trim();

    copyButton.classList.add("enabled");
    copyButton.disabled = false;
});

async function extractDataFromAI(text) {
    try {
        const response = await fetch('/extract-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        console.log("Datos extraídos de la IA:", data);

        return data.noticias || [];
    } catch (error) {
        console.error('Error al extraer datos de la IA:', error);
        return [];
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

async function shortenUrl(url) {
    const longUrlWithUtm = `${url}?utm_source=whatsapp&utm_medium=social&utm_campaign=canal`;

    console.log('URL antes de acortar:', longUrlWithUtm);

    try {
        const response = await fetch('/shorten-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: longUrlWithUtm }) 
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

async function getWeather() {
    try {
        const response = await fetch('/get-weather');
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
