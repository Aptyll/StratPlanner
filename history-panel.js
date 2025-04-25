// History panel and undo logic for per-layer action history
(function() {
    // Each layer gets its own history stack
    let layerHistories = Array(9).fill().map(() => []); // Each is [{actions:..., snapshot:...}]

    let panel = null;
    let currentLayer = 0;
    
    function recordAction(action, snapshot) {
        const history = layerHistories[currentLayer];

        history.push({ action, snapshot });
        renderPanel();
    }

    function undo() {
        const history = layerHistories[currentLayer];
        if (history.length > 1) {
            history.pop();
            restoreSnapshot(history[history.length - 1].snapshot);
            renderPanel();
        }
    }

    function jumpTo(idx) {
        const history = layerHistories[currentLayer];
        if (idx >= 0 && idx < history.length) {
            restoreSnapshot(history[idx].snapshot);
            // Remove all actions after idx
            layerHistories[currentLayer] = history.slice(0, idx + 1);
            renderPanel();
        }
    }

    function restoreSnapshot(snapshot) {
        // Expects snapshot to be an array of drawing data for this layer
        if (window.LayerControls && window.LayerControls.layers) {
            window.LayerControls.layers[currentLayer] = JSON.parse(JSON.stringify(snapshot));
            if (window.onLayerChange) window.onLayerChange(currentLayer);
        }
    }

    function renderPanel() {
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'history-panel';
            panel.style.position = 'fixed';
            panel.style.bottom = '20px';
            panel.style.right = '20px';
            panel.style.width = '160px';
            panel.style.maxHeight = '320px';
            panel.style.overflowY = 'auto';
            panel.style.background = '#222';
            panel.style.borderRadius = '8px';
            panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            panel.style.padding = '10px';
            panel.style.zIndex = '200';
            panel.style.display = 'flex';
            panel.style.flexDirection = 'column';
            document.body.appendChild(panel);
        }
        panel.innerHTML = '<div style="color:#fff;font-weight:bold;margin-bottom:8px;">History</div>';
        const history = layerHistories[currentLayer];
        history.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.textContent = h.action;
    btn.style.margin = '2px 0';
    btn.style.width = '100%';
    btn.style.background = '#333';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.padding = '4px 0';
    btn.style.cursor = 'pointer';
    // Color for Line and Erase actions
    if (h.action === 'Line') {
        // Find last line/pen in snapshot
        let color = null;
        if (Array.isArray(h.snapshot)) {
            for (let j = h.snapshot.length - 1; j >= 0; j--) {
                if (h.snapshot[j].type === 'line' || h.snapshot[j].type === 'pen') {
                    color = h.snapshot[j].color;
                    break;
                }
            }
        }
        if (color) {
            btn.style.color = color;
        }
    } else if (h.action === 'Erase') {
        btn.style.color = '#fff';
    } else {
        btn.style.color = '#fff';
    }
    btn.onclick = () => jumpTo(i);
    panel.appendChild(btn);
});
    }

    function setLayer(idx) {
        currentLayer = idx;
        renderPanel();
    }

    // Expose API
    window.HistoryPanel = {
        recordAction,
        undo,
        setLayer,
        renderPanel,
        _layerHistories: layerHistories
    };

    // Keyboard shortcut
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            window.HistoryPanel.undo();
        }
    });

    // Listen for layer changes
    window.onLayerChange = function(layerIdx) {
        setLayer(layerIdx);
    };

    // Initial render
    renderPanel();
})();
