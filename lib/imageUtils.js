import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const publicFolder = path.join(process.cwd(), 'public')

export async function downloadAndSaveImage(imgUrl, imgPath) {
    

    if (!fs.existsSync(imgPath)) {
        const response = await axios({
            method: 'GET',
            url: imgUrl,
            responseType: 'arraybuffer',
        })

        await fs.promises.writeFile(imgPath, response.data)
    }

}
