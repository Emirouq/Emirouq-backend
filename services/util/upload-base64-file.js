const AWS = require("aws-sdk");
const { v4: uuid } = require("uuid");

const keys = require("../../config/keys").aws;

//upload base64 file.
const uploadBase64File = async ({ base64, fileName }, folder) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const base64Data = new Buffer.from(
        base64.split(";")[1].replace(/^base64,/, ""),
        "base64"
      );
      const type = base64.split(";")[0].split("/")[1];
      const name = `${fileName || ""}` + "/" + uuid() + "." + type;

      const s3 = new AWS.S3({
        accessKeyId: keys.accessKeyId,
        secretAccessKey: keys.secretAccessKey,
        region: keys.region,
        Bucket: keys.bucketName,
      });
      const params = {
        Bucket: keys.bucketName,
        Key: `${folder}/${name}`,
        Body: base64Data,
        ACL: "public-read",
      };
      const uploadData = await s3.upload(params).promise();
      return resolve({ ...uploadData, type });
    } catch (err) {
      reject(err);
      return err;
    }
  });
};
module.exports = uploadBase64File;
