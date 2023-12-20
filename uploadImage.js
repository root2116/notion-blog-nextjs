import { Client } from "@notionhq/client"
import { uploadToS3 } from './lib/awsUtils'; // S3モジュールのインポート

// Notion APIクライアントの初期化
const notion = new Client({ auth: process.env.NOTION_TOKEN });

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


async function uploadImagesFromNotionToS3(notionPageId, s3BucketName) {
    try {
        // Notionページからすべてのブロックを取得
        const blocks = await getNotionBlocks(notionPageId);

        // 画像ブロックのみをフィルタリング
        const imageBlocks = blocks.results.filter(block => block.type === 'image');

        for (const block of imageBlocks) {
            const imageUrl = block.image.file.url;
            const imageName = block.id + '.png';  // 画像名をブロックIDから生成

            // 画像をダウンロードしてバッファに格納
            const response = await fetch(imageUrl);
            const buffer = await response.buffer();

            // S3にアップロード
            const s3Url = await uploadToS3(buffer, imageName, s3BucketName);
            console.log('Uploaded to S3:', s3Url);
        }
    } catch (error) {
        console.error('Error uploading images from Notion to S3:', error);
    }
}

// この関数を呼び出してNotionのページから画像をアップロード
uploadImagesFromNotionToS3('your-notion-page-id', 'your-s3-bucket-name');
