#!/bin/bash
# 将yilu-api Docker镜像发布到Docker Hub的脚本

# 彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== 发布 Yilu API Docker 镜像到 Docker Hub =====${NC}"

# 确保Docker已安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker未安装${NC}"
    exit 1
fi

# 版本号
VERSION=$(date +"%Y%m%d%H%M")
echo -e "${YELLOW}使用版本号: ${VERSION}${NC}"

# 平台设置
PLATFORM="linux/amd64"
echo -e "${YELLOW}构建平台: ${PLATFORM}${NC}"

# 获取Docker Hub用户名
echo -e "${YELLOW}请输入您的Docker Hub用户名:${NC}"
read -r DOCKER_USERNAME

# 检查用户名是否为空
if [ -z "$DOCKER_USERNAME" ]; then
    echo -e "${RED}错误: 用户名不能为空${NC}"
    exit 1
fi

# 是否需要登录
echo -e "${YELLOW}是否需要登录Docker Hub? (y/n)${NC}"
read -r NEED_LOGIN

if [ "$NEED_LOGIN" = "y" ] || [ "$NEED_LOGIN" = "Y" ]; then
    echo -e "${YELLOW}登录Docker Hub...${NC}"
    docker login
    
    # 检查登录状态
    if [ $? -ne 0 ]; then
        echo -e "${RED}登录失败，退出操作${NC}"
        exit 1
    fi
    echo -e "${GREEN}登录成功${NC}"
fi

# 构建镜像
IMAGE_NAME="${DOCKER_USERNAME}/yilu-api"
echo -e "${YELLOW}使用指定平台 ${PLATFORM} 构建Docker镜像...${NC}"

# 创建 buildx builder 实例（如果不存在）
echo -e "${YELLOW}设置 Docker buildx...${NC}"
if ! docker buildx inspect mybuilder &>/dev/null; then
    docker buildx create --name mybuilder --use
else
    docker buildx use mybuilder
fi
docker buildx inspect --bootstrap

# 使用 buildx 构建特定平台的镜像
echo -e "${YELLOW}开始构建 ${PLATFORM} 平台的镜像...${NC}"
docker buildx build --platform=${PLATFORM} \
    --tag ${IMAGE_NAME}:${VERSION} \
    --tag ${IMAGE_NAME}:latest \
    --load \
    .

# 检查构建状态
if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败，退出操作${NC}"
    exit 1
fi
echo -e "${GREEN}镜像构建成功${NC}"

# 推送镜像
echo -e "${YELLOW}是否推送镜像到Docker Hub? (y/n)${NC}"
read -r PUSH_IMAGES

if [ "$PUSH_IMAGES" = "y" ] || [ "$PUSH_IMAGES" = "Y" ]; then
    echo -e "${YELLOW}推送镜像到Docker Hub...${NC}"
    docker push ${IMAGE_NAME}:${VERSION}
    docker push ${IMAGE_NAME}:latest
    
    echo -e "${GREEN}镜像已成功推送到Docker Hub${NC}"
    echo -e "${GREEN}您可以使用以下命令拉取镜像:${NC}"
    echo -e "${YELLOW}docker pull ${IMAGE_NAME}:latest${NC}"
    echo -e "${YELLOW}docker pull ${IMAGE_NAME}:${VERSION}${NC}"
else
    echo -e "${YELLOW}镜像已构建并标记，但未推送${NC}"
    echo -e "${YELLOW}您可以稍后使用以下命令推送:${NC}"
    echo -e "${GREEN}docker push ${IMAGE_NAME}:latest${NC}"
    echo -e "${GREEN}docker push ${IMAGE_NAME}:${VERSION}${NC}"
fi

# 创建使用说明
echo -e "${YELLOW}是否创建Docker Hub使用说明文件? (y/n)${NC}"
read -r CREATE_README

if [ "$CREATE_README" = "y" ] || [ "$CREATE_README" = "Y" ]; then
    README_FILE="DOCKER_HUB_README.md"
    echo -e "${YELLOW}创建${README_FILE}文件...${NC}"
    
    cat > $README_FILE << EOL
# Yilu API

Yilu API是一个基于Next.js的服务，用于转发请求到Dify AI服务。

## 快速开始

### 使用Docker拉取并运行

\`\`\`bash
# 拉取镜像 (平台: ${PLATFORM})
docker pull ${IMAGE_NAME}:latest

# 运行容器
docker run -d \\
  --name yilu-api \\
  -p 9090:9090 \\
  -e DIFY_API_KEY="your_api_key_here" \\
  -e DIFY_BASE_URL="http://sandboxai.jinzhibang.com.cn" \\
  -e DIFY_API_URL="http://sandboxai.jinzhibang.com.cn/v1" \\
  -e DIFY_WORKFLOW_ID="your_workflow_id" \\
  ${IMAGE_NAME}:latest
\`\`\`

### 使用Docker Compose

\`\`\`yaml
version: '3.8'

services:
  yilu-api:
    image: ${IMAGE_NAME}:latest
    # 构建平台: ${PLATFORM}
    container_name: yilu-api
    restart: unless-stopped
    ports:
      - "9090:9090"
    environment:
      - NODE_ENV=production
      - DIFY_API_KEY=your_api_key_here
      - DIFY_BASE_URL=http://sandboxai.jinzhibang.com.cn
      - DIFY_API_URL=http://sandboxai.jinzhibang.com.cn/v1
      - DIFY_WORKFLOW_ID=your_workflow_id
\`\`\`

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|-------|
| DIFY_API_KEY | Dify API密钥 | - |
| DIFY_BASE_URL | Dify API基础URL | http://sandboxai.jinzhibang.com.cn |
| DIFY_API_URL | Dify API URL | http://sandboxai.jinzhibang.com.cn/v1 |
| DIFY_WORKFLOW_ID | Dify工作流ID | - |
| USE_MOCK_DATA | 是否使用模拟数据 | false |

## API端点

### \`POST /api/generate_titles\`

生成内容标题。

**请求格式:**

\`\`\`json
{
  "openid": "wx_abcd1234efgh5678",
  "direction": "心血管疾病预防与保健",
  "word_count": 15,
  "name": "张医生",
  "unit": "北京协和医院心内科"
}
\`\`\`

**响应:**

服务器发送事件(SSE)流，包含进度更新和最终结果。

## 版本信息

- 最新稳定版: \`latest\`
- 当前版本: \`${VERSION}\`
- 构建平台: \`${PLATFORM}\`

## 更多信息

访问[GitHub仓库](https://github.com/your-username/yilu-api)获取更多信息。
EOL
    
    echo -e "${GREEN}${README_FILE}文件已创建${NC}"
    echo -e "${YELLOW}您可以使用此文件内容作为Docker Hub仓库的描述${NC}"
fi

echo -e "${GREEN}完成!${NC}" 