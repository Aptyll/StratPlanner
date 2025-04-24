// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    initApp();
});

function initApp() {
    // Canvas and context
    const canvas = document.getElementById('battlemap');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');

    if (!zoomInBtn || !zoomOutBtn || !resetZoomBtn) {
        console.error('Zoom control buttons not found!');
    }

    // Drawing tools
    const selectToolBtn = document.getElementById('select-tool');
    const penToolBtn = document.getElementById('pen-tool');
    const eraserToolBtn = document.getElementById('eraser-tool');
    const lineToolBtn = document.getElementById('line-tool');
    const colorPickerBtn = document.getElementById('color-picker');
    const clearCanvasBtn = document.getElementById('clear-canvas');

    // Color system elements
    const colorSystem = document.getElementById('color-system');
    const selectionPod = document.getElementById('selection-pod');
    const leftClickSlot = document.getElementById('left-click-slot');
    const rightClickSlot = document.getElementById('right-click-slot');
    const paletteColors = document.getElementById('palette-colors');
    const colorIndicator = document.getElementById('current-color-indicator');

    // Initial state
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let isDrawing = false;
    let lastX, lastY;
    let currentTool = 'select'; // Default tool
    let drawingLayer; // Canvas for drawing
    let drawingCtx; // Context for drawing
    let lineWidth = 6; // Increased line width for better visibility

    // Load custom colors from localStorage if available
    const savedCustomColors = localStorage.getItem('customColors');
    const customColors = savedCustomColors ? JSON.parse(savedCustomColors) : [];

    // Color management system (scalable for adding more colors later)
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

    // Initialize the color indicator and pen tool button with the default color
    if (colorIndicator) {
        colorIndicator.style.backgroundColor = drawColor;
    }

    // Set the initial pen tool button background color
    if (penToolBtn) {
        penToolBtn.style.backgroundColor = drawColor;
    }

    // Create a separate canvas layer for drawing
    createDrawingLayer();

    // Initialize canvas
    resizeCanvas();

    // Initial draw
    draw();

    // Create a separate canvas for drawing
    function createDrawingLayer() {
        // Create a new div to hold the drawing layer
        const drawingContainer = document.createElement('div');
        drawingContainer.id = 'drawing-container';
        drawingContainer.style.position = 'absolute';
        drawingContainer.style.top = '0';
        drawingContainer.style.left = '0';
        drawingContainer.style.width = '100%';
        drawingContainer.style.height = '100%';
        drawingContainer.style.pointerEvents = 'none'; // Let events pass through
        drawingContainer.style.zIndex = '5'; // Above background, below controls
        drawingContainer.style.transformOrigin = 'center center';

        // Create the drawing canvas
        drawingLayer = document.createElement('canvas');
        drawingLayer.id = 'drawing-layer';
        drawingLayer.style.position = 'absolute';
        drawingLayer.style.top = '0';
        drawingLayer.style.left = '0';
        drawingLayer.style.width = '100%';
        drawingLayer.style.height = '100%';
        drawingLayer.style.pointerEvents = 'none';

        // Add the drawing layer to the container
        drawingContainer.appendChild(drawingLayer);

        // Add the container to the map container
        canvas.parentElement.appendChild(drawingContainer);
        drawingCtx = drawingLayer.getContext('2d');

        // Disable right-click context menu on drawing layer
        drawingLayer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }

    // Resize canvas to match container size
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Also resize drawing layer
        if (drawingLayer) {
            drawingLayer.width = container.clientWidth;
            drawingLayer.height = container.clientHeight;

            // Redraw any existing content that might have been cleared
            // when resizing the canvas
            draw();
        }
    }

    // Draw the battlemap
    function draw() {
        // Get the map container for CSS-based zooming
        const mapContainer = canvas.parentElement;
        const drawingContainer = document.getElementById('drawing-container');

        // Apply CSS transformations for zoom and pan
        mapContainer.style.transform = `scale(${scale})`;
        mapContainer.style.transformOrigin = 'center center';
        mapContainer.style.backgroundPosition = `calc(50% + ${offsetX / scale}px) calc(50% + ${offsetY / scale}px)`;

        // Apply the same transformations to the drawing container
        // This ensures drawings move with the map
        if (drawingContainer) {
            drawingContainer.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }

        // Clear canvas - we're using it just for interaction, not for drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Make canvas mostly transparent but still able to receive events
        canvas.style.opacity = 0.01;

        // Log current state
        console.log(`Scale: ${scale}, Offset: (${offsetX}, ${offsetY}), Tool: ${currentTool}`);
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

    // Set active tool
    function setActiveTool(tool) {
        // Remove active class from all tool buttons
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');

            // Reset background color for all buttons except pen tool
            if (btn.id !== 'pen-tool') {
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

    // Note: Drag and drop setup is now handled directly in the initColorSystem function

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

        console.log('Drag started with color:', e.dataTransfer.getData('text/plain'));
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

        console.log('Drop received with data:', colorData);

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
        } else if (colorData.startsWith('custom-color-')) {
            const index = parseInt(colorData.replace('custom-color-', ''));
            color = colorPalette.custom[index];
        }

        if (color) {
            if (clickType === 'left') {
                leftClickColor = color;
                localStorage.setItem('leftClickColor', color);

                // Update current draw color if we're using left click
                if (drawColor === leftClickColor) {
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

    // Set active color
    function setActiveColor(colorBtn, colorValue) {
        // Set the drawing color
        drawColor = colorValue;

        // Add active class to selected color button if provided
        if (colorBtn) {
            document.querySelectorAll('.color-button').forEach(btn => {
                btn.classList.remove('active');
            });
            colorBtn.classList.add('active');
        }

        // Update the UI
        updateColorUI(colorValue);
    }

    // Variables for line tool
    let lineStartX, lineStartY;
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    let hasExistingDrawing = false;

    // Variables for smoothing
    let points = []; // Array to store points for smoothing

    // Drawing functions
    function startDrawing(e) {
        if (currentTool === 'select') return;

        const rect = canvas.getBoundingClientRect();
        // Get coordinates relative to the canvas, adjusted for scale
        // No need to adjust for offsetX/Y as the drawing layer now moves with the map
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;

        if (currentTool === 'pen') {
            // For pen tool, determine color based on mouse button
            isDrawing = true;
            lastX = currentX;
            lastY = currentY;

            // Reset points array for smoothing
            points = [];
            // Add the first point
            points.push({ x: lastX, y: lastY });

            // Set color based on which mouse button was pressed
            // e.button: 0 = left click, 2 = right click
            if (e.button === 0) {
                // Left click - use left click color
                drawColor = leftClickColor;
            } else if (e.button === 2) {
                // Right click - use right click color
                drawColor = rightClickColor;
            }

            // Update UI to reflect the selected color
            updateColorUI(drawColor);

            drawingCtx.beginPath();
            drawingCtx.moveTo(lastX, lastY);
        }
        else if (currentTool === 'eraser') {
            // For eraser tool
            isDrawing = true;
            lastX = currentX;
            lastY = currentY;

            // Reset points array for smoothing
            points = [];
            // Add the first point
            points.push({ x: lastX, y: lastY });

            drawingCtx.beginPath();
            drawingCtx.moveTo(lastX, lastY);
        }
        else if (currentTool === 'line') {
            // For line tool, determine color based on mouse button
            isDrawing = true;
            lineStartX = currentX;
            lineStartY = currentY;

            // Set color based on which mouse button was pressed
            // e.button: 0 = left click, 2 = right click
            if (e.button === 0) {
                // Left click - use left click color
                drawColor = leftClickColor;
            } else if (e.button === 2) {
                // Right click - use right click color
                drawColor = rightClickColor;
            }

            // Update UI to reflect the selected color
            updateColorUI(drawColor);

            // Save the current canvas state
            tempCanvas.width = drawingLayer.width;
            tempCanvas.height = drawingLayer.height;
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(drawingLayer, 0, 0);
            hasExistingDrawing = true;
        }
    }

    function draw_line(e) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        // Get coordinates relative to the canvas, adjusted for scale
        // No need to adjust for offsetX/Y as the drawing layer now moves with the map
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;

        drawingCtx.lineWidth = lineWidth;
        drawingCtx.lineCap = 'round';

        if (currentTool === 'pen') {
            // Freehand drawing with smoothing
            drawingCtx.strokeStyle = drawColor;

            // Add the current point to our points array
            points.push({ x: currentX, y: currentY });

            // Keep only the last 8 points for smoothing
            if (points.length > 8) {
                points.shift();
            }

            // Clear the path and start a new one
            drawingCtx.beginPath();

            // If we have at least 3 points, use quadratic curves for smoothing
            if (points.length >= 3) {
                // Start at the first point
                drawingCtx.moveTo(points[0].x, points[0].y);

                // Draw smooth curves through the points
                for (let i = 1; i < points.length - 1; i++) {
                    // Calculate control point (midpoint between points)
                    const xc = (points[i].x + points[i+1].x) / 2;
                    const yc = (points[i].y + points[i+1].y) / 2;

                    // Draw quadratic curve to midpoint using current point as control
                    drawingCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                }
            } else {
                // Not enough points for smoothing, just draw a line
                drawingCtx.moveTo(points[0].x, points[0].y);
                drawingCtx.lineTo(currentX, currentY);
            }

            drawingCtx.stroke();
            lastX = currentX;
            lastY = currentY;
        }
        else if (currentTool === 'eraser') {
            // Eraser with smoothing (same technique as pen)
            // Save the current composite operation
            const originalComposite = drawingCtx.globalCompositeOperation;

            // Set to "destination-out" which makes new drawings erase existing content
            drawingCtx.globalCompositeOperation = 'destination-out';

            // Use a white stroke (color doesn't matter with destination-out)
            drawingCtx.strokeStyle = 'white';

            // Add the current point to our points array
            points.push({ x: currentX, y: currentY });

            // Keep only the last 8 points for smoothing
            if (points.length > 8) {
                points.shift();
            }

            // Clear the path and start a new one
            drawingCtx.beginPath();

            // If we have at least 3 points, use quadratic curves for smoothing
            if (points.length >= 3) {
                // Start at the first point
                drawingCtx.moveTo(points[0].x, points[0].y);

                // Draw smooth curves through the points
                for (let i = 1; i < points.length - 1; i++) {
                    // Calculate control point (midpoint between points)
                    const xc = (points[i].x + points[i+1].x) / 2;
                    const yc = (points[i].y + points[i+1].y) / 2;

                    // Draw quadratic curve to midpoint using current point as control
                    drawingCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                }
            } else {
                // Not enough points for smoothing, just draw a line
                drawingCtx.moveTo(points[0].x, points[0].y);
                drawingCtx.lineTo(currentX, currentY);
            }

            drawingCtx.stroke();

            // Restore the original composite operation
            drawingCtx.globalCompositeOperation = originalComposite;

            lastX = currentX;
            lastY = currentY;
        }
        else if (currentTool === 'line') {
            // Line tool - draw a preview line

            // Clear our drawing layer
            drawingCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);

            // Redraw the existing content
            if (hasExistingDrawing) {
                drawingCtx.drawImage(tempCanvas, 0, 0);
            }

            // Draw the preview line with anti-aliasing
            drawingCtx.beginPath();
            drawingCtx.moveTo(lineStartX, lineStartY);
            drawingCtx.lineTo(currentX, currentY);
            drawingCtx.strokeStyle = drawColor;
            drawingCtx.lineJoin = 'round'; // Smooth line joins
            drawingCtx.lineCap = 'round';  // Smooth line ends
            drawingCtx.stroke();
        }
    }

    function stopDrawing(e) {
        if (!isDrawing) return;

        // If we're using the line tool, finalize the line
        if (currentTool === 'line' && e) {
            const rect = canvas.getBoundingClientRect();
            // Get coordinates relative to the canvas, adjusted for scale
            // No need to adjust for offsetX/Y as the drawing layer now moves with the map
            const endX = (e.clientX - rect.left) / scale;
            const endY = (e.clientY - rect.top) / scale;

            // Draw the final line with anti-aliasing
            drawingCtx.beginPath();
            drawingCtx.moveTo(lineStartX, lineStartY);
            drawingCtx.lineTo(endX, endY);
            drawingCtx.strokeStyle = drawColor;
            drawingCtx.lineWidth = lineWidth;
            drawingCtx.lineCap = 'round';
            drawingCtx.lineJoin = 'round';
            drawingCtx.stroke();

            // Reset the flag
            hasExistingDrawing = false;
        }

        isDrawing = false;
        drawingCtx.closePath();
    }

    // Clear the drawing canvas
    function clearDrawing() {
        drawingCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);
    }

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
    // Get color picker popup elements
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
    clearCanvasBtn.addEventListener('click', clearDrawing);

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
        if (isDragging && currentTool === 'select') {
            // Pan functionality
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;

            offsetX += deltaX;
            offsetY += deltaY;

            lastX = e.clientX;
            lastY = e.clientY;

            draw();
        } else if (isDrawing) {
            // Drawing functionality
            draw_line(e);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (currentTool === 'select') {
            isDragging = false;
            canvas.style.cursor = 'move';
        } else {
            stopDrawing(e);
        }
    });

    canvas.addEventListener('mouseleave', (e) => {
        if (currentTool === 'select') {
            isDragging = false;
            canvas.style.cursor = 'move';
        } else {
            stopDrawing(e);
        }
    });

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Disable right-click context menu on canvas and map container
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Also disable context menu on the map container
    canvas.parentElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
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

    // We don't need color button click listeners anymore as we're using drag and drop

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

    // Load any saved custom colors
    function loadCustomColors() {
        // For each custom color, create a swatch
        colorPalette.custom.forEach((color, index) => {
            createCustomColorButton(color, index);
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
        loadCustomColors();

        // Initialize selection pod
        updateSelectionPodUI();
    }

    // Set initial active tool and color
    setActiveTool('select');
    setActiveColor(null, colorPalette.primary); // Set default color to light green

    // Initialize the color system
    initColorSystem();
}
