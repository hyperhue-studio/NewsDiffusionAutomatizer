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
    const response = await fetch('/get-city-configs');
    cityConfigs = await response.json();
    console.log('City Configs:', cityConfigs);

    const outputText = document.getElementById("output-text");
    const copyButton = document.getElementById("copy-button");

    copyButton.addEventListener("click", () => {
        if (!copyButton.disabled) {
            outputText.select();
            
            navigator.clipboard.writeText(outputText.value)
                .then(() => {
                    console.log("Texto copiado al portapapeles.");
                    copyButton.textContent = "✅ Copiado";
                    setTimeout(() => {
                        copyButton.textContent = "📋 Copiar Difusión";
                    }, 2000);
                })
                .catch((err) => {
                    console.error("Error al copiar la difusión:", err);
                    alert("❌ Hubo un error al copiar la difusión.");
                });
        }
    });
});

document.getElementById('process-button').addEventListener('click', async () => {
    const inputText = document.getElementById('input-text').value.trim();
    const cityKey = document.getElementById('city-select').value;
    console.log("City Key obtenida fueee:", cityKey);
    const outputText = document.getElementById("output-text");
    const copyButton = document.getElementById("copy-button");

    if (inputText === '') {
        alert('Por favor, pega el texto de las noticias.');
        return;
    }

    const extractedData = await extractDataFromAI(inputText, cityKey);

    if (!extractedData || extractedData.length < 4) {
        alert('No se pudieron extraer correctamente al menos 4 noticias.');
        return;
    }

    const outputLines = [];

    for (let i = 0; i < extractedData.length; i++) {
        const { titulo, enlace, emoji } = extractedData[i];
        const shortenedUrl = await shortenUrl(enlace, cityKey);

        if (shortenedUrl) {
            outputLines.push(`${emoji} *${titulo}*\n🔗 ${shortenedUrl}`);
        }
    }

    console.log("City Key (from dropdown):", cityKey);
    const weather = await getWeather(cityKey);

    if (!weather) {
        console.error("No se pudo obtener el clima.");
        return;
    }

    const cityConfigFunctions = {
        chihuahua: {
            formatter: ({ weather, outputLines }) => {
                const modifiedLines = [...outputLines];
                
                if (modifiedLines.length > 1) {
                    const secondLineTitle = modifiedLines[1].split('\n')[0].replace(/^[^\*]*\*|\*$/g, '');
                    const secondLineUrl = modifiedLines[1].split('\n')[1];
                    
                    modifiedLines[1] = `✒️ *RÁFAGAS*\n${secondLineTitle}\n${secondLineUrl}`;
                }
        
                return `
☀️ *¡Buenos días!*
🌡️ *Temperatura para hoy*
Mínima ${weather.min}°C | Máxima ${weather.max}°C
📰 *EN LA PORTADA DE EL HERALDO DE CHIHUAHUA*

${modifiedLines.join('\n\n')}
                `.trim();
            }
        },
        juarez: {
            formatter: ({ weather, outputLines }) => {
                const modifiedLines = [...outputLines];
                
                if (modifiedLines.length > 1) {
                    const secondLineTitle = modifiedLines[1].split('\n')[0].replace(/^[^\*]*\*|\*$/g, '');
                    const secondLineUrl = modifiedLines[1].split('\n')[1];
                    
                    modifiedLines[1] = `✒️ *RÁFAGAS*\n${secondLineTitle}\n${secondLineUrl}`;
                }
        
                return `
☀️ *¡Buenos días!*
🌡️ *Temperatura para hoy*
Mínima ${weather.min}°C | Máxima ${weather.max}°C
📰 *EN LA PORTADA DE EL HERALDO DE JUÁREZ*

${modifiedLines.join('\n\n')}
                `.trim();
            }
        },
        parral: {
            formatter: ({ weather, outputLines }) => {
                const firstFour = outputLines.slice(0, 4);
        
                const columnNote = outputLines[3];
        
                const [titleLine, urlLine] = columnNote.split('\n');
        
                firstFour[3] = `✒️ *${titleLine.replace(/^[^\*]*\*|\*$/g, '')}*\n${urlLine}`;
        
                const podcast = `🗣️👂 *¡Entérate! Escucha el resumen informativo en el podcast de OEM Noticias*\n🎧 ${outputLines[4].split('\n')[1]}`;
        
                return `
🌞 ¡Buenos días, Parral!
🌡️ Clima para hoy:
Mínima ${weather.min}°C | Máxima ${weather.max}°C
📰 EN LA PORTADA DE EL SOL DE PARRAL
https://oem.com.mx/elsoldeparral

🚨 - Titulares de hoy -
        
${firstFour.join('\n\n')}
        
${podcast}
                `.trim();
            }
        }
    };

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

    outputText.value = finalText;
    
    copyButton.disabled = false;
    copyButton.classList.add("enabled");
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
                cityKey: cityKey
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
        const response = await fetch(`/get-weather?cityKey=${cityKey}`);
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
