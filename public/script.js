// const bitlyToken = '88e537465fab711d58bbf247b2ac38ca91fc019d';  // Reemplaza con tu token de Bitly
// const weatherApiKey = 'b7f58c1e6fee4182a7534410251501';  // Reemplaza con tu API Key de WeatherAPI

// Función para abrir el popup
document.getElementById('instructions-button').addEventListener('click', () => {
    document.getElementById('instructions-popup').style.display = 'flex';
});

// Función para cerrar el popup
document.getElementById('close-popup').addEventListener('click', () => {
    document.getElementById('instructions-popup').style.display = 'none';
});

// Cerrar el popup si se hace clic fuera de él
window.addEventListener('click', (event) => {
    const popup = document.getElementById('instructions-popup');
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});


document.getElementById('process-button').addEventListener('click', async () => {
    const inputText = document.getElementById('input-text').value.trim();

    // Validar que el campo no esté vacío
    if (inputText === '') {
        alert('Por favor, pega el texto de las noticias.');
        return;
    }

    // Separar las líneas del texto pegado
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
    console.log('Líneas separadas:', lines); // Ver las líneas que se están separando

    const outputLines = [];
    let currentTitle = '';  // Para guardar el título actual
    let currentPrefix = ''; // Para guardar el prefijo actual (PROGRAMADA: o RÁFAGAS:)

    // Procesar las líneas
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        console.log('Línea procesada:', line);

        // Detectar título con prefijo
        const titleMatch = line.match(/^(PROGRAMADA:|RÁFAGAS:)\s*(.*)$/);

        if (titleMatch) {
            currentPrefix = titleMatch[1].trim();
            currentTitle = titleMatch[2].trim();
            console.log('Título detectado:', currentTitle);
        }

        // Detectar URL en la siguiente línea
        if (line.match(/^https?:\/\//)) {
            const url = line.trim();
            console.log('URL detectada:', url);

            if (currentTitle) {
                let emoji = '';

                // No generar emoji para títulos con prefijo "RÁFAGAS:"
                if (currentPrefix !== 'RÁFAGAS:') {
                    // Llamar al servidor para obtener el emoji correspondiente al título
                    emoji = await getEmojiForTitleFromServer(currentTitle);
                }

                const shortenedUrl = await shortenUrl(url);

                if (shortenedUrl) {
                    // Agregar la noticia al arreglo de resultados
                    if (currentPrefix === 'RÁFAGAS:') {
                        // Solo agregar el emoji de pluma en la línea con "RÁFAGAS:"
                        outputLines.push(`✒️ *RÁFAGAS*\n${currentTitle}\n🔗 ${shortenedUrl}`);
                    } else {
                        // Para otros títulos, agregar el emoji generado
                        outputLines.push(`${emoji} *${currentTitle}*\n🔗 ${shortenedUrl}`);
                    }
                    console.log('Noticia procesada:', currentTitle, shortenedUrl);
                }

                currentTitle = '';  // Resetear el título para la próxima noticia
                currentPrefix = ''; // Resetear el prefijo
            }
        }
    }

    // Ver el contenido final que se va a mostrar en el área de texto
    console.log('Líneas de salida:', outputLines);

    const weather = await getWeather();
    if (!weather) return; // Si hubo un error al obtener el clima, no continuar

    const outputText = `
☀️ *¡Buenos días!* 
🌡️ *Temperatura para hoy*
Mínima ${weather.min}°C | Máxima ${weather.max}°C 

📰 *EN LA PORTADA DE EL HERALDO DE CHIHUAHUA*

${outputLines.join('\n\n')}
    `;

    // Ver el mensaje final generado antes de mostrarlo
    console.log('Mensaje final generado:', outputText);

    document.getElementById('output-text').value = outputText.trim();
});


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
        return data.emoji || '📰'; // Retorna el emoji o uno por defecto
    } catch (error) {
        console.error('Error al obtener el emoji:', error);
        return '📰'; // En caso de error, retornamos un emoji por defecto
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
            body: JSON.stringify({ url: longUrlWithUtm }) // Enviamos la URL al backend
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
        const response = await fetch('/get-weather'); // Hacemos la solicitud al backend
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
