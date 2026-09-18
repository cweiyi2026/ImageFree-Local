from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal, Optional
import os
import uuid
import base64
import io
from pathlib import Path

app = FastAPI(title="ImageFree Local")

# 静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# 数据模型
class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    aspect_ratio: Literal["1:1", "3:4", "4:3", "9:16", "16:9"] = "1:1"
    provider: Literal["mock", "zhipu", "local"] = "mock"
    seed: Optional[int] = None
    steps: Optional[int] = None
    guidance_scale: Optional[float] = None

class Img2ImgRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    provider: Literal["mock", "zhipu", "local"] = "mock"
    strength: float = 0.75  # 0-1，重绘强度
    seed: Optional[int] = None
    steps: Optional[int] = None
    guidance_scale: Optional[float] = None

class RemoveBgRequest(BaseModel):
    provider: Literal["mock", "zhipu", "local"] = "mock"

class GenerateResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    error: Optional[str] = None
    provider: str
    seed: Optional[int] = None

# 尺寸映射
ASPECT_SIZES = {
    "1:1": (1024, 1024),
    "3:4": (768, 1024),
    "4:3": (1024, 768),
    "9:16": (576, 1024),
    "16:9": (1024, 576),
}

# 输出目录
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Provider 基类
class BaseProvider:
    name = "base"
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        raise NotImplementedError
    async def img2img(self, image_data: bytes, req: Img2ImgRequest) -> GenerateResponse:
        raise NotImplementedError
    async def remove_bg(self, image_data: bytes, req: RemoveBgRequest) -> GenerateResponse:
        raise NotImplementedError

# Mock Provider - 返回占位图
class MockProvider(BaseProvider):
    name = "mock"
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        # 生成一个简单的 SVG 占位图
        w, h = ASPECT_SIZES[req.aspect_ratio]
        seed = req.seed or 42
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <rect width="100%" height="100%" fill="#1e1e2e"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="24" fill="#888">
    [Mock] {req.prompt[:60]}{"..." if len(req.prompt) > 60 else ""}
  </text>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="14" fill="#666">
    {w}×{h} • seed: {seed} • {req.provider}
  </text>
</svg>'''
        # 保存为 PNG（用 cairosvg 或直接返回 data URL）
        # 这里直接返回 data URL 避免额外依赖
        b64 = base64.b64encode(svg.encode()).decode()
        return GenerateResponse(
            success=True,
            image_url=f"data:image/svg+xml;base64,{b64}",
            provider=self.name,
            seed=seed
        )

    async def img2img(self, image_data: bytes, req: Img2ImgRequest) -> GenerateResponse:
        # Mock: 返回带提示词的占位图
        w, h = 1024, 1024
        seed = req.seed or 42
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <rect width="100%" height="100%" fill="#1e1e2e"/>
  <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="20" fill="#888">
    [Mock Img2Img] {req.prompt[:50]}{"..." if len(req.prompt) > 50 else ""}
  </text>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="16" fill="#666">
    strength: {req.strength} • seed: {seed}
  </text>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="14" fill="#666">
    输入图片已上传，重绘强度: {int(req.strength*100)}%
  </text>
</svg>'''
        b64 = base64.b64encode(svg.encode()).decode()
        return GenerateResponse(
            success=True,
            image_url=f"data:image/svg+xml;base64,{b64}",
            provider=self.name,
            seed=seed
        )

    async def remove_bg(self, image_data: bytes, req: RemoveBgRequest) -> GenerateResponse:
        # Mock: 返回透明背景占位图
        w, h = 1024, 1024
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <rect width="100%" height="100%" fill="none"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="24" fill="#888">
    [Mock RemoveBg] 背景已移除
  </text>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="system-ui, sans-serif" font-size="14" fill="#666">
    透明背景 PNG (演示)
  </text>
</svg>'''
        b64 = base64.b64encode(svg.encode()).decode()
        return GenerateResponse(
            success=True,
            image_url=f"data:image/svg+xml;base64,{b64}",
            provider=self.name
        )

# Zhipu Provider - 占位，待接入
class ZhipuProvider(BaseProvider):
    name = "zhipu"
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        api_key = os.getenv("ZHIPUAI_API_KEY")
        if not api_key:
            return GenerateResponse(
                success=False,
                error="ZHIPUAI_API_KEY not set",
                provider=self.name
            )
        # TODO: 接入 Zhipu GLM-Image API
        return GenerateResponse(
            success=False,
            error="Zhipu provider not implemented yet",
            provider=self.name
        )

    async def img2img(self, image_data: bytes, req: Img2ImgRequest) -> GenerateResponse:
        return GenerateResponse(
            success=False,
            error="Zhipu img2img not implemented yet",
            provider=self.name
        )

    async def remove_bg(self, image_data: bytes, req: RemoveBgRequest) -> GenerateResponse:
        return GenerateResponse(
            success=False,
            error="Zhipu remove_bg not implemented yet",
            provider=self.name
        )

# Local Provider - Z-Image-Turbo (本地推理，支持 CPU offload)
class LocalProvider(BaseProvider):
    name = "local"
    _pipe = None
    _pipe_lock = None

    @classmethod
    def _get_pipe(cls):
        """懒加载 pipeline，启用 CPU offload 以适配 8GB 显存"""
        if cls._pipe is None:
            import torch
            from diffusers import ZImagePipeline
            import threading
            
            if cls._pipe_lock is None:
                cls._pipe_lock = threading.Lock()
            
            with cls._pipe_lock:
                if cls._pipe is None:  # Double-check
                    # Z-Image-Turbo 在 8GB 显存上即使开启 4-bit 量化 + sequential CPU offload
                    # 也会 OOM。建议用户使用 mock 或 zhipu provider。
                    # 如需本地推理，请使用 16GB+ 显存的 GPU 或更小的模型。
                    raise RuntimeError(
                        "Z-Image-Turbo requires >8GB VRAM even with 4-bit quantization + CPU offload. "
                        "Current GPU: 8GB. Please use 'mock' (demo) or 'zhipu' (cloud) provider, "
                        "or upgrade to a GPU with 16GB+ VRAM for local inference."
                    )
        return cls._pipe

    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        try:
            import torch
            from pathlib import Path
            
            pipe = self._get_pipe()
            
            w, h = ASPECT_SIZES[req.aspect_ratio]
            seed = req.seed or 42
            generator = torch.Generator("cuda").manual_seed(seed)
            
            # Turbo 模型：guidance_scale=0.0, num_inference_steps=9 (实际 8 步)
            steps = req.steps or 9
            guidance = req.guidance_scale if req.guidance_scale is not None else 0.0
            
            print(f"🎨 Generating: {req.prompt[:60]}... ({w}x{h}, steps={steps}, seed={seed})")
            
            # 在线程池中运行阻塞的推理
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _generate():
                with torch.inference_mode():
                    return pipe(
                        prompt=req.prompt,
                        negative_prompt=req.negative_prompt or None,
                        height=h,
                        width=w,
                        num_inference_steps=steps,
                        guidance_scale=guidance,
                        generator=generator,
                    ).images[0]
            
            image = await loop.run_in_executor(None, _generate)
            
            # 保存图片
            filename = f"zimage_{uuid.uuid4().hex[:8]}.png"
            out_path = OUTPUT_DIR / filename
            image.save(out_path)
            
            print(f"✅ Saved to {out_path}")
            
            return GenerateResponse(
                success=True,
                image_url=f"/outputs/{filename}",
                provider=self.name,
                seed=seed
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = str(e) if str(e) else f"{type(e).__name__}: {e.args}"
            return GenerateResponse(
                success=False,
                error=f"Local generation failed: {error_msg}",
                provider=self.name
            )

    async def img2img(self, image_data: bytes, req: Img2ImgRequest) -> GenerateResponse:
        return GenerateResponse(
            success=False,
            error="Local img2img not implemented yet (requires img2img pipeline)",
            provider=self.name
        )

    async def remove_bg(self, image_data: bytes, req: RemoveBgRequest) -> GenerateResponse:
        return GenerateResponse(
            success=False,
            error="Local remove_bg not implemented yet (requires segmentation model)",
            provider=self.name
        )

# Provider 注册表
PROVIDERS = {
    "mock": MockProvider(),
    "zhipu": ZhipuProvider(),
    "local": LocalProvider(),
}

@app.get("/")
async def index():
    return FileResponse("static/index.html")

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    provider = PROVIDERS.get(req.provider)
    if not provider:
        raise HTTPException(400, f"Unknown provider: {req.provider}")
    return await provider.generate(req)

@app.post("/api/img2img", response_model=GenerateResponse)
async def img2img(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    negative_prompt: str = Form(""),
    provider: str = Form("mock"),
    strength: float = Form(0.75),
    seed: Optional[int] = Form(None),
    steps: Optional[int] = Form(None),
    guidance_scale: Optional[float] = Form(None)
):
    provider_obj = PROVIDERS.get(provider)
    if not provider_obj:
        raise HTTPException(400, f"Unknown provider: {provider}")
    
    image_data = await image.read()
    req = Img2ImgRequest(
        prompt=prompt,
        negative_prompt=negative_prompt,
        provider=provider,
        strength=strength,
        seed=seed,
        steps=steps,
        guidance_scale=guidance_scale
    )
    return await provider_obj.img2img(image_data, req)

@app.post("/api/remove-bg", response_model=GenerateResponse)
async def remove_bg(
    image: UploadFile = File(...),
    provider: str = Form("mock")
):
    provider_obj = PROVIDERS.get(provider)
    if not provider_obj:
        raise HTTPException(400, f"Unknown provider: {provider}")
    
    image_data = await image.read()
    req = RemoveBgRequest(provider=provider)
    return await provider_obj.remove_bg(image_data, req)

@app.get("/api/providers")
async def list_providers():
    return {"providers": list(PROVIDERS.keys()), "default": "mock"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)