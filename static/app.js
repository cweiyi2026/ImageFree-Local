// ImageFree Local - 前端逻辑
(() => {
    'use strict';

    // ===== DOM 元素 =====
    // 模式标签页
    const modeTabs = document.querySelectorAll('.mode-tab');
    const panels = document.querySelectorAll('.generator-panel');

    // 文生图
    const promptEl = document.getElementById('prompt');
    const negativePromptEl = document.getElementById('negative_prompt');
    const aspectRatioEl = document.getElementById('aspect_ratio');
    const providerEl = document.getElementById('provider');
    const seedEl = document.getElementById('seed');
    const stepsEl = document.getElementById('steps');
    const guidanceScaleEl = document.getElementById('guidance_scale');
    const generateBtn = document.getElementById('generate_btn');

    // 图生图
    const img2imgImageEl = document.getElementById('img2img_image');
    const img2imgPromptEl = document.getElementById('img2img_prompt');
    const img2imgNegativePromptEl = document.getElementById('img2img_negative_prompt');
    const img2imgProviderEl = document.getElementById('img2img_provider');
    const img2imgStrengthEl = document.getElementById('img2img_strength');
    const img2imgStrengthValueEl = document.getElementById('img2img_strength_value');
    const img2imgSeedEl = document.getElementById('img2img_seed');
    const img2imgStepsEl = document.getElementById('img2img_steps');
    const img2imgGuidanceScaleEl = document.getElementById('img2img_guidance_scale');
    const img2imgBtn = document.getElementById('img2img_btn');

    // 背景移除
    const removebgImageEl = document.getElementById('removebg_image');
    const removebgProviderEl = document.getElementById('removebg_provider');
    const removebgBtn = document.getElementById('removebg_btn');

    // 通用
    const btnTexts = document.querySelectorAll('.btn-text');
    const btnLoadings = document.querySelectorAll('.btn-loading');
    const resultSection = document.getElementById('result_section');
    const resultImage = document.getElementById('result_image');
    const resultMeta = document.getElementById('result_meta');
    const downloadBtn = document.getElementById('download_btn');
    const regenerateBtn = document.getElementById('regenerate_btn');
    const galleryGrid = document.getElementById('gallery_grid');

    // 状态
    let currentMode = 'txt2img';
    let lastRequest = null;
    let history = JSON.parse(localStorage.getItem('imagefree_history') || '[]');
    const MAX_HISTORY = 50;

    // ===== 工具函数 =====
    function setGenerating(btn, isGenerating) {
        btn.disabled = isGenerating;
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        if (btnText) btnText.style.display = isGenerating ? 'none' : 'inline';
        if (btnLoading) btnLoading.style.display = isGenerating ? 'inline-flex' : 'none';
    }

    function formatMeta(res, mode) {
        const parts = [
            `引擎: ${res.provider}`,
            res.seed ? `种子: ${res.seed}` : null,
            res.image_url?.startsWith('data:') ? '占位图' : '真实生成'
        ].filter(Boolean);
        return parts.join(' · ');
    }

    function addToHistory(req, res, mode) {
        const entry = {
            id: Date.now(),
            mode,
            prompt: req.prompt || req.image_name || '',
            negative_prompt: req.negative_prompt || '',
            aspect_ratio: req.aspect_ratio || '',
            provider: req.provider,
            strength: req.strength || null,
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
            const modeLabel = entry.mode === 'img2img' ? '图生图' : entry.mode === 'removebg' ? '背景移除' : '文生图';
            item.innerHTML = `
                <img src="${entry.image_url}" alt="${(entry.prompt || '').slice(0, 50)}" loading="lazy">
                <div class="gallery-meta">${modeLabel} · ${(entry.prompt || '').slice(0, 35)}</div>
            `;
            item.addEventListener('click', () => showResult(entry));
            galleryGrid.appendChild(item);
        });
    }

    function showResult(entry) {
        resultImage.src = entry.image_url;
        let meta = `${entry.provider}`;
        if (entry.aspect_ratio) meta += ` · ${entry.aspect_ratio}`;
        if (entry.strength) meta += ` · 强度: ${entry.strength}`;
        meta += ` · ${new Date(entry.timestamp).toLocaleString()}`;
        resultMeta.textContent = meta;
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ===== API 调用 =====
    async function callApi(endpoint, body, isFormData = false) {
        const options = {
            method: 'POST'
        };
        if (isFormData) {
            options.body = body;
        } else {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: 'Network error' }));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    // ===== 事件处理 =====
    // 模式切换
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchMode(mode);
        });
    });

    function switchMode(mode) {
        currentMode = mode;
        modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
        panels.forEach(p => p.classList.toggle('active', p.id === `panel_${mode}`));
        resultSection.style.display = 'none';
    }

    // 文生图
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

        lastRequest = { ...req, mode: 'txt2img' };
        setGenerating(generateBtn, true);
        resultSection.style.display = 'none';

        try {
            const res = await callApi('/api/generate', req);
            if (!res.success) throw new Error(res.error || '生成失败');
            showResult({ ...res, ...req, timestamp: new Date().toISOString() });
            addToHistory(req, res, 'txt2img');
        } catch (err) {
            alert(`生成失败: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(generateBtn, false);
        }
    }

    // 图生图
    async function handleImg2Img() {
        const file = img2imgImageEl.files[0];
        if (!file) {
            alert('请选择输入图片');
            return;
        }
        const prompt = img2imgPromptEl.value.trim();
        if (!prompt) {
            alert('请输入提示词');
            img2imgPromptEl.focus();
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', prompt);
        formData.append('negative_prompt', img2imgNegativePromptEl.value.trim());
        formData.append('provider', img2imgProviderEl.value);
        formData.append('strength', img2imgStrengthEl.value);
        if (img2imgSeedEl.value) formData.append('seed', img2imgSeedEl.value);
        if (img2imgStepsEl.value) formData.append('steps', img2imgStepsEl.value);
        if (img2imgGuidanceScaleEl.value) formData.append('guidance_scale', img2imgGuidanceScaleEl.value);

        lastRequest = {
            mode: 'img2img',
            prompt,
            negative_prompt: img2imgNegativePromptEl.value.trim(),
            provider: img2imgProviderEl.value,
            strength: parseFloat(img2imgStrengthEl.value),
            seed: img2imgSeedEl.value ? parseInt(img2imgSeedEl.value) : undefined,
            image_name: file.name
        };
        setGenerating(img2imgBtn, true);
        resultSection.style.display = 'none';

        try {
            const res = await callApi('/api/img2img', formData, true);
            if (!res.success) throw new Error(res.error || '生成失败');
            showResult({ ...res, ...lastRequest, timestamp: new Date().toISOString() });
            addToHistory(lastRequest, res, 'img2img');
        } catch (err) {
            alert(`生成失败: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(img2imgBtn, false);
        }
    }

    // 背景移除
    async function handleRemoveBg() {
        const file = removebgImageEl.files[0];
        if (!file) {
            alert('请选择输入图片');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('provider', removebgProviderEl.value);

        lastRequest = {
            mode: 'removebg',
            provider: removebgProviderEl.value,
            image_name: file.name
        };
        setGenerating(removebgBtn, true);
        resultSection.style.display = 'none';

        try {
            const res = await callApi('/api/remove-bg', formData, true);
            if (!res.success) throw new Error(res.error || '处理失败');
            showResult({ ...res, ...lastRequest, timestamp: new Date().toISOString() });
            addToHistory(lastRequest, res, 'removebg');
        } catch (err) {
            alert(`处理失败: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(removebgBtn, false);
        }
    }

    // 重绘强度滑块显示
    img2imgStrengthEl.addEventListener('input', () => {
        img2imgStrengthValueEl.textContent = img2imgStrengthEl.value;
    });

    // 绑定按钮
    generateBtn.addEventListener('click', handleGenerate);
    img2imgBtn.addEventListener('click', handleImg2Img);
    removebgBtn.addEventListener('click', handleRemoveBg);

    // Enter 键生成 (Ctrl+Enter)
    promptEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleGenerate();
        }
    });
    img2imgPromptEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleImg2Img();
        }
    });

    // 下载
    downloadBtn.addEventListener('click', () => {
        if (!resultImage.src) return;
        const a = document.createElement('a');
        a.href = resultImage.src;
        a.download = `imagefree-${Date.now()}.png`;
        a.click();
    });

    // 重新生成
    regenerateBtn.addEventListener('click', () => {
        if (!lastRequest) return;
        if (lastRequest.mode === 'txt2img') handleGenerate();
        else if (lastRequest.mode === 'img2img') handleImg2Img();
        else if (lastRequest.mode === 'removebg') handleRemoveBg();
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