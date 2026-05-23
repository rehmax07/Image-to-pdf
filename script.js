

document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const themeIcon = themeToggle.querySelector('i');

    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        htmlElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        htmlElement.setAttribute('data-theme', 'light');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            htmlElement.setAttribute('data-theme', 'light');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            htmlElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });

    // jsPDF init
    const { jsPDF } = window.jspdf;

    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropArea = document.getElementById('dropArea');
    const imageList = document.getElementById('imageList');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewContainer = document.getElementById('previewContainer');
    const borderSize = document.getElementById('borderSize');
    const borderSizeValue = document.getElementById('borderSizeValue');
    const quality = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const addWatermark = document.getElementById('addWatermark');
    const watermarkOptions = document.getElementById('watermarkOptions');

    // State
    let uploadedImages = [];
    let generatedPdf = null;

    // Event Listeners
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });
    
    dropArea.addEventListener('drop', handleDrop);
    generateBtn.addEventListener('click', generatePDF);
    downloadBtn.addEventListener('click', downloadPDF);
    
    borderSize.addEventListener('input', () => {
        borderSizeValue.textContent = borderSize.value + 'px';
    });
    
    quality.addEventListener('input', () => {
        qualityValue.textContent = quality.value + '%';
    });
    
    addWatermark.addEventListener('change', () => {
        watermarkOptions.style.display = addWatermark.checked ? 'block' : 'none';
    });

    function handleFileSelect(e) {
        const files = e.target.files;
        processFiles(files);
        // Reset input so same file can be selected again
        fileInput.value = '';
    }

    function handleDrop(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        processFiles(files);
    }

    function processFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    const imageData = {
                        id: id,
                        name: file.name,
                        data: e.target.result
                    };
                    uploadedImages.push(imageData);
                    renderImages();
                };
                reader.readAsDataURL(file);
            }
        }
    }

    function renderImages() {
        imageList.innerHTML = '';
        uploadedImages.forEach((imgData) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.id = imgData.id;
            
            const img = document.createElement('img');
            img.src = imgData.data;
            img.alt = imgData.name;
            
            const controls = document.createElement('div');
            controls.className = 'controls';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'icon-btn remove';
            removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            removeBtn.onclick = () => {
                uploadedImages = uploadedImages.filter(img => img.id !== imgData.id);
                renderImages();
                resetPreview();
            };
            
            const moveBtn = document.createElement('div');
            moveBtn.className = 'icon-btn move';
            moveBtn.innerHTML = '<i class="fas fa-grip-vertical"></i>';
            moveBtn.setAttribute('draggable', 'true');
            
            // Drag and Drop reordering logic
            moveBtn.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', imgData.id);
                setTimeout(() => imageItem.classList.add('dragging'), 0);
            });
            
            moveBtn.addEventListener('dragend', () => {
                imageItem.classList.remove('dragging');
                updateOrderFromDOM();
            });
            
            imageItem.appendChild(img);
            imageItem.appendChild(moveBtn);
            controls.appendChild(removeBtn);
            imageItem.appendChild(controls);
            
            imageList.appendChild(imageItem);
            
            imageItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(imageList, e.clientX, e.clientY);
                const draggable = document.querySelector('.dragging');
                if (afterElement == null) {
                    imageList.appendChild(draggable);
                } else {
                    imageList.insertBefore(draggable, afterElement);
                }
            });
        });
    }

    function updateOrderFromDOM() {
        const currentElements = imageList.querySelectorAll('.image-item');
        const newOrder = [];
        currentElements.forEach(el => {
            const id = el.dataset.id;
            const imgData = uploadedImages.find(img => img.id === id);
            if(imgData) newOrder.push(imgData);
        });
        uploadedImages = newOrder;
    }

    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.image-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Assuming grid layout, check both X and Y mostly
            const offset = x - box.left - box.width / 2;
            const offsetY = y - box.top - box.height / 2;
            
            if (offset < 0 && offsetY < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function resetPreview() {
        generatedPdf = null;
        downloadBtn.disabled = true;
        previewContainer.innerHTML = `
            <div class="empty-state">
                <i class="far fa-file-pdf"></i>
                <p>Ready to generate.</p>
            </div>
        `;
    }

    function generatePDF() {
        if (uploadedImages.length === 0) {
            alert('Please upload at least one image.');
            return;
        }

        // Add loading state
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        // Use setTimeout to allow UI to update before heavy processing
        setTimeout(() => {
            try {
                processPDFGeneration();
            } catch (error) {
                console.error("PDF Generation failed:", error);
                alert("Failed to generate PDF. Please try again.");
            } finally {
                generateBtn.innerHTML = '<i class="fas fa-cog"></i> Generate PDF';
                generateBtn.disabled = false;
            }
        }, 100);
    }

    function processPDFGeneration() {
        const pageLayout = document.getElementById('pageLayout').value;
        const pageSize = document.getElementById('pageSize').value;
        const borderSizeVal = parseInt(borderSize.value);
        const borderColor = document.getElementById('borderColor').value;
        // qualityVal not directly used in 'FAST' but kept for future logic
        // const qualityVal = parseFloat(quality.value) / 100; 
        const addWatermarkVal = addWatermark.checked;
        const watermarkTextVal = document.getElementById('watermarkText').value;
        const watermarkColorVal = document.getElementById('watermarkColor').value;

        let pdf;
        switch (pageSize) {
            case 'letter':
                pdf = new jsPDF('p', 'mm', [279.4, 215.9]);
                break;
            case 'legal':
                pdf = new jsPDF('p', 'mm', [355.6, 215.9]);
                break;
            default: // A4
                pdf = new jsPDF('p', 'mm', [297, 210]);
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (pageLayout === 'single') {
            uploadedImages.forEach((imageData, index) => {
                if (index > 0) pdf.addPage();
                
                const imgProps = pdf.getImageProperties(imageData.data);
                const border = borderSizeVal;
                const imgWidth = pageWidth - (border * 2);
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                
                if (border > 0) {
                    pdf.setFillColor(borderColor);
                    pdf.rect(border/2, border/2, pageWidth - border, pageHeight - border, 'F');
                }
                
                pdf.addImage(imageData.data, 'JPEG', border, border, imgWidth, imgHeight, undefined, 'FAST');
                addWatermarkToPage(pdf, pageWidth, pageHeight, addWatermarkVal, watermarkTextVal, watermarkColorVal);
            });
        } else if (pageLayout === 'double') {
            for (let i = 0; i < uploadedImages.length; i += 2) {
                if (i > 0) pdf.addPage();
                
                const firstImage = uploadedImages[i];
                const secondImage = uploadedImages[i + 1];
                
                if (firstImage) {
                    const imgProps1 = pdf.getImageProperties(firstImage.data);
                    const border = borderSizeVal;
                    const imgWidth = (pageWidth / 2) - (border * 1.5);
                    const imgHeight1 = (imgProps1.height * imgWidth) / imgProps1.width;
                    
                    if (border > 0) {
                        pdf.setFillColor(borderColor);
                        pdf.rect(border/2, border/2, (pageWidth / 2) - border, pageHeight - border, 'F');
                    }
                    
                    pdf.addImage(firstImage.data, 'JPEG', border, border, imgWidth, imgHeight1, undefined, 'FAST');
                }
                
                if (secondImage) {
                    const imgProps2 = pdf.getImageProperties(secondImage.data);
                    const border = borderSizeVal;
                    const imgWidth = (pageWidth / 2) - (border * 1.5);
                    const imgHeight2 = (imgProps2.height * imgWidth) / imgProps2.width;
                    
                    if (border > 0) {
                        pdf.setFillColor(borderColor);
                        pdf.rect((pageWidth / 2) + border/2, border/2, (pageWidth / 2) - border, pageHeight - border, 'F');
                    }
                    
                    pdf.addImage(secondImage.data, 'JPEG', (pageWidth / 2) + border, border, imgWidth, imgHeight2, undefined, 'FAST');
                }
                addWatermarkToPage(pdf, pageWidth, pageHeight, addWatermarkVal, watermarkTextVal, watermarkColorVal);
            }
        } else if (pageLayout === 'grid') {
            for (let i = 0; i < uploadedImages.length; i += 4) {
                if (i > 0) pdf.addPage();
                
                const images = [uploadedImages[i], uploadedImages[i+1], uploadedImages[i+2], uploadedImages[i+3]];
                const border = borderSizeVal;
                const cellWidth = (pageWidth - (border * 3)) / 2;
                const cellHeight = (pageHeight - (border * 3)) / 2;
                
                images.forEach((image, idx) => {
                    if (!image) return;
                    
                    const row = Math.floor(idx / 2);
                    const col = idx % 2;
                    const x = border + (col * (cellWidth + border));
                    const y = border + (row * (cellHeight + border));
                    
                    if (border > 0) {
                        pdf.setFillColor(borderColor);
                        pdf.rect(x - border/2, y - border/2, cellWidth + border, cellHeight + border, 'F');
                    }
                    
                    const imgProps = pdf.getImageProperties(image.data);
                    const imgWidth = cellWidth;
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                    const yOffset = Math.max(0, (cellHeight - imgHeight) / 2);
                    
                    pdf.addImage(image.data, 'JPEG', x, y + yOffset, imgWidth, imgHeight, undefined, 'FAST');
                });
                addWatermarkToPage(pdf, pageWidth, pageHeight, addWatermarkVal, watermarkTextVal, watermarkColorVal);
            }
        }

        generatedPdf = pdf;
        downloadBtn.disabled = false;
        
        previewContainer.innerHTML = `
            <div style="color: var(--brand-success); margin-bottom: 12px;">
                <i class="fas fa-check-circle" style="font-size: 2rem;"></i>
            </div>
            <p style="font-weight: 500; color: var(--text-primary);">Success!</p>
            <p class="mt-2 text-sm">Compiled ${uploadedImages.length} image(s) using ${pageLayout} layout.</p>
        `;
    }

    function addWatermarkToPage(pdf, pageWidth, pageHeight, enabled, text, color) {
        if (enabled && text) {
            pdf.setFontSize(40);
            pdf.setTextColor(color);
            pdf.setGlobalAlpha(0.2);
            const textWidth = pdf.getTextWidth(text);
            pdf.text(text, (pageWidth - textWidth) / 2, pageHeight / 2, { angle: 45 });
            pdf.setGlobalAlpha(1);
        }
    }

    function downloadPDF() {
        if (generatedPdf) {
            generatedPdf.save('Premium-ImageToPDF.pdf');
        }
    }
});
