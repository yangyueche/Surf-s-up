import { S3 } from 'aws-sdk'
import config from '../config'
import fs from 'fs'

const bucketName = 'surfs-up-s3'
const region = 'ap-southeast-1'
const accessKey = config.S3_ACCESS_KEY
const accessSecret = config.S3_ACCESS_SECRET

const s3 = new S3({
  region,
  accessKeyId: accessKey,
  secretAccessKey: accessSecret,
})

export async function uploadFile(file: { path: fs.PathLike; filename: any }) {
  const fileStream = fs.createReadStream(file.path)

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
    ContentType: 'image/png',
  }
  return s3.upload(uploadParams).promise()
}
