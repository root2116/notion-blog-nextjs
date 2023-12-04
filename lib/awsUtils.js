import AWS from 'aws-sdk'

AWS.config.update({
    region: 'ap-northeast-1', // 適切なリージョンに設定
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
});
const s3 = new AWS.S3();


export async function checkFileExistsInS3(bucket, key) {
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

module.exports = {
    uploadToS3,
    checkFileExistsInS3,
}
