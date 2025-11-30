class MangaViewer {
    constructor() {
        this.allPages = [];
        this.loadedPages = new Set();
        this.isLoadingMore = false;
        this.catalog = [];
        this.pageLinks = {};
        this.init();
    }

    async init() {
        await this.loadCatalog();
        await this.loadAllPages();
        this.setupEventListeners();
        this.observePages();
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

    async loadAllPages() {
        try {
            const response = await fetch('paginas/');
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const links = Array.from(doc.querySelectorAll('a'))
                .map(a => a.textContent)
                .filter(name => /\.(png|jpg|jpeg|webp)$/i.test(name))
                .sort();

            this.allPages = links;

        } catch (error) {
            console.warn('No se pudo detectar archivos en la carpeta paginas/', error);
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

        // SIEMPRE ir a la página interna
        link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToPage(item.startPage);
        });

        // Solo le agregamos una clase visual si es external (opcional)
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
        const endIndex = Math.min(startIndex + 5, this.allPages.length);

        if (startIndex >= this.allPages.length) {
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
        const pageUrl = `paginas/${this.allPages[pageIndex]}`;

        img.src = pageUrl;
        img.alt = `Página ${pageIndex + 1}`;
        img.loading = 'lazy';

        const pageNum = document.createElement('div');
        pageNum.className = 'viewer-page-number';
        pageNum.textContent = pageIndex + 1;

        viewer.appendChild(img);
        viewer.appendChild(pageNum);

        // Si esta página tiene un link externo, hacerla clickeable
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

            const nextItemStart = this.catalog[index + 1]?.startPage || this.allPages.length + 1;

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


// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new MangaViewer();
});
