require('dotenv').config()
const express = require('express');
const axios = require('axios');
const COS = require('cos-nodejs-sdk-v5');
const { PassThrough } = require('stream');
const cors = require('cors');
const mime = require('mime-types');






const app = express();
const port = process.env.SERVICE_PORT || 13847;
// 使用 CORS 中间件
app.use(cors());
app.use(express.json());

const bucketName = process.env.COS_BUCKET_NAME
const region = process.env.COS_REGION
const cdnJsBase = 'https://cdnjs.cloudflare.com/ajax/libs';

// const selfCdnBase = 'https://cdnjs-1300109351.cos.ap-guangzhou.myqcloud.com';
const selfCdnBase = `${process.env.COS_CUSTOM_DOMAIN}${process.env.COS_LIB_FOLDER || ''}`;

const selfCdnURL = (name, version, key) => `${selfCdnBase}/${name}/${version}/${key}`;

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
});



// 统一错误响应格式
const createResponse = (code = 200,data, msg = 'ok') => ({
  code,
  data,
  msg,
});



// 上传文件到腾讯云 COS 的函数（支持自动识别 Content-Type）
const uploadToCOS = (nReq, key) => {
  return new Promise((resolve, reject) => {
    // 自动识别文件类型
    const contentType = mime.lookup(key) || 'application/octet-stream';
    // https://cloud.tencent.com/document/product/436/64980#b3d559f5-8e7e-4786-8341-1d37fd2bc269
    cos.putObject({
      Bucket: bucketName,
      Region: region,
      Key: key,
      Body: nReq,

      // 设置文件类型
      ContentType: contentType,

      // 设置为 inline 防止浏览器强制下载
      ContentDisposition: 'inline',

    }, (err, data) => {
      if (err) {
        console.log(`上传失败: ${key}`, err);
        reject(err);
      } else {
        console.log(`上传成功: ${key}, 类型: ${contentType}`);
        resolve(data);
      }
    });
  });
};
// 流式处理错误处理
const handleStreamErrors = (sourceStream, targetStream) => {
  sourceStream.on('error', err => {
    console.error('下载流错误:', err);
    targetStream.destroy(err);
  });

  targetStream.on('error', err => {
    console.error('上传流错误:', err);
    sourceStream.destroy();
  });
};


app.post('/api/upload', async (req, res) => {
  const { name, version , key} = req.body || {};

  if (!name || !version || !key) {
    return res.status(400).json({ code: 400, msg: '参数错误' });
  }

  const selfFileURL = selfCdnURL(name, version, key);
  try {
    const existCheck = await axios(selfFileURL, {
      method: 'HEAD',
    });
    if (existCheck.status === 200) {
      const etag = existCheck.headers.etag;
      let hash = etag.replace(/"/g, '');
      hash = hash.split('.')[0];

      return  res.json({ code: 200, data: {
          hash,
          key: selfFileURL.replace(`${selfCdnBase}/`, ''),
        }, msg: 'ok' });
    }
  } catch (e) {
    if (e.response && e.response.status !== 404) {
      console.error('文件检查错误:', e.message);
    }
  }


  const url = `${cdnJsBase}/${name}/${version}/${key}`
  try {
    const response = await axios({ method: 'get', url, responseType: 'stream' });
    const nReq = response.data
    const passThrough = new PassThrough();
    const uploadKey = `${name}/${version}/${key}`
    // 流错误处理
    handleStreamErrors(response.data, passThrough);
    const uploadRes = await uploadToCOS(nReq.pipe(passThrough), uploadKey, )
    // 给前端响应json {code: 200, data: uploadRes, msg: 'ok'}
    res.json({ code: 200, data: {
        // uploadRes,
        key: uploadKey
      }, msg: 'ok' });
  } catch (error) {
    res.status(500).json({ code: 500, msg: 'Error downloading file: ' + error.message });
  }
});
// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error(err); // 记录错误
  const response = createResponse(500, null,'内部服务器错误');

  if (err.status) {
    response.code = err.status;
    response.msg = err.message || response.msg;
  }

  res.status(err.status || 500).json(response);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
