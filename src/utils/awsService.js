
require("dotenv").config();
const {S3Client, GetObjectCommand} = require("@aws-sdk/client-s3");
const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");
const { Credentials } = require("aws-sdk");

const s3Client = new S3Client({
    region: "eu-west-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESSKEYID,
        secretAccessKey: process.env.AWS_SECRETACCESSKEY,
    }
})

async function getSignedUrlForGetObject(bucketName, objectKey, expiresInSeconds) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: `public/${objectKey}`,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
        return url;
    } catch (err) {
        console.log("Error generating signed URL:", err);
        throw err;
    }
}

module.exports = { getSignedUrlForGetObject };
// const AWS = require('aws-sdk');

// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESSKEYID,
//     secretAccessKey: process.env.AWS_SECRETACCESSKEY,
//     region: "eu-west-1"
// })

// const s3 = new AWS.S3();

// function getSignedUrl(bucketName, objectKey, expiresInSeconds) {
//     const params = {
//         Bucket: bucketName,
//         Key: `public/${objectKey}`,
//         Expires: expiresInSeconds
//     }

//     return new Promise((resolve, reject) => {
//         s3.getSignedUrl('getObject', params, (err, url) => {
//             if (err) {
//                 console.log("Errorrrr", err)
//                 reject(err);
//             } else {
//                 resolve(url);
//             }
//         })
//     })
// }

// module.exports = {getSignedUrl}