// State Management
let watchlists = JSON.parse(localStorage.getItem('valyxis_watchlists')) || [];
let currentWatchlistId = null;
let currentStockSymbol = null;
let autoRefreshInterval = null;
let stockDataCache = {};
let sortState = { column: null, direction: 'asc' };
let debounceTimer = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupWatchlists();
    setupModals();
    setupEventListeners();
    setupKeyboardShortcuts();
    loadWatchlists();
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const stockInput = document.getElementById('stock-input');
            if (stockInput && document.getElementById('watchlist-detail-page').classList.contains('active')) {
                stockInput.focus();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        
        // Ctrl/Cmd + R to refresh (prevent default browser refresh)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && document.getElementById('watchlist-detail-page').classList.contains('active')) {
            e.preventDefault();
            refreshStocks();
        }
    });
}

// Navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Handle hash navigation
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (hash === 'home' || hash === '') {
            navigateToPage('home');
        } else if (hash === 'watchlists') {
            navigateToPage('watchlists');
        }
    });

    // Initial page load
    const hash = window.location.hash.substring(1);
    if (hash === 'watchlists') {
        navigateToPage('watchlists');
    } else {
        navigateToPage('home');
    }
}

function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    // Update URL
    if (page === 'home') {
        window.history.pushState(null, '', '#home');
    } else if (page === 'watchlists') {
        window.history.pushState(null, '', '#watchlists');
    }
}

// Watchlists Management
function setupWatchlists() {
    const createBtn = document.getElementById('create-watchlist-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            document.getElementById('create-watchlist-modal').classList.add('active');
            document.getElementById('new-watchlist-name').value = '';
            document.getElementById('new-watchlist-name').focus();
        });
    }

    const confirmCreateBtn = document.getElementById('confirm-create-watchlist');
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', () => {
            const name = document.getElementById('new-watchlist-name').value.trim();
            if (name) {
                createWatchlist(name);
                document.getElementById('create-watchlist-modal').classList.remove('active');
            }
        });
    }

    const backBtn = document.getElementById('back-to-watchlists');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            stopAutoRefresh();
            navigateToPage('watchlists');
        });
    }

    const editNameBtn = document.getElementById('edit-watchlist-name');
    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            const watchlist = watchlists.find(w => w.id === currentWatchlistId);
            if (watchlist) {
                document.getElementById('edit-watchlist-name-input').value = watchlist.name;
                document.getElementById('edit-watchlist-modal').classList.add('active');
            }
        });
    }

    const confirmEditBtn = document.getElementById('confirm-edit-watchlist');
    if (confirmEditBtn) {
        confirmEditBtn.addEventListener('click', () => {
            const name = document.getElementById('edit-watchlist-name-input').value.trim();
            if (name) {
                editWatchlistName(currentWatchlistId, name);
                document.getElementById('edit-watchlist-modal').classList.remove('active');
            }
        });
    }

    const deleteBtn = document.getElementById('delete-watchlist');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this watchlist?')) {
                const watchlistName = watchlists.find(w => w.id === currentWatchlistId)?.name || 'Watchlist';
                deleteWatchlist(currentWatchlistId);
                showToast(`${watchlistName} deleted`, 'info');
                navigateToPage('watchlists');
            }
        });
    }
}

function createWatchlist(name) {
    const newWatchlist = {
        id: Date.now().toString(),
        name: name,
        stocks: []
    };
    watchlists.push(newWatchlist);
    saveWatchlists();
    showToast(`Watchlist "${name}" created`, 'success');
    loadWatchlists();
}

function editWatchlistName(id, name) {
    const watchlist = watchlists.find(w => w.id === id);
    if (watchlist) {
        watchlist.name = name;
        saveWatchlists();
        showToast(`Watchlist renamed to "${name}"`, 'success');
        loadWatchlists();
        if (currentWatchlistId === id) {
            document.getElementById('watchlist-title').textContent = name;
        }
    }
}

function deleteWatchlist(id) {
    watchlists = watchlists.filter(w => w.id !== id);
    saveWatchlists();
    loadWatchlists();
}

function loadWatchlists() {
    const container = document.getElementById('watchlists-container');
    if (!container) return;

    if (watchlists.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📊</div>
                <h3>No Watchlists Yet</h3>
                <p>Create your first watchlist to start tracking stocks</p>
            </div>
        `;
        return;
    }

    container.innerHTML = watchlists.map(watchlist => `
        <div class="watchlist-card" data-id="${watchlist.id}">
            <div class="watchlist-card-header">
                <div>
                    <h3>${escapeHtml(watchlist.name)}</h3>
                    <div class="watchlist-stock-count">${watchlist.stocks.length} stock${watchlist.stocks.length !== 1 ? 's' : ''}</div>
                </div>
                <div class="watchlist-card-actions">
                    <button class="btn btn-icon" onclick="event.stopPropagation(); editWatchlistName('${watchlist.id}', prompt('Enter new name:', '${escapeHtml(watchlist.name)}'))" title="Edit">✏️</button>
                    <button class="btn btn-icon btn-danger" onclick="event.stopPropagation(); if(confirm('Delete this watchlist?')) { deleteWatchlist('${watchlist.id}'); }" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners
    container.querySelectorAll('.watchlist-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.watchlist-card-actions')) {
                const id = card.getAttribute('data-id');
                openWatchlist(id);
            }
        });
    });
}

function openWatchlist(id) {
    currentWatchlistId = id;
    const watchlist = watchlists.find(w => w.id === id);
    if (!watchlist) return;

    document.getElementById('watchlist-title').textContent = watchlist.name;
    const container = document.getElementById('stocks-container');
    
    // Show watchlist detail page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('watchlist-detail-page').classList.add('active');

    // Load stocks
    loadWatchlistStocks(watchlist.stocks);
}

function loadWatchlistStocks(stocks) {
    const container = document.getElementById('stocks-container');
    if (stocks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📈</div>
                <h3>No Stocks Yet</h3>
                <p>Add stocks to this watchlist to start tracking</p>
            </div>
        `;
        return;
    }

    showSkeletonLoader(container, 'table');

    // Fetch all stock data in parallel
    Promise.all(stocks.map(symbol => fetchStockData(symbol).catch(err => {
        console.error(`Error fetching ${symbol}:`, err);
        return null;
    })))
        .then(results => {
            const validResults = results.filter(r => r !== null && r !== undefined);
            if (validResults.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">⚠️</div>
                        <h3>Unable to Load Stock Data</h3>
                        <p>Please check your internet connection and try refreshing. The API may be temporarily unavailable.</p>
                        <button class="btn btn-primary" onclick="refreshStocks()" style="margin-top: 1rem;">Retry</button>
                    </div>
                `;
                showToast('Failed to load stock data. Please try refreshing.', 'error');
            } else {
                displayStocks(validResults);
            }
        })
        .catch(error => {
            console.error('Error loading stocks:', error);
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Error Loading Stocks</h3>
                    <p>${error.message || 'Please try again in a moment.'}</p>
                    <button class="btn btn-primary" onclick="refreshStocks()" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
            showToast('Error loading stocks. Please try again.', 'error');
        });
}

function displayStocks(stocksData) {
    const container = document.getElementById('stocks-container');
    if (stocksData.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📈</div>
                <h3>No Stocks Available</h3>
                <p>Unable to load stock data</p>
            </div>
        `;
        return;
    }

    // Apply sorting if active
    let sortedData = stocksData;
    if (sortState.column) {
        sortedData = sortTable(stocksData, sortState.column, sortState.direction);
    }

    container.innerHTML = `
        <div class="stocks-table-wrapper">
            <table class="stocks-table">
                <thead>
                    <tr>
                        <th class="sortable" data-column="ticker">Ticker</th>
                        <th class="sortable" data-column="sector">Sector</th>
                        <th class="sortable" data-column="price">Price</th>
                        <th class="sortable" data-column="1d">1D%</th>
                        <th class="sortable" data-column="1w">1W%</th>
                        <th class="sortable" data-column="1m">1M%</th>
                        <th class="sortable" data-column="pe">P/E</th>
                        <th class="sortable" data-column="peg">PEG</th>
                        <th class="sortable" data-column="eps">EPS</th>
                        <th class="sortable" data-column="div">DIV %</th>
                        <th class="sortable" data-column="52w">52W High</th>
                        <th class="sortable" data-column="delta52w">Δ from 52W</th>
                        <th>Chart</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedData.map(stock => {
                        const change1D = stock.change1D || 0;
                        const change1W = stock.change1W || 0;
                        const change1M = stock.change1M || 0;
                        const delta52W = ((stock.price / stock.high52Week - 1) * 100) || 0;
                        
                        return `
                            <tr class="stock-row" data-symbol="${stock.symbol}">
                                <td class="ticker-cell">
                                    <strong>${stock.symbol}</strong>
                                    <div class="company-name-small">${(stock.companyName || '').substring(0, 20)}${(stock.companyName && stock.companyName.length > 20 ? '...' : '')}</div>
                                </td>
                                <td>${stock.sector || 'N/A'}</td>
                                <td class="price-cell">$${formatNumber(stock.price)}</td>
                                <td class="${change1D >= 0 ? 'positive' : 'negative'}">${change1D >= 0 ? '+' : ''}${formatNumber(change1D)}%</td>
                                <td class="${change1W >= 0 ? 'positive' : 'negative'}">${change1W >= 0 ? '+' : ''}${formatNumber(change1W)}%</td>
                                <td class="${change1M >= 0 ? 'positive' : 'negative'}">${change1M >= 0 ? '+' : ''}${formatNumber(change1M)}%</td>
                                <td>${(stock.peRatio !== null && stock.peRatio !== undefined && !isNaN(stock.peRatio)) ? formatNumber(stock.peRatio) : 'N/A'}</td>
                                <td>${(stock.pegRatio !== null && stock.pegRatio !== undefined && !isNaN(stock.pegRatio)) ? formatNumber(stock.pegRatio) : 'N/A'}</td>
                                <td>${(stock.eps !== null && stock.eps !== undefined && !isNaN(stock.eps)) ? formatNumber(stock.eps) : 'N/A'}</td>
                                <td>${(stock.dividendYield !== null && stock.dividendYield !== undefined && !isNaN(stock.dividendYield)) ? formatNumber(stock.dividendYield) + '%' : 'N/A'}</td>
                                <td>$${formatNumber(stock.high52Week)}</td>
                                <td class="${delta52W >= 0 ? 'positive' : 'negative'}">${formatNumber(delta52W)}%</td>
                                <td class="chart-cell">
                                    <div class="stock-spark-container" data-symbol="${stock.symbol}">
                                        <canvas id="spark-${stock.symbol}"></canvas>
                                    </div>
                                </td>
                                <td class="action-cell">
                                    <button class="btn btn-danger btn-small remove-stock-row-btn" data-symbol="${stock.symbol}">Remove</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Add sort listeners to table headers
    container.querySelectorAll('.stocks-table th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            if (sortState.column === column) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = column;
                sortState.direction = 'asc';
            }
            
            // Update header classes
            container.querySelectorAll('.stocks-table th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });
            header.classList.add(`sort-${sortState.direction}`);
            
            // Re-render with sorted data
            displayStocks(stocksData);
        });
        
        // Set initial sort state
        if (sortState.column === header.getAttribute('data-column')) {
            header.classList.add(`sort-${sortState.direction}`);
        }
    });

    // Add click listeners for stock rows
    container.querySelectorAll('.stock-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.stock-spark-container') && !e.target.closest('.remove-stock-row-btn') && !e.target.closest('.action-cell')) {
                const symbol = row.getAttribute('data-symbol');
                openStockDetail(symbol);
            }
        });
    });

    // Add remove button listeners
    container.querySelectorAll('.remove-stock-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const symbol = btn.getAttribute('data-symbol');
            if (currentWatchlistId && confirm(`Remove ${symbol} from this watchlist?`)) {
                removeStockFromWatchlist(currentWatchlistId, symbol);
                showToast(`${symbol} removed from watchlist`, 'info');
                refreshStocks();
            }
        });
    });

    // Render spark charts
    stocksData.forEach(stock => {
        if (stock.historicalData && stock.historicalData.length > 0) {
            renderSparkChart(stock.symbol, stock.historicalData);
        }
    });

    // Add click listeners for spark charts
    container.querySelectorAll('.stock-spark-container').forEach(container => {
        container.addEventListener('click', (e) => {
            const symbol = container.getAttribute('data-symbol');
            openStockDetail(symbol);
        });
    });
}

// Stock Management
function setupEventListeners() {
    const addStockBtn = document.getElementById('add-stock-btn');
    const stockInput = document.getElementById('stock-input');

    if (addStockBtn) {
        addStockBtn.addEventListener('click', addStockToWatchlist);
    }

    if (stockInput) {
        stockInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addStockToWatchlist();
            }
        });
        
        // Add debounced search suggestions (optional enhancement)
        stockInput.addEventListener('input', debounce((e) => {
            // Could add autocomplete here in the future
        }, 300));
    }

    const refreshBtn = document.getElementById('refresh-stocks-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshStocks);
    }

    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
    }

    const backToWatchlistBtn = document.getElementById('back-to-watchlist');
    if (backToWatchlistBtn) {
        backToWatchlistBtn.addEventListener('click', () => {
            if (currentWatchlistId) {
                openWatchlist(currentWatchlistId);
            } else {
                navigateToPage('watchlists');
            }
        });
    }

    const removeStockBtn = document.getElementById('remove-stock-btn');
    if (removeStockBtn) {
        removeStockBtn.addEventListener('click', () => {
            if (currentStockSymbol && currentWatchlistId) {
                if (confirm(`Remove ${currentStockSymbol} from this watchlist?`)) {
                    removeStockFromWatchlist(currentWatchlistId, currentStockSymbol);
                    showToast(`${currentStockSymbol} removed from watchlist`, 'info');
                    if (currentWatchlistId) {
                        openWatchlist(currentWatchlistId);
                    } else {
                        navigateToPage('watchlists');
                    }
                }
            }
        });
    }
}

async function addStockToWatchlist() {
    const input = document.getElementById('stock-input');
    const symbolOrName = input.value.trim().toUpperCase();
    
    if (!symbolOrName) return;
    if (!currentWatchlistId) return;

    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (!watchlist) return;

    // Check if stock already exists
    if (watchlist.stocks.includes(symbolOrName)) {
        showToast('Stock already in watchlist', 'warning');
        return;
    }

    // Try to fetch stock data to validate
    input.disabled = true;
    const addBtn = document.getElementById('add-stock-btn');
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';

    try {
        // First try as ticker symbol
        let stockData = await fetchStockData(symbolOrName);
        
        // If not found and it looks like a company name, try to search
        if (!stockData && symbolOrName.length > 2 && !symbolOrName.match(/^[A-Z]{1,5}$/)) {
            const searchResult = await searchStockByName(symbolOrName);
            if (searchResult) {
                stockData = await fetchStockData(searchResult);
            }
        }
        
        if (stockData && stockData.symbol) {
            watchlist.stocks.push(stockData.symbol);
            saveWatchlists();
            input.value = '';
            showToast(`${stockData.symbol} added successfully`, 'success');
            loadWatchlistStocks(watchlist.stocks);
        } else {
            showToast('Stock not found. Please check the ticker symbol or company name.', 'error');
        }
    } catch (error) {
        console.error('Error adding stock:', error);
        showToast('Error adding stock. Please try again.', 'error');
    } finally {
        input.disabled = false;
        addBtn.disabled = false;
        addBtn.textContent = 'Add Stock';
    }
}

function removeStockFromWatchlist(watchlistId, symbol) {
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (watchlist) {
        watchlist.stocks = watchlist.stocks.filter(s => s !== symbol);
        saveWatchlists();
    }
}

function refreshStocks() {
    if (!currentWatchlistId) return;
    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (watchlist) {
        // Clear cache to force fresh data
        Object.keys(stockDataCache).forEach(key => {
            delete stockDataCache[key];
        });
        showToast('Refreshing stock data...', 'info', 2000);
        loadWatchlistStocks(watchlist.stocks);
    }
}

function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    autoRefreshInterval = setInterval(() => {
        refreshStocks();
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Search stock by company name
async function searchStockByName(query) {
    try {
        // Try Finnhub search first
        const apiKey = 'cmt8bq9r01qj8q8l8hkgcmt8bq9r01qj8q8l8hk0';
        const finnhubResponse = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`);
        
        if (finnhubResponse.ok) {
            const data = await finnhubResponse.json();
            if (data.result && data.result.length > 0) {
                return data.result[0].symbol;
            }
        }
        
        // Fallback to Yahoo Finance
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(searchUrl));
        const yahooData = await response.json();
        
        if (yahooData.quotes && yahooData.quotes.length > 0) {
            return yahooData.quotes[0].symbol;
        }
    } catch (error) {
        console.error('Error searching stock:', error);
    }
    return null;
}

// Stock Data Fetching - Simplified and reliable
async function fetchStockData(symbol) {
    // Check cache first (2 minute cache)
    const cacheKey = symbol;
    const cached = stockDataCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < 120000) {
        return cached.data;
    }

    // Try direct proxy method first (most reliable)
    try {
        return await fetchStockDataDirect(symbol);
    } catch (error1) {
        console.error('Direct method failed:', error1);
        // Try serverless function
        try {
            return await fetchStockDataYahoo(symbol);
        } catch (error2) {
            console.error('Serverless method failed:', error2);
            // Last resort: Alpha Vantage
            try {
                return await fetchStockDataAlphaVantage(symbol);
            } catch (error3) {
                console.error('All methods failed:', error3);
                return null;
            }
        }
    }
}

// Primary: Use a working CORS proxy with Yahoo Finance
async function fetchStockDataFinnhub(symbol) {
    // This function name is kept for compatibility but uses Yahoo Finance
    // through a reliable proxy
    throw new Error('Use Yahoo instead');
}

// Direct fetch with proxy (most reliable)
async function fetchStockDataDirect(symbol) {
    const proxy = 'https://api.allorigins.win/raw?url=';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo&includePrePost=false`;
    const fullUrl = proxy + encodeURIComponent(yahooUrl);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    try {
        const response = await fetch(fullUrl, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        let data;
        
        if (responseData.contents) {
            try {
                data = typeof responseData.contents === 'string' 
                    ? JSON.parse(responseData.contents) 
                    : responseData.contents;
            } catch (e) {
                throw new Error('Failed to parse response');
            }
        } else {
            data = responseData;
        }
        
        return await parseYahooData(data, symbol);
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

// Primary: Use Vercel serverless function or proxy
async function fetchStockDataYahoo(symbol) {
    try {
        // Try serverless function first
        const baseUrl = window.location.origin;
        const chartUrl = `${baseUrl}/api/stock?symbol=${symbol}`;
        
        const response = await fetch(chartUrl, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            return await parseYahooData(data, symbol);
        }
    } catch (e) {
        console.log('Serverless function not available, using direct method');
    }
    
    // Fallback to direct proxy
    return await fetchStockDataDirect(symbol);
}

// Parse Yahoo Finance data
async function parseYahooData(data, symbol) {
    if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) {
        throw new Error('Invalid data structure from API');
    }

    const result = data.chart.result[0];
    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];

    const price = meta.regularMarketPrice || meta.previousClose || (closes.length > 0 ? closes[closes.length - 1] : 0);
    
    if (!price || price === 0 || isNaN(price)) {
        throw new Error(`Invalid price data for ${symbol}: ${price}`);
    }
    
    const previousClose = meta.previousClose || (closes.length > 1 ? closes[closes.length - 2] : price);
    const change = price - previousClose;
    const changePercent = previousClose && previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Build historical data
    const historicalData = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined && closes[i] > 0) {
            historicalData.push({
                date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                close: closes[i]
            });
        }
    }

    // Calculate 1W and 1M changes
    let change1W = 0;
    let change1M = 0;
    if (historicalData.length >= 5) {
        const weekAgoPrice = historicalData[Math.max(0, historicalData.length - 5)].close;
        if (weekAgoPrice && weekAgoPrice > 0) {
            change1W = ((price - weekAgoPrice) / weekAgoPrice) * 100;
        }
    }
    if (historicalData.length >= 20) {
        const monthAgoPrice = historicalData[Math.max(0, historicalData.length - 20)].close;
        if (monthAgoPrice && monthAgoPrice > 0) {
            change1M = ((price - monthAgoPrice) / monthAgoPrice) * 100;
        }
    }

    // Fetch additional company info from Yahoo Finance - BLOCKING to ensure we have all data
    let sector = 'N/A';
    let peRatio = null;
    let pegRatio = null;
    let eps = null;
    let dividendYield = null;
    
    // Scrape Yahoo Finance directly from their website
    try {
        const baseUrl = window.location.origin;
        const scrapeUrl = `${baseUrl}/api/scrapeYahoo?symbol=${symbol}`;
        
        const scrapeResponse = await fetch(scrapeUrl, { signal: AbortSignal.timeout(15000) });
        
        if (scrapeResponse && scrapeResponse.ok) {
            const scrapedData = await scrapeResponse.json();
            
            if (scrapedData.sector) sector = scrapedData.sector;
            if (scrapedData.peRatio !== null && scrapedData.peRatio !== undefined) peRatio = scrapedData.peRatio;
            if (scrapedData.pegRatio !== null && scrapedData.pegRatio !== undefined) pegRatio = scrapedData.pegRatio;
            if (scrapedData.eps !== null && scrapedData.eps !== undefined) eps = scrapedData.eps;
            if (scrapedData.dividendYield !== null && scrapedData.dividendYield !== undefined) dividendYield = scrapedData.dividendYield;
            
            console.log(`Scraped data for ${symbol}:`, scrapedData);
        }
    } catch (e) {
        console.log('Scraping failed, trying API method:', e);
        
        // Fallback to API method
        try {
            const proxy = 'https://api.allorigins.win/raw?url=';
            const yahooSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,defaultKeyStatistics,financialData,assetProfile,summaryDetail`;
            
            const summaryResponse = await fetch(proxy + encodeURIComponent(yahooSummaryUrl), { 
                signal: AbortSignal.timeout(10000) 
            });
            
            if (summaryResponse && summaryResponse.ok) {
                let summaryDataRaw = await summaryResponse.json();
                let summaryData;
                
                if (summaryDataRaw.contents) {
                    try {
                        summaryData = typeof summaryDataRaw.contents === 'string' 
                            ? JSON.parse(summaryDataRaw.contents) 
                            : summaryDataRaw.contents;
                    } catch (e) {
                        summaryData = summaryDataRaw;
                    }
                } else {
                    summaryData = summaryDataRaw;
                }
                
                if (summaryData && summaryData.quoteSummary && summaryData.quoteSummary.result && summaryData.quoteSummary.result[0]) {
                    const result = summaryData.quoteSummary.result[0];
                    const stats = result.defaultKeyStatistics || {};
                    const detail = result.summaryDetail || {};
                    
                    if (result.summaryProfile?.sector) sector = result.summaryProfile.sector;
                    if (stats.trailingPE !== null && stats.trailingPE !== undefined && stats.trailingPE !== 0) {
                        peRatio = stats.trailingPE;
                    } else if (stats.forwardPE !== null && stats.forwardPE !== undefined && stats.forwardPE !== 0) {
                        peRatio = stats.forwardPE;
                    }
                    if (stats.pegRatio !== null && stats.pegRatio !== undefined && stats.pegRatio !== 0) {
                        pegRatio = stats.pegRatio;
                    }
                    if (stats.trailingEps !== null && stats.trailingEps !== undefined && stats.trailingEps !== 0) {
                        eps = stats.trailingEps;
                    } else if (stats.forwardEps !== null && stats.forwardEps !== undefined && stats.forwardEps !== 0) {
                        eps = stats.forwardEps;
                    }
                    if (detail.dividendYield !== null && detail.dividendYield !== undefined) {
                        dividendYield = detail.dividendYield * 100;
                    } else if (detail.dividendRate !== null && detail.dividendRate !== undefined && price && price > 0) {
                        dividendYield = (detail.dividendRate / price) * 100;
                    }
                }
            }
        } catch (apiError) {
            console.error('API method also failed:', apiError);
        }
    }
    
    // If still missing data, try Alpha Vantage as fallback
    if ((sector === 'N/A' || !peRatio || !eps || !pegRatio || !dividendYield) && price > 0) {
        try {
            const apiKey = 'demo';
            const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
            const proxy = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(proxy + encodeURIComponent(overviewUrl), { signal: AbortSignal.timeout(8000) });
            
            if (response.ok) {
                const responseData = await response.json();
                const overviewData = responseData.contents ? JSON.parse(responseData.contents) : responseData;
                
                if (overviewData && !overviewData.Note && !overviewData['Error Message']) {
                    if (overviewData.Sector && sector === 'N/A') {
                        sector = overviewData.Sector;
                    }
                    if (overviewData.PERatio && !peRatio) {
                        peRatio = parseFloat(overviewData.PERatio);
                    }
                    if (overviewData.PEGRatio && !pegRatio) {
                        pegRatio = parseFloat(overviewData.PEGRatio);
                    }
                    if (overviewData.EPS && !eps) {
                        eps = parseFloat(overviewData.EPS);
                    }
                    if (overviewData.DividendYield && !dividendYield) {
                        dividendYield = parseFloat(overviewData.DividendYield) * 100;
                    }
                }
            }
        } catch (e) {
            console.log('Alpha Vantage fetch failed:', e);
        }
    }
    
    // Calculate missing values ONLY from real data (not estimates)
    // Only calculate if we have one but not the other
    if (peRatio === null && eps !== null && eps !== undefined && price && eps > 0 && !isNaN(eps)) {
        peRatio = price / eps;
        console.log(`Calculated P/E from EPS for ${symbol}: ${peRatio}`);
    }
    
    if (eps === null && peRatio !== null && peRatio !== undefined && price && peRatio > 0 && !isNaN(peRatio)) {
        eps = price / peRatio;
        console.log(`Calculated EPS from P/E for ${symbol}: ${eps}`);
    }
    
    // Try to get sector from company name if still N/A
    if (sector === 'N/A' && meta.longName) {
        const name = meta.longName.toLowerCase();
        if (name.includes('tech') || name.includes('software') || name.includes('apple') || name.includes('microsoft') || name.includes('google') || name.includes('nvidia') || name.includes('intel') || name.includes('amd')) {
            sector = 'Technology';
        } else if (name.includes('bank') || name.includes('financial') || name.includes('jpmorgan') || name.includes('goldman')) {
            sector = 'Financial Services';
        } else if (name.includes('health') || name.includes('pharma') || name.includes('medical') || name.includes('pfizer') || name.includes('johnson')) {
            sector = 'Healthcare';
        } else if (name.includes('energy') || name.includes('oil') || name.includes('gas') || name.includes('exxon') || name.includes('chevron')) {
            sector = 'Energy';
        } else if (name.includes('consumer') || name.includes('retail') || name.includes('walmart') || name.includes('target')) {
            sector = 'Consumer Cyclical';
        } else if (name.includes('communication') || name.includes('telecom') || name.includes('verizon') || name.includes('at&t')) {
            sector = 'Communication Services';
        } else if (name.includes('industrial') || name.includes('boeing') || name.includes('caterpillar')) {
            sector = 'Industrials';
        }
    }
    
    // DON'T estimate PEG - only use real data or leave as null
    // PEG is rarely available and estimates are unreliable
    
    // DON'T estimate dividend yield - only use real data or leave as null
    // If dividendYield is 0, that's valid (no dividend)
    // Only set to null if truly missing

    const high52Week = meta.fiftyTwoWeekHigh || (historicalData.length > 0 ? Math.max(...historicalData.map(d => d.close)) : price);

    // NO FINAL FALLBACKS - only use real data
    // If data is missing from Yahoo Finance, it should show as null/N/A, not estimated values

    const stockData = {
        symbol: symbol,
        companyName: meta.longName || meta.shortName || symbol,
        price: price,
        change1D: changePercent,
        change1W: change1W,
        change1M: change1M,
        sector: sector,
        peRatio: peRatio,
        pegRatio: pegRatio,
        eps: eps,
        dividendYield: dividendYield,
        high52Week: high52Week,
        historicalData: historicalData.slice(-30)
    };

    // Cache the data
    const cacheKey = symbol;
    stockDataCache[cacheKey] = {
        data: stockData,
        timestamp: Date.now()
    };

    return stockData;
}

// Fallback: Alpha Vantage API
async function fetchStockDataAlphaVantage(symbol) {
    const apiKey = 'demo';
    const baseUrl = 'https://www.alphavantage.co/query';

    const [quoteData, overviewData, timeSeriesData] = await Promise.all([
        fetch(`${baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`).then(r => r.json()),
        fetch(`${baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`).then(r => r.json()),
        fetch(`${baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`).then(r => r.json())
    ]);

    const quote = quoteData['Global Quote'] || {};
    const price = parseFloat(quote['05. price']) || 0;
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

    const sector = overviewData.Sector || 'N/A';
    const companyName = overviewData.Name || symbol;
    const peRatio = parseFloat(overviewData.PERatio) || null;
    const pegRatio = parseFloat(overviewData.PEGRatio) || null;
    const eps = parseFloat(overviewData.EPS) || null;
    const dividendYield = parseFloat(overviewData.DividendYield) || null;
    const high52Week = parseFloat(overviewData['52WeekHigh']) || price;

    let historicalData = [];
    let change1W = 0;
    let change1M = 0;

    if (timeSeriesData['Time Series (Daily)']) {
        const timeSeries = timeSeriesData['Time Series (Daily)'];
        const dates = Object.keys(timeSeries).sort();
        
        historicalData = dates.slice(-30).map(date => ({
            date: date,
            close: parseFloat(timeSeries[date]['4. close'])
        }));

        if (dates.length >= 5) {
            const weekAgoPrice = parseFloat(timeSeries[dates[dates.length - 5]]['4. close']);
            change1W = ((price - weekAgoPrice) / weekAgoPrice) * 100;
        }
        if (dates.length >= 20) {
            const monthAgoPrice = parseFloat(timeSeries[dates[dates.length - 20]]['4. close']);
            change1M = ((price - monthAgoPrice) / monthAgoPrice) * 100;
        }
    }

    const stockData = {
        symbol: symbol,
        companyName: companyName,
        price: price,
        change1D: changePercent,
        change1W: change1W,
        change1M: change1M,
        sector: sector,
        peRatio: peRatio,
        pegRatio: pegRatio,
        eps: eps,
        dividendYield: dividendYield ? dividendYield * 100 : null,
        high52Week: high52Week,
        historicalData: historicalData
    };

    stockDataCache[cacheKey] = {
        data: stockData,
        timestamp: Date.now()
    };

    return stockData;
}

// Stock Detail Page
async function openStockDetail(symbol) {
    currentStockSymbol = symbol;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('stock-detail-page').classList.add('active');

    const container = document.getElementById('stock-detail-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            displayStockDetail(stockData);
        } else {
            container.innerHTML = '<div class="empty-state"><p>Unable to load stock data</p></div>';
            showToast('Unable to load stock data', 'error');
        }
    } catch (error) {
        console.error('Error loading stock detail:', error);
        container.innerHTML = '<div class="empty-state"><p>Error loading stock data</p></div>';
        showToast('Error loading stock data', 'error');
    }
}

async function displayStockDetail(stock) {
    const container = document.getElementById('stock-detail-container');
    
    // Fetch extended historical data for detailed chart
    const extendedData = await fetchExtendedHistoricalData(stock.symbol);
    const historicalData = extendedData || stock.historicalData || [];

    const change1D = stock.change1D || 0;
    const changeClass = change1D >= 0 ? 'positive' : 'negative';
    const changeSign = change1D >= 0 ? '+' : '';

    container.innerHTML = `
        <div class="stock-detail-header">
            <div class="stock-detail-title">
                <div>
                    <h2>${stock.symbol}</h2>
                    <div class="stock-detail-company">${stock.companyName || 'N/A'}</div>
                </div>
                <div class="stock-detail-price-section">
                    <div class="stock-detail-price">$${formatNumber(stock.price)}</div>
                    <div class="stock-change ${changeClass}" style="font-size: 1.2rem;">${changeSign}${formatNumber(change1D)}%</div>
                </div>
            </div>
            <div class="stock-detail-metrics-grid">
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">Sector</div>
                    <div class="stock-detail-metric-value">${stock.sector || 'N/A'}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">1 Day Change</div>
                    <div class="stock-detail-metric-value ${changeClass}">${changeSign}${formatNumber(change1D)}%</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">1 Week Change</div>
                    <div class="stock-detail-metric-value ${(stock.change1W || 0) >= 0 ? 'positive' : 'negative'}">${formatNumber(stock.change1W || 0)}%</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">1 Month Change</div>
                    <div class="stock-detail-metric-value ${(stock.change1M || 0) >= 0 ? 'positive' : 'negative'}">${formatNumber(stock.change1M || 0)}%</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">P/E Ratio</div>
                    <div class="stock-detail-metric-value">${formatNumber(stock.peRatio) || 'N/A'}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">PEG Ratio</div>
                    <div class="stock-detail-metric-value">${formatNumber(stock.pegRatio) || 'N/A'}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">EPS</div>
                    <div class="stock-detail-metric-value">${formatNumber(stock.eps) || 'N/A'}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">Dividend Yield</div>
                    <div class="stock-detail-metric-value">${stock.dividendYield ? formatNumber(stock.dividendYield) + '%' : 'N/A'}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">52 Week High</div>
                    <div class="stock-detail-metric-value">$${formatNumber(stock.high52Week)}</div>
                </div>
                <div class="stock-detail-metric">
                    <div class="stock-detail-metric-label">Δ from 52W High</div>
                    <div class="stock-detail-metric-value ${((stock.price / stock.high52Week - 1) * 100 || 0) >= 0 ? 'positive' : 'negative'}">${formatNumber((stock.price / stock.high52Week - 1) * 100 || 0)}%</div>
                </div>
            </div>
        </div>
        <div class="stock-detail-chart-container">
            <div class="chart-controls">
                <button class="chart-timeframe-btn active" data-timeframe="1D">1D</button>
                <button class="chart-timeframe-btn" data-timeframe="1W">1W</button>
                <button class="chart-timeframe-btn" data-timeframe="1M">1M</button>
                <button class="chart-timeframe-btn" data-timeframe="3M">3M</button>
                <button class="chart-timeframe-btn" data-timeframe="6M">6M</button>
                <button class="chart-timeframe-btn" data-timeframe="1Y">1Y</button>
                <button class="chart-timeframe-btn" data-timeframe="ALL">ALL</button>
            </div>
            <div class="chart-container">
                <canvas id="stock-detail-chart"></canvas>
            </div>
        </div>
    `;

    // Setup chart timeframe buttons
    container.querySelectorAll('.chart-timeframe-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            container.querySelectorAll('.chart-timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const timeframe = btn.getAttribute('data-timeframe');
            const data = await fetchHistoricalDataForTimeframe(stock.symbol, timeframe);
            renderDetailChart(data, stock.symbol);
        });
    });

    // Render initial chart
    renderDetailChart(historicalData, stock.symbol);
}

async function fetchExtendedHistoricalData(symbol) {
    try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y&includePrePost=false`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const closes = result.indicators.quote[0].close || [];
            
            const historicalData = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] !== null && closes[i] !== undefined) {
                    historicalData.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        close: closes[i]
                    });
                }
            }
            return historicalData;
        }
    } catch (error) {
        console.error('Error fetching extended data:', error);
    }
    return null;
}

async function fetchHistoricalDataForTimeframe(symbol, timeframe) {
    try {
        const proxies = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];
        let range = '3mo';
        
        // Map timeframe to Yahoo Finance range
        const rangeMap = {
            '1D': '1d',
            '1W': '5d',
            '1M': '1mo',
            '3M': '3mo',
            '6M': '6mo',
            '1Y': '1y',
            'ALL': '5y'
        };
        
        range = rangeMap[timeframe] || '3mo';
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}&includePrePost=false`;
        
        let data = null;
        for (const proxy of proxies) {
            try {
                const response = await fetch(proxy + encodeURIComponent(yahooUrl));
                if (response.ok) {
                    data = await response.json();
                    if (data.chart && data.chart.result && data.chart.result[0]) {
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const closes = result.indicators.quote[0].close || [];
            
            const historicalData = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] !== null && closes[i] !== undefined) {
                    historicalData.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        close: closes[i]
                    });
                }
            }
            return historicalData;
        }
    } catch (error) {
        console.error('Error fetching timeframe data:', error);
    }
    return [];
}

// Chart Rendering
function renderSparkChart(symbol, data) {
    const canvas = document.getElementById(`spark-${symbol}`);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.offsetWidth || 100;
    const height = 40;
    canvas.width = width;
    canvas.height = height;

    const prices = data.map(d => d.close).filter(p => p && p > 0);
    if (prices.length === 0) return;
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = prices[prices.length - 1] >= prices[0] ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
        if (point.close && point.close > 0) {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((point.close - minPrice) / range) * height;
            
            if (index === 0 || (index > 0 && data[index - 1].close && data[index - 1].close > 0)) {
                if (index === 0 || !data[index - 1].close) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
    });

    ctx.stroke();
}

let detailChart = null;

function renderDetailChart(data, symbol) {
    const canvas = document.getElementById('stock-detail-chart');
    if (!canvas || !data || data.length === 0) return;

    // Destroy existing chart
    if (detailChart) {
        detailChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const labels = data.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const prices = data.map(d => d.close);
    const isPositive = prices[prices.length - 1] >= prices[0];

    detailChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price',
                data: prices,
                borderColor: isPositive ? '#10b981' : '#ef4444',
                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isPositive ? '#10b981' : '#ef4444',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${formatNumber(context.parsed.y)}`;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(45, 55, 72, 0.5)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(45, 55, 72, 0.5)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Modals
function setupModals() {
    // Close modals on outside click or close button
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        const cancelBtn = modal.querySelector('.modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    });
}

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Skeleton Loader
function showSkeletonLoader(container, type = 'table') {
    if (type === 'table') {
        container.innerHTML = `
            <div class="stocks-table-wrapper">
                <table class="stocks-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Sector</th>
                            <th>Price</th>
                            <th>1D%</th>
                            <th>1W%</th>
                            <th>1M%</th>
                            <th>P/E</th>
                            <th>PEG</th>
                            <th>EPS</th>
                            <th>DIV %</th>
                            <th>52W High</th>
                            <th>Δ from 52W</th>
                            <th>Chart</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array(5).fill(0).map(() => `
                            <tr class="skeleton-table-row">
                                ${Array(14).fill(0).map(() => '<td><div class="skeleton skeleton-text"></div></td>').join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (type === 'cards') {
        container.innerHTML = Array(6).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 80%;"></div>
            </div>
        `).join('');
    }
}

// Debounce Function
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(debounceTimer);
            func(...args);
        };
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(later, wait);
    };
}

// Utility Functions
function saveWatchlists() {
    localStorage.setItem('valyxis_watchlists', JSON.stringify(watchlists));
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sort Table Function
function sortTable(stocksData, column, direction) {
    const sorted = [...stocksData];
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'ticker':
                aVal = a.symbol || '';
                bVal = b.symbol || '';
                break;
            case 'sector':
                aVal = a.sector || '';
                bVal = b.sector || '';
                break;
            case 'price':
                aVal = a.price || 0;
                bVal = b.price || 0;
                break;
            case '1d':
                aVal = a.change1D || 0;
                bVal = b.change1D || 0;
                break;
            case '1w':
                aVal = a.change1W || 0;
                bVal = b.change1W || 0;
                break;
            case '1m':
                aVal = a.change1M || 0;
                bVal = b.change1M || 0;
                break;
            case 'pe':
                aVal = a.peRatio || 0;
                bVal = b.peRatio || 0;
                break;
            case 'peg':
                aVal = a.pegRatio || 0;
                bVal = b.pegRatio || 0;
                break;
            case 'eps':
                aVal = a.eps || 0;
                bVal = b.eps || 0;
                break;
            case 'div':
                aVal = a.dividendYield || 0;
                bVal = b.dividendYield || 0;
                break;
            case '52w':
                aVal = a.high52Week || 0;
                bVal = b.high52Week || 0;
                break;
            case 'delta52w':
                aVal = ((a.price / a.high52Week - 1) * 100) || 0;
                bVal = ((b.price / b.high52Week - 1) * 100) || 0;
                break;
            default:
                return 0;
        }
        
        if (typeof aVal === 'string') {
            return direction === 'asc' 
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
}

