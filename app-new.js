// StratPlanner2 - Single Canvas Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const canvas = document.getElementById('battlemap');
    const ctx = canvas.getContext('2d');

    // Tool buttons
    const selectToolBtn = document.getElementById('select-tool');
    const penToolBtn = document.getElementById('pen-tool');
    const eraserToolBtn = document.getElementById('eraser-tool');
    const lineToolBtn = document.getElementById('line-tool');
    const colorPickerBtn = document.getElementById('color-picker');
    const clearCanvasBtn = document.getElementById('clear-canvas');

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');

    // Color system elements
    const colorSystem = document.getElementById('color-system');
    const leftClickSlot = document.getElementById('left-click-slot');
    const rightClickSlot = document.getElementById('right-click-slot');
    const paletteColors = document.getElementById('palette-colors');
    const colorIndicator = document.getElementById('current-color-indicator');

    // Map image
    const mapImage = new Image();
    mapImage.src = 'battlemap.png';

    // State variables
    let currentTool = 'select';
    let isDrawing = false;
    let isDragging = false;
    let lastX, lastY;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let lineWidth = 6; // Default pen/line width
    const ERASER_WIDTH = 64; // Reduced eraser size

    // Load custom colors from localStorage if available
    const savedCustomColors = localStorage.getItem('customColors');
    const customColors = savedCustomColors ? JSON.parse(savedCustomColors) : [];

    // Color management system
    const colorPalette = {
        primary: '#74E787',   // Default primary color (light green)
        secondary: '#66b3ff', // Blue color
        tertiary: '#ff6666',  // Red color
        custom: customColors  // Array to store custom colors added by the user
    };

    // Load saved color selections from localStorage
    const savedLeftClickColor = localStorage.getItem('leftClickColor') || colorPalette.secondary;
    const savedRightClickColor = localStorage.getItem('rightClickColor') || colorPalette.tertiary;

    // Color selection for left and right clicks
    let leftClickColor = savedLeftClickColor;
    let rightClickColor = savedRightClickColor;
    let drawColor = leftClickColor; // Current drawing color (default to left click)

    // Layered drawing operations storage
    // Each layer is an array of drawing objects, managed by LayerControls
    // drawings = LayerControls.layers[LayerControls.currentLayer]
    window.LayerControls.init(1);
    let getDrawings = () => window.LayerControls.layers[window.LayerControls.currentLayer];

    // Variables for line tool
    let lineStartX, lineStartY;
    let tempDrawings = null;

    // Variables for smoothing
    let points = []; // Array to store points for smoothing

    // Wait for the map image to load before initializing
    mapImage.onload = function() {
        initializeCanvas();
        setupEventListeners();
        setActiveTool('select');
        setActiveColor(null, leftClickColor); // Use leftClickColor as the default pen color
        initColorSystem();
        // Redraw on layer switch
        window.onLayerChange = function() {
            isDrawing = false;
            points = [];
            tempDrawings = null;
            // Always sync drawColor to leftClickColor when switching layers
            drawColor = leftClickColor;
            if (window.HistoryPanel && typeof window.LayerControls?.currentLayer === 'number') {
                window.HistoryPanel.setLayer(window.LayerControls.currentLayer);
            }
            draw();
        };
        draw();
    };

    // Initialize the canvas size
    function initializeCanvas() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    // Resize canvas to match container size
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw(); // Redraw everything when canvas is resized
    }

    // Main drawing function - draws the map and all drawings
    function draw() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save the current transformation state
        ctx.save();

        // Apply transformations for pan and zoom
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2 + offsetX, -canvas.height / 2 + offsetY);

        // Draw the map image
        drawMap();

        // Draw all stored drawings for current layer
        drawAllDrawings();

        // Restore the transformation state
        ctx.restore();

        // Log current state
        console.log(`Scale: ${scale}, Offset: (${offsetX}, ${offsetY}), Tool: ${currentTool}`);
    }

    // Draw the map image
    function drawMap() {
        // Calculate position to center the map
        const x = (canvas.width - mapImage.width) / 2;
        const y = (canvas.height - mapImage.height) / 2;

        // Draw the map
        ctx.drawImage(mapImage, x, y);
    }

    // Draw all stored drawings for current layer
    function drawAllDrawings() {
        const drawings = getDrawings();
        for (const drawing of drawings) {
            if (drawing.type === 'pen' || drawing.type === 'line') {
                drawStoredPath(drawing);
            } else if (drawing.type === 'eraser') {
                eraseStoredPath(drawing);
            }
        }
    }

    // Draw a stored path (pen or line)
    function drawStoredPath(drawing) {

        ctx.beginPath();
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = (drawing.type === 'eraser') ? ERASER_WIDTH : drawing.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (drawing.type === 'pen') {
            // Draw a pen stroke with points
            if (drawing.points.length < 2) return;

            ctx.moveTo(drawing.points[0].x, drawing.points[0].y);

            // If we have at least 3 points, use quadratic curves for smoothing
            if (drawing.points.length >= 3) {
                for (let i = 1; i < drawing.points.length - 1; i++) {
                    const xc = (drawing.points[i].x + drawing.points[i+1].x) / 2;
                    const yc = (drawing.points[i].y + drawing.points[i+1].y) / 2;
                    ctx.quadraticCurveTo(drawing.points[i].x, drawing.points[i].y, xc, yc);
                }
            } else {
                // Just draw lines between points
                for (let i = 1; i < drawing.points.length; i++) {
                    ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
                }
            }
        } else if (drawing.type === 'line') {
            // Draw a straight line
            ctx.moveTo(drawing.start.x, drawing.start.y);
            ctx.lineTo(drawing.end.x, drawing.end.y);
        }

        ctx.stroke();
    }

    // Erase a stored path
    function eraseStoredPath(drawing) {
        // Use destination-out composite operation to erase
        ctx.globalCompositeOperation = 'destination-out';

        ctx.beginPath();
        ctx.strokeStyle = 'white'; // Color doesn't matter with destination-out
        ctx.lineWidth = ERASER_WIDTH; // Always use the current eraser width for erasing
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (drawing.points.length < 2) return;

        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);

        // If we have at least 3 points, use quadratic curves for smoothing
        if (drawing.points.length >= 3) {
            for (let i = 1; i < drawing.points.length - 1; i++) {
                const xc = (drawing.points[i].x + drawing.points[i+1].x) / 2;
                const yc = (drawing.points[i].y + drawing.points[i+1].y) / 2;
                ctx.quadraticCurveTo(drawing.points[i].x, drawing.points[i].y, xc, yc);
            }
        } else {
            // Just draw lines between points
            for (let i = 1; i < drawing.points.length; i++) {
                ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
            }
        }

        ctx.stroke();

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }

    // Convert screen coordinates to canvas coordinates
    function screenToCanvas(x, y) {
        // Apply inverse transformations to get canvas coordinates
        // First, adjust for canvas position
        const rect = canvas.getBoundingClientRect();
        x = x - rect.left;
        y = y - rect.top;

        // Then, adjust for transformations (scale and offset)
        x = (x - canvas.width / 2) / scale + canvas.width / 2 - offsetX;
        y = (y - canvas.height / 2) / scale + canvas.height / 2 - offsetY;

        return { x, y };
    }

    // Set active tool
    function setActiveTool(tool) {
        // Set eraser thickness
        if (tool === 'eraser') {
            lineWidth = 32;
        } else {
            lineWidth = 6;
        }
        // Remove active class from all tool buttons
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');

            // Reset background color for all buttons except pen tool
            if (btn.id !== 'pen-tool' && btn.id !== 'line-tool') {
                btn.style.backgroundColor = '#333';
            }
        });

        // Add active class to selected tool
        const toolBtn = document.getElementById(`${tool}-tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }

        currentTool = tool;

        // Show/hide color system based on selected tool
        if (tool === 'pen' || tool === 'line') {
            colorSystem.style.display = 'flex';

            // Update the tool button background to show current color
            if (tool === 'pen') {
                penToolBtn.style.backgroundColor = drawColor;
            } else if (tool === 'line') {
                lineToolBtn.style.backgroundColor = drawColor;
            }

            // Initialize the selection pod slots with current colors
            updateSelectionPodUI();
        } else {
            colorSystem.style.display = 'none';
        }

        // Set appropriate cursor
        switch(tool) {
            case 'select':
                canvas.style.cursor = 'move';
                break;
            case 'pen':
            case 'eraser':
            case 'line':
                canvas.style.cursor = 'crosshair';
                break;
            default:
                canvas.style.cursor = 'default';
        }

        // Update history panel on tool switch
        if (window.HistoryPanel) {
            window.HistoryPanel.setLayer(window.LayerControls.currentLayer);
        }
    }

    // Function to update the selection pod UI
    function updateSelectionPodUI() {
        // Update left click slot
        leftClickSlot.style.backgroundColor = leftClickColor;
        leftClickSlot.classList.add('has-color');
        leftClickSlot.title = 'Left Click: ' + leftClickColor;

        // Update right click slot
        rightClickSlot.style.backgroundColor = rightClickColor;
        rightClickSlot.classList.add('has-color');
        rightClickSlot.title = 'Right Click: ' + rightClickColor;
    }

    // Helper function to update the UI when color changes
    function updateColorUI(colorValue) {
        // Update the color indicator in the color picker button
        colorIndicator.style.backgroundColor = colorValue;

        // Update the active tool button background color based on current tool
        if (currentTool === 'pen') {
            penToolBtn.style.backgroundColor = colorValue;
        } else if (currentTool === 'line') {
            lineToolBtn.style.backgroundColor = colorValue;
        }

        console.log('Color updated to:', colorValue);
    }

    // Set active color
    function setActiveColor(colorBtn, colorValue) {
        // Set the drawing color
        drawColor = colorValue;

        // Update the UI
        updateColorUI(colorValue);
    }

    // Zoom function
    function zoom(direction) {
        const zoomFactor = 0.1;
        const minZoom = 0.2;
        const maxZoom = 5;

        if (direction === 'in' && scale < maxZoom) {
            scale += zoomFactor;
        } else if (direction === 'out' && scale > minZoom) {
            scale -= zoomFactor;
        } else if (direction === 'reset') {
            scale = 1;
            offsetX = 0;
            offsetY = 0;
        }

        draw();
    }

    // Clear all drawings in current layer
    function clearDrawing() {
        const drawings = getDrawings();
        drawings.length = 0;
        draw();
    }

    // Start drawing
    function startDrawing(e) {
        const drawings = getDrawings();
        if (currentTool === 'select') return;

        isDrawing = true;

        // Convert screen coordinates to canvas coordinates
        const coords = screenToCanvas(e.clientX, e.clientY);

        if (currentTool === 'pen') {
            // For pen tool, determine color based on mouse button
            // e.button: 0 = left click, 2 = right click
            if (e.button === 0) {
                drawColor = leftClickColor;
            } else if (e.button === 2) {
                drawColor = rightClickColor;
            }

            // Update UI to reflect the selected color
            updateColorUI(drawColor);

            // Start a new pen drawing
            points = [{ x: coords.x, y: coords.y }];

        } else if (currentTool === 'eraser') {
            // Start a new eraser drawing
            points = [{ x: coords.x, y: coords.y }];

        } else if (currentTool === 'line') {
            // For line tool, determine color based on mouse button
            if (e.button === 0) {
                drawColor = leftClickColor;
            } else if (e.button === 2) {
                drawColor = rightClickColor;
            }

            // Update UI to reflect the selected color
            updateColorUI(drawColor);

            // Store the starting point
            lineStartX = coords.x;
            lineStartY = coords.y;

            // Save the current drawings state
            tempDrawings = [...drawings];
        }
    }

    // Continue drawing
    function continueDrawing(e) {
        const drawings = getDrawings();
        if (!isDrawing) return;

        // Convert screen coordinates to canvas coordinates
        const coords = screenToCanvas(e.clientX, e.clientY);

        if (currentTool === 'pen') {
            // Add the current point to our points array
            points.push({ x: coords.x, y: coords.y });

            // Save the current context state
            ctx.save();

            // Create a temporary drawing to show the current stroke
            const tempDrawing = {
                type: 'pen',
                color: drawColor,
                lineWidth: lineWidth,
                points: [...points]
            };

            // Redraw everything
            draw();

            // Apply the same transformations as in the draw function
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvas.width / 2 + offsetX, -canvas.height / 2 + offsetY);

            // Draw the temporary stroke
            drawStoredPath(tempDrawing);

            // Restore the context state
            ctx.restore();

        } else if (currentTool === 'eraser') {
            // Add the current point to our points array
            points.push({ x: coords.x, y: coords.y });

            // Save the current context state
            ctx.save();

            // Create a temporary eraser stroke
            const tempEraser = {
                type: 'eraser',
                lineWidth: lineWidth,
                points: [...points]
            };

            // Redraw everything
            draw();

            // Apply the same transformations as in the draw function
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvas.width / 2 + offsetX, -canvas.height / 2 + offsetY);

            // Draw the temporary eraser stroke
            eraseStoredPath(tempEraser);

            // Restore the context state
            ctx.restore();

        } else if (currentTool === 'line') {
            // Restore to the state before drawing the line
            if (tempDrawings) {
                drawings = [...tempDrawings];
            }

            // Save the current context state
            ctx.save();

            // Create a temporary line
            const tempLine = {
                type: 'line',
                color: drawColor,
                lineWidth: lineWidth,
                start: { x: lineStartX, y: lineStartY },
                end: { x: coords.x, y: coords.y }
            };

            // Redraw everything
            draw();

            // Apply the same transformations as in the draw function
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvas.width / 2 + offsetX, -canvas.height / 2 + offsetY);

            // Draw the temporary line
            drawStoredPath(tempLine);

            // Restore the context state
            ctx.restore();
        }
    }

    // Finish drawing
    function finishDrawing(e) {
        const drawings = getDrawings();
        if (!isDrawing) return;

        // Convert screen coordinates to canvas coordinates
        const coords = screenToCanvas(e.clientX, e.clientY);
        let action = null;

        if (currentTool === 'pen' && points.length > 1) {
            // Add the final pen drawing to our drawings array
            drawings.push({
                type: 'pen',
                color: drawColor,
                lineWidth: lineWidth,
                points: [...points]
            });
            action = 'Line';
        } else if (currentTool === 'eraser' && points.length > 1) {
            // Add the eraser stroke to our drawings array
            drawings.push({
                type: 'eraser',
                lineWidth: ERASER_WIDTH,
                points: [...points]
            });
            action = 'Erase';
        } else if (currentTool === 'line') {
            // Add the final line to our drawings array
            drawings.push({
                type: 'line',
                color: drawColor,
                lineWidth: lineWidth,
                start: { x: lineStartX, y: lineStartY },
                end: { x: coords.x, y: coords.y }
            });
            tempDrawings = null;
            action = 'Line';
        }

        // Record the action in the history panel
        if (action && window.HistoryPanel) {
            // Deep copy of current layer's drawings
            window.HistoryPanel.recordAction(action, JSON.parse(JSON.stringify(drawings)));
        }

        isDrawing = false;
        draw(); // Redraw everything
    }

    // Setup all event listeners
    // --- Eraser preview ---
    let eraserPreview = null;
    let eraserPreviewVisible = false;

    function showEraserPreview(x, y) {
        if (!eraserPreview) {
            eraserPreview = document.createElement('div');
            eraserPreview.style.position = 'absolute';
            eraserPreview.style.pointerEvents = 'none';
            eraserPreview.style.zIndex = '300';
            eraserPreview.style.border = '2px solid #fff';
            eraserPreview.style.background = 'rgba(255,255,255,0.15)';
            eraserPreview.style.borderRadius = '50%';
            eraserPreview.style.width = ERASER_WIDTH + 'px';
            eraserPreview.style.height = ERASER_WIDTH + 'px';
            eraserPreview.style.transform = 'translate(-50%, -50%)';
            eraserPreview.style.transition = 'opacity 0.1s';
            eraserPreview.style.opacity = '0.95';
            document.body.appendChild(eraserPreview);
        }
        eraserPreview.style.width = ERASER_WIDTH + 'px';
        eraserPreview.style.height = ERASER_WIDTH + 'px';
        eraserPreview.style.left = x + 'px';
        eraserPreview.style.top = y + 'px';
        eraserPreview.style.display = 'block';
        eraserPreviewVisible = true;
    }

    function hideEraserPreview() {
        if (eraserPreview) {
            eraserPreview.style.display = 'none';
        }
        eraserPreviewVisible = false;
    }

    function setupEventListeners() {
        // Mouse events for drawing and panning
        canvas.addEventListener('mousedown', (e) => {
            // Handle both left and right mouse buttons
            if (e.button === 0 || (e.button === 2 && (currentTool === 'pen' || currentTool === 'line'))) {
                if (currentTool === 'select') {
                    // Pan functionality (left click only)
                    if (e.button === 0) {
                        isDragging = true;
                        lastX = e.clientX;
                        lastY = e.clientY;
                        canvas.style.cursor = 'grabbing';
                    }
                } else {
                    // Drawing functionality
                    startDrawing(e);
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            // Eraser preview logic
            if (currentTool === 'eraser') {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (
                    x >= rect.left && x <= rect.right &&
                    y >= rect.top && y <= rect.bottom
                ) {
                    showEraserPreview(x, y);
                } else {
                    hideEraserPreview();
                }
            } else {
                hideEraserPreview();
            }
            if (isDragging && currentTool === 'select') {
                // Pan functionality
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;

                offsetX += deltaX / scale;
                offsetY += deltaY / scale;

                lastX = e.clientX;
                lastY = e.clientY;

                draw();
            } else if (isDrawing) {
                // Drawing functionality
                continueDrawing(e);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (currentTool === 'select') {
                isDragging = false;
                canvas.style.cursor = 'move';
            } else {
                finishDrawing(e);
            }
        });

        canvas.addEventListener('mouseleave', (e) => {
            if (currentTool === 'select') {
                isDragging = false;
                canvas.style.cursor = 'move';
            } else {
                finishDrawing(e);
            }
        });

        // Disable right-click context menu on canvas
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Zoom controls
        zoomInBtn.addEventListener('click', () => zoom('in'));
        zoomOutBtn.addEventListener('click', () => zoom('out'));
        resetZoomBtn.addEventListener('click', () => zoom('reset'));

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoom('in');
            } else {
                zoom('out');
            }
        });

        // Tool selection
        selectToolBtn.addEventListener('click', () => setActiveTool('select'));
        penToolBtn.addEventListener('click', () => setActiveTool('pen'));
        eraserToolBtn.addEventListener('click', () => setActiveTool('eraser'));
        lineToolBtn.addEventListener('click', () => setActiveTool('line'));
        clearCanvasBtn.addEventListener('click', clearDrawing);
        // Redraw Map button
        const redrawMapBtn = document.getElementById('redraw-map-btn');
        if (redrawMapBtn) {
            redrawMapBtn.addEventListener('click', () => {
                const mapObj = getMap();
                mapObj.src = 'battlemap.png?' + new Date().getTime(); // bust cache
                mapObj._img = null;
                const img = new window.Image();
                img.src = mapObj.src;
                mapObj._img = img;
                img.onload = () => draw();
            });
        }

        // Color picker popup elements
        const colorPickerPopup = document.getElementById('color-picker-popup');
        const colorPickerContainer = document.getElementById('color-picker-container');
        const addColorBtn = document.getElementById('add-color-btn');

        // Show color picker popup
        colorPickerBtn.addEventListener('click', () => {
            // Create a color input element
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = drawColor;
            colorInput.id = 'color-input';

            // Clear previous content
            colorPickerContainer.innerHTML = '';

            // Add the color input to the container
            colorPickerContainer.appendChild(colorInput);

            // Show the popup
            colorPickerPopup.style.display = 'flex';

            // Focus the color input
            colorInput.click();

            // Listen for changes
            colorInput.addEventListener('input', function() {
                // Update color preview
                setActiveColor(null, this.value);
            });
        });

        // Close popup when clicking outside
        colorPickerPopup.addEventListener('click', (e) => {
            if (e.target === colorPickerPopup) {
                colorPickerPopup.style.display = 'none';
            }
        });

        // Add Color button functionality
        addColorBtn.addEventListener('click', () => {
            const colorInput = document.getElementById('color-input');
            if (colorInput) {
                const newColor = colorInput.value;

                // Add to custom colors array if it doesn't already exist
                if (!colorPalette.custom.includes(newColor)) {
                    colorPalette.custom.push(newColor);

                    // Save to localStorage
                    localStorage.setItem('customColors', JSON.stringify(colorPalette.custom));

                    // Create a new color swatch
                    createCustomColorButton(newColor);

                    // Hide the popup
                    colorPickerPopup.style.display = 'none';
                }
            }
        });

        // Keyboard shortcuts for tools
        document.addEventListener('keydown', (e) => {
            // Only process if not typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Convert to lowercase to make it case-insensitive
            const key = e.key.toLowerCase();

            switch (key) {
                case 'a':
                    // Redraw battlemap.png for current layer
                    {
                        const mapObj = getMap();
                        mapObj.src = 'battlemap.png?' + new Date().getTime(); // bust cache
                        mapObj._img = null;
                        const img = new window.Image();
                        img.src = mapObj.src;
                        mapObj._img = img;
                        img.onload = () => draw();
                    }
                    break;
                case 'q':
                    setActiveTool('select');
                    break;
                case 'w':
                    setActiveTool('pen');
                    break;
                case 'e':
                    setActiveTool('eraser');
                    break;
                case 'r':
                    setActiveTool('line');
                    break;
                case 't':
                    // Open color picker
                    colorPickerBtn.click();
                    break;
                case 'y':
                    // Clear canvas
                    clearDrawing();
                    break;
            }
        });
    }

    // Drag and drop event handlers
    function handleDragStart(e) {
        // For custom colors, use the actual color value from style
        if (e.target.classList.contains('custom-color')) {
            e.dataTransfer.setData('text/plain', e.target.style.backgroundColor);
        } else {
            // For predefined colors, use the class name
            e.dataTransfer.setData('text/plain', e.target.className.split(' ')[1]);
        }
        e.target.classList.add('dragging');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e, clickType) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const colorData = e.dataTransfer.getData('text/plain');
        let color;

        // Check if the data is a class name or direct color value
        if (colorData.startsWith('rgb') || colorData.startsWith('#')) {
            // Direct color value (from custom color or computed style)
            color = colorData;
        } else if (colorData === 'blue-color') {
            color = colorPalette.secondary;
        } else if (colorData === 'red-color') {
            color = colorPalette.tertiary;
        } else if (colorData === 'green-color') {
            color = colorPalette.primary;
        }

        if (color) {
            if (clickType === 'left') {
                leftClickColor = color;
                localStorage.setItem('leftClickColor', color);

                // Always update pen tool color and UI if pen tool is active
                if (currentTool === 'pen') {
                    drawColor = color;
                    updateColorUI(color);
                }
            } else {
                rightClickColor = color;
                localStorage.setItem('rightClickColor', color);
            }

            // Update the selection pod UI
            updateSelectionPodUI();
        }
    }

    // Function to create a custom color swatch
    function createCustomColorButton(colorValue, index) {
        // Create a new swatch element
        const customColorSwatch = document.createElement('div');
        customColorSwatch.className = 'color-swatch custom-color';
        customColorSwatch.title = 'Custom Color';
        customColorSwatch.style.backgroundColor = colorValue;
        customColorSwatch.draggable = true;

        // Add index as data attribute for identification
        customColorSwatch.dataset.colorIndex = index || colorPalette.custom.length - 1;

        // Create remove button
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-color';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove Color';

        // Add remove button to color swatch
        customColorSwatch.appendChild(removeBtn);

        // Add drag event listeners
        customColorSwatch.addEventListener('dragstart', handleDragStart);
        customColorSwatch.addEventListener('dragend', handleDragEnd);

        // Add event listener for remove button
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Remove from custom colors array
            const index = parseInt(customColorSwatch.dataset.colorIndex);
            if (index > -1 && index < colorPalette.custom.length) {
                const removedColor = colorPalette.custom[index];
                colorPalette.custom.splice(index, 1);

                // Update localStorage
                localStorage.setItem('customColors', JSON.stringify(colorPalette.custom));

                // Remove swatch from DOM
                paletteColors.removeChild(customColorSwatch);

                // If this was the active color in either slot, switch to primary
                if (leftClickColor === removedColor) {
                    leftClickColor = colorPalette.primary;
                    localStorage.setItem('leftClickColor', leftClickColor);

                    if (drawColor === removedColor) {
                        drawColor = leftClickColor;
                        updateColorUI(drawColor);
                    }
                }

                if (rightClickColor === removedColor) {
                    rightClickColor = colorPalette.tertiary;
                    localStorage.setItem('rightClickColor', rightClickColor);
                }

                // Update the selection pod UI
                updateSelectionPodUI();

                // Reindex remaining custom colors
                updateCustomColorIndices();
            }
        });

        // Add to the palette colors div
        paletteColors.appendChild(customColorSwatch);
    }

    // Function to update indices of custom color swatches
    function updateCustomColorIndices() {
        const customSwatches = paletteColors.querySelectorAll('.custom-color');
        customSwatches.forEach((swatch, index) => {
            swatch.dataset.colorIndex = index;
        });
    }

    // Initialize the color system
    function initColorSystem() {
        // Create default color swatches
        const blueColorSwatch = document.getElementById('blue-color');
        const redColorSwatch = document.getElementById('red-color');
        const greenColorSwatch = document.getElementById('green-color');

        // Add drag event listeners
        if (blueColorSwatch) blueColorSwatch.addEventListener('dragstart', handleDragStart);
        if (blueColorSwatch) blueColorSwatch.addEventListener('dragend', handleDragEnd);

        if (redColorSwatch) redColorSwatch.addEventListener('dragstart', handleDragStart);
        if (redColorSwatch) redColorSwatch.addEventListener('dragend', handleDragEnd);

        if (greenColorSwatch) greenColorSwatch.addEventListener('dragstart', handleDragStart);
        if (greenColorSwatch) greenColorSwatch.addEventListener('dragend', handleDragEnd);

        // Set up drop zones
        leftClickSlot.addEventListener('dragover', handleDragOver);
        leftClickSlot.addEventListener('dragleave', handleDragLeave);
        leftClickSlot.addEventListener('drop', (e) => handleDrop(e, 'left'));

        rightClickSlot.addEventListener('dragover', handleDragOver);
        rightClickSlot.addEventListener('dragleave', handleDragLeave);
        rightClickSlot.addEventListener('drop', (e) => handleDrop(e, 'right'));

        // Load custom colors
        colorPalette.custom.forEach((color, index) => {
            createCustomColorButton(color, index);
        });

        // Initialize selection pod
        updateSelectionPodUI();
    }
});
