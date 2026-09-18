# ImageFree Local

本地优先、多引擎的免费 AI 图片生成 Web UI。

## 功能特性

- 🎨 **多 Provider 架构**：Mock(演示) / Zhipu GLM-Image(云端) / Z-Image-Turbo(本地)
- 🖼️ **完整前端**：提示词、反向提示词、宽高比、种子、高级参数
- 📚 **本地历史记录**：localStorage 持久化，点击缩放查看
- ⚡ **即开即用**：Mock 模式零依赖、零配置、秒开
- 🔧 **可扩展**：Provider 基类，新增引擎只需实现 `generate()` 方法

## 快速开始

### 1. 安装依赖
```bash
cd D:\HermesProjects\img-gen-web-single
"C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\pip.exe" install -r requirements.txt
```

### 2. 启动服务
**方式 A：双击 `start.bat`** (推荐，自动激活虚拟环境、杀端口)

**方式 B：命令行**
```bash
"C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe" main.py
```

### 3. 打开浏览器
访问 http://localhost:8090

## Provider 说明

| Provider | 状态 | 说明 |
|----------|------|------|
| `mock` | ✅ 就绪 | 生成 SVG 占位图，用于 UI 联调、演示 |
| `zhipu` | 🚧 占位 | 需配置 `ZHIPUAI_API_KEY` 环境变量 |
| `local` | 🚧 占位 | 需安装 `diffusers`(源码版) + `torch` + 下载 Z-Image-Turbo 模型 |

## 配置 Zhipu 云模型

### 方式一：环境变量（推荐，不泄露到代码）
复制 `.env.example` 为 `.env` 并填入密钥：
```bash
copy .env.example .env
```
然后编辑 `.env` 填入你的 API Key：
```
ZHIPUAI_API_KEY=你的密钥
```

或直接在终端设置（临时/永久）：
```bash
# 临时（当前终端）
set ZHIPUAI_API_KEY=你的密钥

# 永久（用户级）
setx ZHIPUAI_API_KEY "你的密钥"
```

设置后**重启 start.bat** 即可生效。

### 方式二：.env 文件（项目根目录）
项目已内置 `python-dotenv` 兼容读取，在项目根目录创建 `.env`：
```
ZHIPUAI_API_KEY=你的密钥
```
> ⚠️ `.env` 已在 `.gitignore` 中，**绝对不要提交到 Git**。

然后在下拉框选择 "Zhipu GLM-Image (云端)"。

## 配置本地 Z-Image-Turbo (进阶)

**硬件要求**：16GB+ VRAM (bf16) / 8GB VRAM 需量化/offload

```bash
# 1. 安装最新 diffusers (源码版，支持 Z-Image)
pip install git+https://github.com/huggingface/diffusers

# 2. 安装 torch (根据 CUDA 版本选择)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 3. 下载模型 (走 hf-mirror.com)
HF_ENDPOINT=https://hf-mirror.com hf download Tongyi-MAI/Z-Image-Turbo --local-dir models/Z-Image-Turbo

# 4. 在 main.py 的 LocalProvider 中实现真实推理逻辑
```

## 项目结构

```
img-gen-web-single/
├── main.py              # FastAPI 后端
├── start.py             # 启动脚本 (双击可运行)
├── start.bat            # Windows 批处理启动
├── requirements.txt     # Python 依赖
├── static/
│   ├── index.html       # 前端页面
│   ├── style.css        # 样式
│   └── app.js           # 前端逻辑
└── outputs/             # 生成图片输出目录 (自动创建)
```

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 前端页面 |
| `/api/generate` | POST | 生成图片 |
| `/api/providers` | GET | 可用 Provider 列表 |

### 生成请求示例
```json
{
  "prompt": "A futuristic cat wearing sunglasses, neon lights, cyberpunk",
  "negative_prompt": "blurry, low quality",
  "aspect_ratio": "16:9",
  "provider": "mock",
  "seed": 42,
  "steps": 20,
  "guidance_scale": 7.5
}
```

## 常见问题

**Q: 端口 8090 被占用？**
A: `start.bat` / `start.py` 会自动尝试杀掉占用进程。手动：`taskkill /F /IM python.exe /FI "WINDOWTITLE eq *8090*"`

**Q: 双击 start.bat 闪退？**
A: 确保使用的是 Hermes 虚拟环境的 Python (`C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`)，不是系统 Python。

**Q: 想把生成的图片保存为文件？**
A: 点击结果图上的"下载图片"按钮，或右键图片"另存为"。

## 下一步开发计划

- [ ] 接入 Zhipu GLM-Image API
- [ ] 接入本地 Z-Image-Turbo (diffusers + CPU offload / 8bit 量化)
- [ ] 图生图 / 局部重绘
- [ ] 批量生成、预设模板
- [ ] Docker 部署支持

## 许可

MIT License - 仅供学习研究使用。