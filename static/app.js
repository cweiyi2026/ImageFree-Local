// ImageFree Local - 前端逻辑
(() => {
    'use strict';

    // DOM 元素
    const promptEl = document.getElementById('prompt');
    const negativePromptEl = document.getElementById('negative_prompt');
    const aspectRatioEl = document.getElementById('aspect_ratio');
    const providerEl = document.getElementById('provider');
    const seedEl = document.getElementById('seed');
    const stepsEl = document.getElementById('steps');
    const guidanceScaleEl = document.getElementById('guidance_scale');
    const generateBtn = document.getElementById('generate_btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');
    const resultSection = document.getElementById('result_section');
    const resultImage = document.getElementById('result_image');
    const resultMeta = document.getElementById('result_meta');
    const downloadBtn = document.getElementById('download_btn');
    const regenerateBtn = document.getElementById('regenerate_btn');
    const galleryGrid = document.getElementById('gallery_grid');

    // 状态
    let lastRequest = null;
    let history = JSON.parse(localStorage.getItem('imagefree_history') || '[]');
    const MAX_HISTORY = 50;

    // 工具函数
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    function setGenerating(isGenerating) {
        generateBtn.disabled = isGenerating;
        btnText.style.display = isGenerating ? 'none' : 'inline';
        btnLoading.style.display = isGenerating ? 'inline-flex' : 'none';
    }

    function formatMeta(res) {
        const parts = [
            `引擎: ${res.provider}`,
            res.seed ? `种子: ${res.seed}` : null,
            res.image_url?.startsWith('data:') ? '占位图' : '真实生成'
        ].filter(Boolean);
        return parts.join(' · ');
    }

    function addToHistory(req, res) {
        const entry = {
            id: Date.now(),
            prompt: req.prompt,
            negative_prompt: req.negative_prompt,
            aspect_ratio: req.aspect_ratio,
            provider: req.provider,
            seed: res.seed,
            image_url: res.image_url,
            timestamp: new Date().toISOString()
        };
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem('imagefree_history', JSON.stringify(history));
        renderGallery();
    }

    function renderGallery() {
        galleryGrid.innerHTML = '';
        history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${entry.image_url}" alt="${entry.prompt.slice(0, 50)}" loading="lazy">
                <div class="gallery-meta">${entry.prompt.slice(0, 40)}</div>
            `;
            item.addEventListener('click', () => showResult(entry));
            galleryGrid.appendChild(item);
        });
    }

    function showResult(entry) {
        resultImage.src = entry.image_url;
        resultMeta.textContent = `${entry.provider} · ${entry.aspect_ratio} · ${new Date(entry.timestamp).toLocaleString()}`;
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function generateImage(req) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Network error' }));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    async function handleGenerate() {
        const prompt = promptEl.value.trim();
        if (!prompt) {
            alert('请输入提示词');
            promptEl.focus();
            return;
        }

        const req = {
            prompt,
            negative_prompt: negativePromptEl.value.trim(),
            aspect_ratio: aspectRatioEl.value,
            provider: providerEl.value,
            seed: seedEl.value ? parseInt(seedEl.value, 10) : undefined,
            steps: stepsEl.value ? parseInt(stepsEl.value, 10) : undefined,
            guidance_scale: guidanceScaleEl.value ? parseFloat(guidanceScaleEl.value) : undefined
        };

        lastRequest = req;
        setGenerating(true);
        resultSection.style.display = 'none';

        try {
            const res = await generateImage(req);
            if (!res.success) {
                throw new Error(res.error || '生成失败');
            }
            showResult({ ...res, ...req, timestamp: new Date().toISOString() });
            addToHistory(req, res);
        } catch (err) {
            alert(`生成失败: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    }

    // 事件绑定
    generateBtn.addEventListener('click', handleGenerate);

    // Enter 键生成 (Ctrl+Enter 或 单行时)
    promptEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleGenerate();
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!resultImage.src) return;
        const a = document.createElement('a');
        a.href = resultImage.src;
        a.download = `imagefree-${Date.now()}.png`;
        a.click();
    });

    regenerateBtn.addEventListener('click', () => {
        if (lastRequest) handleGenerate();
    });

    // 初始化画廊
    renderGallery();

    // 检查可用 providers
    fetch('/api/providers')
        .then(r => r.json())
        .then(data => {
            console.log('Available providers:', data.providers);
        })
        .catch(console.error);

    // 键盘快捷键提示
    console.log('%cImageFree Local', 'color: #00d4aa; font-size: 20px; font-weight: bold;');
    console.log('快捷键: Ctrl+Enter 生成图片');
})();