class MangaViewer {
    constructor() {
        this.pages = [];
        this.loadedPages = new Set();
        this.isLoadingMore = false;
        this.catalog = [];
        this.pageLinks = {};
        this.init();
    }

    async init() {
        await this.loadPages();
        await this.loadCatalog();
        this.setupEventListeners();
        this.observePages();
        this.setupMascot(); // nuevo
    }

    // ===== NUEVO: Carga directa desde pages.json =====
    async loadPages() {
        try {
            const response = await fetch('data/pages.json');
            this.pages = await response.json();
            console.log('Páginas cargadas:', this.pages.length);
        } catch (error) {
            console.error('Error cargando pages.json:', error);
        }
    }

    async loadCatalog() {
        try {
            const response = await fetch('data/catalog.json');
            this.catalog = await response.json();

            // Crear mapa de páginas con links externos
            this.catalog.forEach((item) => {
                if (item.type === 'external' && item.startPage && item.url) {
                    this.pageLinks[item.startPage] = item.url;
                }
            });

            this.renderCatalog();

        } catch (error) {
            console.error('Error cargando catálogo:', error);
        }
    }

    renderCatalog() {
        const catalog = document.getElementById('catalog');
        if (!catalog) return;

        catalog.innerHTML = '';

        this.catalog.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'catalog__item';

            const link = document.createElement('a');
            link.className = 'catalog__link';

            if (index === 0) link.classList.add('active');

            link.href = '#';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToPage(item.startPage);
            });

            if (item.type === 'external') {
                link.classList.add('external-indicator');
            }

            link.textContent = item.title;

            li.appendChild(link);
            catalog.appendChild(li);
        });
    }

    scrollToPage(pageNumber) {
        const pageElement = document.getElementById(`page-${pageNumber}`);

        if (pageElement) {
            pageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            this.updateActiveCatalogLink(pageNumber);
        }
    }

    loadMorePages() {
        if (this.isLoadingMore) return;

        const wrapper = document.getElementById('contentWrapper');
        if (!wrapper) return;

        const startIndex = this.loadedPages.size;
        const endIndex = Math.min(startIndex + 5, this.pages.length);

        if (startIndex >= this.pages.length) {
            return;
        }

        this.isLoadingMore = true;

        for (let i = startIndex; i < endIndex; i++) {
            if (!this.loadedPages.has(i)) {
                this.createPageElement(wrapper, i);
                this.loadedPages.add(i);
            }
        }

        this.isLoadingMore = false;
    }

    createPageElement(wrapper, pageIndex) {
        const viewer = document.createElement('div');
        viewer.className = 'viewer';
        viewer.id = `page-${pageIndex + 1}`;
        viewer.dataset.page = pageIndex + 1;

        const img = document.createElement('img');
        const pageData = this.pages[pageIndex];

        img.src = pageData.image;
        img.alt = `Página ${pageIndex + 1}`;
        img.loading = 'lazy';

        const pageNum = document.createElement('div');
        pageNum.className = 'viewer-page-number';
        pageNum.textContent = pageIndex + 1;

        viewer.appendChild(img);
        viewer.appendChild(pageNum);

        // Página con link externo
        if (this.pageLinks[pageIndex + 1]) {
            viewer.style.cursor = 'pointer';

            viewer.addEventListener('click', () => {
                window.open(this.pageLinks[pageIndex + 1], '_blank');
            });

            viewer.classList.add('viewer--clickable');
        }

        wrapper.appendChild(viewer);
    }

    observePages() {
        const mainContent = document.getElementById('mainContent');
        const wrapper = document.getElementById('contentWrapper');

        if (!mainContent || !wrapper) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const page = parseInt(entry.target.dataset.page);

                        if (page >= this.loadedPages.size - 2) {
                            this.loadMorePages();
                        }

                        this.updateActiveCatalogLink(page);
                    }
                });
            },
            {
                root: mainContent,
                threshold: 0.1
            }
        );

        const mutationObserver = new MutationObserver(() => {
            document.querySelectorAll('.viewer').forEach((page) => {
                if (!page.dataset.observed) {
                    observer.observe(page);
                    page.dataset.observed = 'true';
                }
            });
        });

        mutationObserver.observe(wrapper, { childList: true });

        this.loadMorePages();
    }

    updateActiveCatalogLink(pageNumber) {
        const links = document.querySelectorAll('.catalog__link');

        links.forEach((link, index) => {
            const item = this.catalog[index];

            if (!item || item.type === 'external') return;

            const nextItemStart = this.catalog[index + 1]?.startPage || this.pages.length + 1;

            const isInRange =
                pageNumber >= item.startPage &&
                pageNumber < nextItemStart;

            link.classList.toggle('active', isInRange);
        });
    }

    setupEventListeners() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar-floating--collapsed');
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                this.scrollToStart();
            }

            if (e.key === 'ArrowDown') {
                this.scrollToEnd();
            }
        });

        if (mainContent) {
            mainContent.addEventListener('scroll', () => {
                const scrollTop = mainContent.scrollTop;
                const scrollHeight = mainContent.scrollHeight;
                const clientHeight = mainContent.clientHeight;

                if (scrollTop + clientHeight >= scrollHeight - 50) {
                    this.loadMorePages();
                }
            });
        }
    }

    setupMascot() {
        const mascot = document.getElementById('mascot');
        const mascotToggle = document.getElementById('mascotToggle');
        const mascotContent = document.getElementById('mascotContent');
        
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        if (!mascot) return;

        // Toggle minimizar/maximizar
        if (mascotToggle) {
            mascotToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                mascot.classList.toggle('minimized');
            });
        }

        // Drag & Drop con mouse
        if (mascotContent) {
            mascotContent.addEventListener('mousedown', startDrag);
        }
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Touch events para móviles
        if (mascotContent) {
            mascotContent.addEventListener('touchstart', startDrag);
        }
        
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', stopDrag);

        function startDrag(e) {
            isDragging = true;
            mascot.classList.add('dragging');
            
            const rect = mascot.getBoundingClientRect();
            
            if (e.type === 'touchstart') {
                offsetX = e.touches[0].clientX - rect.left;
                offsetY = e.touches[0].clientY - rect.top;
            } else {
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
            }
            
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            
            let clientX, clientY;
            
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const newLeft = clientX - offsetX;
            const newTop = clientY - offsetY;
            
            // Limitar dentro de la ventana
            const maxX = window.innerWidth - mascot.offsetWidth;
            const maxY = window.innerHeight - mascot.offsetHeight;
            
            const boundedLeft = Math.max(0, Math.min(newLeft, maxX));
            const boundedTop = Math.max(0, Math.min(newTop, maxY));
            
            mascot.style.left = boundedLeft + 'px';
            mascot.style.top = boundedTop + 'px';
            mascot.style.right = 'auto';
            mascot.style.bottom = 'auto';
        }

        function stopDrag() {
            if (isDragging) {
                isDragging = false;
                mascot.classList.remove('dragging');
            }
        }
    }

    scrollToStart() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }

    scrollToEnd() {
        const mainContent = document.getElementById('mainContent');
        const wrapper = document.getElementById('contentWrapper');

        if (mainContent && wrapper) {
            mainContent.scrollTop = wrapper.scrollHeight;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MangaViewer();
});
