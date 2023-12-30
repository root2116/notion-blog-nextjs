const { Client } = require("@notionhq/client");
const AWS = require("aws-sdk");
const Jimp = require('jimp');
require('dotenv').config({ path: '.env.local' });


const daysToGoBack = process.argv[2] ? parseInt(process.argv[2]) : 7;

const bucketName = 'just-an-asile'
const axios = require('axios');
// Notion APIクライアントの初期化
const notion = new Client({ auth: process.env.NOTION_TOKEN });

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



AWS.config.update({
    region: 'ap-northeast-1', // 適切なリージョンに設定
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
});
const s3 = new AWS.S3();


async function checkFileExistsInS3(bucket, key) {
    try {
        await s3.headObject({ Bucket: bucket, Key: key }).promise();
        // File exists
        return true;
    } catch (error) {
        // Check the error code - 'NotFound' means the object doesn't exist
        if (error.code === 'NotFound') {
            // File does not exist
            return false;
        }
        // Some other error occurred
        console.error('Error occurred while checking file existence in S3:', error);
        throw error;
    }
}

async function uploadToS3(buffer, fileName, bucket) {
    const params = {
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: 'image/png',
        ACL: 'public-read', // Set this if you want the file to be publicly accessible
    };

    await s3.upload(params).promise();
    return `https://${bucket}.s3.ap-northeast-1.amazonaws.com/${fileName}`;
}


async function getPagesFromDatabase(databaseId) {
    let pages = [];
    let startCursor;

    while (true) {
        const response = await notion.databases.query({
            start_cursor: startCursor,
            database_id: databaseId,
        });

        pages = pages.concat(response.results);

        if (!response.has_more) {
            break;
        }

        startCursor = response.next_cursor;
    }

    return pages;
}


async function getNotionBlocks(pageId) {
    let blocks = [];
    let startCursor;

    while (true) {
        const response = await notion.blocks.children.list({
            start_cursor: startCursor,
            block_id: pageId,
            page_size: 50 // 最大ページサイズ
        });

        blocks = blocks.concat(response.results);

        if (!response.has_more) {
            break;
        }

        startCursor = response.next_cursor;
    }

    return blocks;
}


async function uploadImagesFromNotionToS3(databaseId, s3BucketName, days) {
    try {
        // データベースからすべてのページを取得
        const pages = await getPagesFromDatabase(databaseId);

        // 現在の日付から指定された日数分遡った日付を取得
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        for (const page of pages) {
            
            const pagePubDate = new Date(page.properties['Pub Date'].date.start);
            
            
            if (pagePubDate < cutoffDate) {
                console.log('Skipping page:', pagePubDate);
                continue; // 指定された日数より前のページはスキップ
            }

            const blocks = await getNotionBlocks(page.id);

            // 画像ブロックのみをフィルタリング
            const imageBlocks = blocks.filter(block => block.type === 'image');

            // 画像ブロックの処理...
            for (const block of imageBlocks) {
                const imageUrl = block.image.file.url;
                const imageName = block.id + '.png';  // 画像名をブロックIDから生成

                // 画像をダウンロードしてバッファに格納
               
                const buffer = await downloadAndResizeImage(imageUrl, 1000)

                // S3にアップロード
                const s3Url = await uploadToS3(buffer, imageName, s3BucketName);
                console.log('Uploaded to S3:', s3Url);
            }

            // ページのサムネイル画像を処理
            const thumbnailUrl = page.properties.Thumbnail.files[0]?.file?.url
            if(thumbnailUrl){
                const imageName = `${page.id}.png`
                const buffer = await downloadAndResizeImage(thumbnailUrl, 1000)
                const s3Url = await uploadToS3(buffer, imageName, s3BucketName);
                console.log('Uploaded to S3:', s3Url);
                // Replace the thumbnail URL
                page.properties.Thumbnail.files[0].file.url = `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${imageName}`
                
            }
        }
    } catch (error) {
        console.error('Error uploading images from Notion to S3:', error);
    }
}

// この関数を呼び出してNotionのページから画像をアップロード
uploadImagesFromNotionToS3(process.env.NOTION_DATABASE_ID, bucketName, daysToGoBack);
