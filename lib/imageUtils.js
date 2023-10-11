import axios from 'axios';
import path from 'path';
const Jimp = require('jimp');





async function downloadAndResizeImage(imageUrl, maxWidth = 1000) {
    try {
        // Download image
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
        });

        // Read and resize image using Jimp
        const image = await Jimp.read(response.data);
        if (image.bitmap.width > maxWidth) {
            image.resize(maxWidth, Jimp.AUTO);
        }

        // Get buffer of the resized image with the original MIME type
        const mime = image.getMIME();
        const buffer = await image.getBufferAsync(mime);
        return buffer;
    } catch (error) {
        console.error('Error occurred while downloading and resizing image:', error);
        throw error;
    }
}

module.exports = {
    downloadAndResizeImage,
}