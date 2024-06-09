
require("dotenv").config();
const AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SECRETACCESSKEY,
    region: "eu-west-1"
})

const s3 = new AWS.S3();

function getSignedUrl(bucketName, objectKey, expiresInSeconds) {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: expiresInSeconds
    }

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        })
    })
}

module.exports = {getSignedUrl}