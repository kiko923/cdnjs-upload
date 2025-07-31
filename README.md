
## 环境变量
### 后端
可以修改.env文件，或者直接在环境变量中设置；
````
COS_BUCKET_NAME=cdn # Bucket名称
COS_REGION=ap- # Bucket所在地域
COS_SECRET_ID=11 # SecretId
COS_SECRET_KEY=22 # SecretKey

#自定义域名
COS_CUSTOM_DOMAIN=https://cdnjs.znnu.com

#存储库文件夹；结尾不带斜杠
COS_LIB_FOLDER=

````

### 前端
在前端项目里的 .env.production 修改；修改后重新打包
````
# cdn域名
VUE_APP_CDN_DOMAIN=https://cdnjs.znnu.com
# cdn文件夹; 根： /  ;  子： /ajax/; 结尾必须有/；
VUE_APP_CDN_FILE_FOLDER=/

````
.env.development 开发环境变量
.env.production 生产环境变量

## 开发打包
### 前端

#### 安装依赖
不论开发还是打包，都需要安装依赖
````
npm install --registry=https://registry.npmmirror.com
````



#### 打包命令
````
npm run build
````

### 后端


#### 安装依赖
不论开发还是生产环境运行，都需要安装依赖
````
npm install --registry=https://registry.npmmirror.com
````


#### 启动命令
````
npm run start
````



## 部署
### 前端
打包后将 dist 文件夹上传到 服务器，都是静态文件




### 后端
将除了 node_modules 文件夹外的文件上传到 服务器


安装依赖，并且运行。使用进程管理工具管理，一般是 pm2；



### nginx 配置
前端 nginx 配置 增加如下配置

````
  location / {
        try_files $uri $uri/ /index.html;  # 尝试找到文件，否则重定向到 index.html
    }

    location /api/ {
        proxy_pass http://localhost:13847/api/;  # 反向代理到后端服务
        proxy_set_header Host $host;  # 保留原始主机头
        proxy_set_header X-Real-IP $remote_addr;  # 客户端真实IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 转发的IP
        proxy_set_header X-Forwarded-Proto $scheme;  # 转发的协议
    }
````


### 更换配置
如更换cos 自定义域名，修改前后端的环境变量
