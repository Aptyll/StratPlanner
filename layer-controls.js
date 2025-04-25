// Layer Controls logic for StratPlanner2 (vanilla JS)
// Handles switching, adding, and deleting layers

(function() {
    // Expose as global for app-new.js to use
    window.LayerControls = {
        layers: [],
        currentLayer: 0,
        init,
        switchLayer
    };

    function init(num = 9) {
        this.layers = [];
        for (let i = 0; i < 9; i++) {
            this.layers.push([]); // Each layer is an array of drawings
        }
        this.currentLayer = 0;
        renderPanel.call(this);
    }

    function addLayer() {
        if (this.layers.length >= 9) return;
        this.layers.push([]);
        this.currentLayer = this.layers.length - 1;
        renderPanel.call(this);
    }

    function deleteLayer() {
        if (this.layers.length <= 1) return;
        this.layers.splice(this.currentLayer, 1);
        if (this.currentLayer >= this.layers.length) {
            this.currentLayer = this.layers.length - 1;
        }
        renderPanel.call(this);
    }

    function switchLayer(idx) {
        if (idx < 0 || idx >= this.layers.length) return;
        this.currentLayer = idx;
        renderPanel.call(this);
    }

    let minimized = window.LayerControls && window.LayerControls._minimized;
    function renderPanel() {
        let panel = document.getElementById('layer-controls');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'layer-controls';
            panel.style.position = 'fixed';
            panel.style.top = '20px';
            panel.style.left = '50%';
            panel.style.transform = 'translateX(-50%)';
            panel.style.zIndex = '150';
            panel.style.display = 'flex';
            panel.style.gap = '10px';
            panel.style.background = '#222';
            panel.style.padding = '8px 16px';
            panel.style.borderRadius = '12px';
            panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            document.body.appendChild(panel);
        }
        panel.innerHTML = '';
        if (window.LayerControls._minimized) {
            // Show only maximize button
            const maxBtn = document.createElement('button');
            maxBtn.title = 'Show Layer Controls';
            maxBtn.innerHTML = '⯈';
            maxBtn.style.width = '36px';
            maxBtn.style.height = '36px';
            maxBtn.style.borderRadius = '50%';
            maxBtn.style.background = '#222';
            maxBtn.style.color = '#fff';
            maxBtn.style.fontWeight = 'bold';
            maxBtn.style.fontSize = '22px';
            maxBtn.style.border = '2px solid #666';
            maxBtn.style.cursor = 'pointer';
            maxBtn.onclick = function() {
                window.LayerControls._minimized = false;
                renderPanel.call(window.LayerControls);
            };
            panel.appendChild(maxBtn);
            return;
        }
        for (let i = 0; i < 9; i++) {
            const btn = document.createElement('button');
            btn.textContent = (i + 1);
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '50%';
            btn.style.border = (i === this.currentLayer) ? '3px solid #fff' : '2px solid #666';
            btn.style.background = (i === this.currentLayer) ? '#333' : '#222';
            btn.style.color = 'white';
            btn.style.fontWeight = 'bold';
            btn.style.fontSize = '18px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                window.LayerControls.switchLayer(i);
                if (window.onLayerChange) window.onLayerChange(i);
            };
            panel.appendChild(btn);
        }
        // Minimize button
        const minBtn = document.createElement('button');
        minBtn.title = 'Hide Layer Controls';
        minBtn.innerHTML = '⯆';
        minBtn.style.marginLeft = '12px';
        minBtn.style.width = '36px';
        minBtn.style.height = '36px';
        minBtn.style.borderRadius = '50%';
        minBtn.style.background = '#222';
        minBtn.style.color = '#fff';
        minBtn.style.fontWeight = 'bold';
        minBtn.style.fontSize = '22px';
        minBtn.style.border = '2px solid #666';
        minBtn.style.cursor = 'pointer';
        minBtn.onclick = function() {
            window.LayerControls._minimized = true;
            renderPanel.call(window.LayerControls);
        };
        panel.appendChild(minBtn);
    }
    // Hotkey support: 1-9 for layer switch
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 9 && window.LayerControls.layers.length >= n) {
            window.LayerControls.switchLayer(n - 1);
            if (window.onLayerChange) window.onLayerChange(window.LayerControls.currentLayer);
        }
    });
})();
