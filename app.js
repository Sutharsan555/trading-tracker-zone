class AlphaTrack {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('alpha_trades')) || [];
        this.journal = JSON.parse(localStorage.getItem('alpha_journal')) || [];
        this.tasks = JSON.parse(localStorage.getItem('alpha_tasks')) || [
            { id: 1, text: 'Analyze market sentiment', completed: false },
            { id: 2, text: 'Check economic calendar', completed: false },
            { id: 3, text: 'Review daily trade plan', completed: false }
        ];
        this.equityChart = null;
        this.currentDate = new Date();
        this.activeTab = 'dashboard';
        this.editingTradeIndex = null;
        this.qrCode = null;

        // Firebase Cloud Sync
        this.db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;
        this.uid = localStorage.getItem('alpha_uid');

        this.init();
        this.setupAuth();
        this.loadCloudData();
    }

    async loadCloudData() {
        if (!this.db || !this.uid) return;

        console.log('Syncing with cloud...');
        try {
            const doc = await this.db.collection('user_data').doc(this.uid).get();
            if (doc.exists) {
                const data = doc.data();
                this.trades = data.trades || this.trades;
                this.journal = data.journal || this.journal;
                this.tasks = data.tasks || this.tasks;
                this.saveLocal();
                this.renderAll();
            }
        } catch (err) {
            console.error('Cloud load failed:', err);
        }
    }

    async syncToCloud() {
        if (!this.db || !this.uid) return;

        try {
            await this.db.collection('user_data').doc(this.uid).set({
                trades: this.trades,
                journal: this.journal,
                tasks: this.tasks,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('Cloud sync successful');
        } catch (err) {
            console.error('Cloud sync failed:', err);
        }
    }

    saveLocal() {
        localStorage.setItem('alpha_trades', JSON.stringify(this.trades));
        localStorage.setItem('alpha_journal', JSON.stringify(this.journal));
        localStorage.setItem('alpha_tasks', JSON.stringify(this.tasks));
    }

    setupAuth() {
        // Display user email
        const email = localStorage.getItem('alpha_user');
        const userDisplay = document.getElementById('user-email');
        if (userDisplay && email) {
            userDisplay.innerText = email;
        }

        // Logout logic
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (typeof firebase !== 'undefined') {
                    await firebase.auth().signOut();
                }
                localStorage.removeItem('alpha_auth');
                localStorage.removeItem('alpha_auth_token');
                localStorage.removeItem('alpha_user');
                localStorage.removeItem('alpha_uid');
                window.location.href = 'auth.html';
            });
        }
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
        this.setupMobileMenu();
        this.setupNetworkMonitoring();
        this.startMarketTicker();
        lucide.createIcons();
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Trade Form
        document.getElementById('trade-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTradeSubmit();
        });

        // Journal Form
        document.getElementById('journal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleJournalSubmit();
        });
    }

    setupNetworkMonitoring() {
        const updateStatus = () => {
            const badge = document.getElementById('network-status');
            const text = document.getElementById('status-text');
            if (navigator.onLine) {
                badge.classList.remove('offline');
                badge.classList.add('online');
                text.innerText = 'Online';
            } else {
                badge.classList.remove('online');
                badge.classList.add('offline');
                text.innerText = 'Offline';
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    startMarketTicker() {
        const assets = [
            { name: 'EUR/USD', price: 1.0842, volatility: 0.0002 },
            { name: 'GBP/USD', price: 1.2654, volatility: 0.0003 },
            { name: 'USD/JPY', price: 148.21, volatility: 0.02 },
            { name: 'BTC/USD', price: 43250.50, volatility: 50.00 },
            { name: 'AAPL', price: 185.92, volatility: 0.15 },
            { name: 'TSLA', price: 191.50, volatility: 0.25 }
        ];

        const ticker = document.getElementById('ticker-content');

        const updateTicker = () => {
            ticker.innerHTML = assets.map(a => {
                const change = (Math.random() - 0.5) * a.volatility;
                a.price += change;
                const isUp = change >= 0;
                return `
                    <span class="ticker-item">
                        ${a.name}: <span class="${isUp ? 'up' : 'down'}">
                            ${a.name.includes('JPY') || a.name.includes('BTC') ? a.price.toFixed(2) : a.price.toFixed(4)}
                            ${isUp ? '▲' : '▼'}
                        </span>
                    </span>
                `;
            }).join('');
        };

        setInterval(updateTicker, 2000);
        updateTicker();
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        const sidebarBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        const bottomBtn = document.querySelector(`.bottom-nav-item[data-tab="${tabId}"]`);

        if (sidebarBtn) sidebarBtn.classList.add('active');
        if (bottomBtn) bottomBtn.classList.add('active');

        const content = document.getElementById(tabId);
        if (content) content.classList.add('active');

        this.activeTab = tabId;
        const title = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        document.getElementById('active-tab-title').innerText = title === 'Forex' ? 'Forex Trades' : (title === 'Stocks' ? 'Stock Trades' : (title === 'Mobile' ? 'Mobile App' : title));

        if (tabId === 'calendar') this.renderCalendar();
        this.renderAll();

        // Close mobile sidebar if open
        document.querySelector('.sidebar').classList.remove('active');
    }

    setupMobileMenu() {
        const toggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        if (toggle) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    renderAll() {
        this.renderDashboard();
        this.renderTradeLogs();
        this.renderTasks();
        this.renderJournal();
        this.renderChart();
        this.updateStats();
    }

    updateStats() {
        const totalGrossPL = this.trades.reduce((sum, trade) => sum + parseFloat(trade.pl), 0);
        const totalCommission = this.trades.reduce((sum, trade) => sum + parseFloat(trade.commission || 0), 0);
        const totalNetPL = totalGrossPL - totalCommission;

        const wins = this.trades.filter(t => parseFloat(t.pl) > 0);
        const losses = this.trades.filter(t => parseFloat(t.pl) < 0);

        const winRate = this.trades.length > 0 ? (wins.length / this.trades.length * 100).toFixed(1) : 0;

        // Advanced Sheet Stats
        const avgWin = wins.length > 0 ? (wins.reduce((s, t) => s + parseFloat(t.pl), 0) / wins.length) : 0;
        const avgLoss = losses.length > 0 ? (losses.reduce((s, t) => s + Math.abs(parseFloat(t.pl)), 0) / losses.length) : 0;
        const profitFactor = avgLoss !== 0 ? ((wins.reduce((s, t) => s + parseFloat(t.pl), 0)) / (losses.reduce((s, t) => s + Math.abs(parseFloat(t.pl)), 0))).toFixed(2) : '∞';

        const plElement = document.getElementById('total-pl');
        if (plElement) {
            plElement.innerText = `$${totalNetPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            plElement.className = `stat-value ${totalNetPL >= 0 ? 'pl-positive' : 'pl-negative'}`;
        }

        if (document.getElementById('win-rate')) document.getElementById('win-rate').innerText = `${winRate}%`;
        if (document.getElementById('total-trades')) document.getElementById('total-trades').innerText = this.trades.length;

        // Update Sheet & Dashboard Stats
        if (document.getElementById('avg-winner')) document.getElementById('avg-winner').innerText = `$${avgWin.toFixed(2)}`;
        if (document.getElementById('avg-loser')) document.getElementById('avg-loser').innerText = `-$${avgLoss.toFixed(2)}`;
        if (document.getElementById('profit-factor')) document.getElementById('profit-factor').innerText = profitFactor;

        if (document.getElementById('dash-avg-winner')) document.getElementById('dash-avg-winner').innerText = `$${avgWin.toFixed(2)}`;
        if (document.getElementById('dash-avg-loser')) document.getElementById('dash-avg-loser').innerText = `-$${avgLoss.toFixed(2)}`;
        if (document.getElementById('dash-profit-factor')) document.getElementById('dash-profit-factor').innerText = profitFactor;

        const completedTasks = this.tasks.filter(t => t.completed).length;
        if (document.getElementById('task-progress')) document.getElementById('task-progress').innerText = `${completedTasks}/${this.tasks.length}`;

        // Max Drawdown Calculation
        this.updateMaxDrawdown();
    }

    updateMaxDrawdown() {
        if (this.trades.length === 0) return;

        const sortedTrades = [...this.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let peak = 0;
        let maxDrawdown = 0;
        let cumulativePL = 0;

        sortedTrades.forEach(t => {
            cumulativePL += parseFloat(t.pl) - parseFloat(t.commission || 0);
            if (cumulativePL > peak) peak = cumulativePL;
            const dd = peak - cumulativePL;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });

        const ddElement = document.getElementById('dash-max-drawdown');
        if (ddElement) {
            ddElement.innerText = `-$${maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    renderDashboard() {
        const tbody = document.querySelector('#recent-trades-table tbody');
        tbody.innerHTML = '';

        this.trades.slice(-5).reverse().forEach(trade => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Date">${trade.date}</td>
                <td data-label="Asset">${trade.asset}</td>
                <td data-label="Side"><span class="badge-side ${trade.side === 'Long' ? 'side-long' : 'side-short'}">${trade.side || '-'}</span></td>
                <td data-label="Type"><span class="badge">${trade.type.toUpperCase()}</span></td>
                <td data-label="Comm.">$${parseFloat(trade.commission || 0).toFixed(2)}</td>
                <td data-label="Reason"><small>${trade.reason || '-'}</small></td>
                <td data-label="P/L" class="${trade.pl >= 0 ? 'pl-positive' : 'pl-negative'}">$${trade.pl}</td>
                <td data-label="Status">${trade.pl >= 0 ? 'Profit' : 'Loss'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderTradeLogs() {
        const forexTable = document.querySelector('#forex-table tbody');
        const stocksTable = document.querySelector('#stocks-table tbody');

        if (!forexTable || !stocksTable) return;

        forexTable.innerHTML = '';
        stocksTable.innerHTML = '';

        this.trades.forEach((trade, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Date">${trade.date}</td>
                <td data-label="Asset">${trade.asset}</td>
                <td data-label="Side"><span class="badge-side ${trade.side === 'Long' ? 'side-long' : 'side-short'}">${trade.side || '-'}</span></td>
                <td data-label="Entry">${trade.entry}</td>
                <td data-label="Exit">${trade.exit}</td>
                <td data-label="Comm.">$${parseFloat(trade.commission || 0).toFixed(2)}</td>
                <td data-label="Reason"><small>${trade.reason || '-'}</small></td>
                <td data-label="P/L" class="${trade.pl >= 0 ? 'pl-positive' : 'pl-negative'}">$${trade.pl}</td>
                <td data-label="Actions">
                    <div class="action-group">
                        <button class="btn-icon" onclick="app.editTrade(${index})"><i data-lucide="edit-3"></i></button>
                        <button class="btn-icon" onclick="app.deleteTrade(${index})"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            `;

            if (trade.type === 'forex') forexTable.appendChild(tr);
            else stocksTable.appendChild(tr);
        });

        // Full Tracking Sheet Table
        const fullTable = document.querySelector('#full-tracking-table tbody');
        if (fullTable) {
            fullTable.innerHTML = '';
            this.trades.forEach(trade => {
                const netPl = parseFloat(trade.pl) - parseFloat(trade.commission || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Date">${trade.date}</td>
                    <td data-label="Asset">${trade.asset}</td>
                    <td data-label="Side"><span class="badge-side ${trade.side === 'Long' ? 'side-long' : 'side-short'}">${trade.side || '-'}</span></td>
                    <td data-label="Type"><span class="badge">${trade.type.toUpperCase()}</span></td>
                    <td data-label="Entry">${trade.entry}</td>
                    <td data-label="Exit">${trade.exit}</td>
                    <td data-label="Comm.">$${parseFloat(trade.commission || 0).toFixed(2)}</td>
                    <td data-label="Reason"><small>${trade.reason || '-'}</small></td>
                    <td data-label="Net P/L" class="${netPl >= 0 ? 'pl-positive' : 'pl-negative'}">$${netPl.toFixed(2)}</td>
                    <td data-label="Efficiency">${((Math.abs(netPl) / parseFloat(trade.entry)) * 100).toFixed(2)}%</td>
                `;
                fullTable.appendChild(tr);
            });
        }

        lucide.createIcons();
    }

    renderTasks() {
        const list = document.getElementById('tasks-list');
        list.innerHTML = '';

        this.tasks.forEach((task, index) => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                        onchange="app.toggleTask(${index})">
                    <span>${task.text}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="app.editTask(${index})"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="app.deleteTask(${index})"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            list.appendChild(div);
        });
        lucide.createIcons();
    }

    toggleTask(index) {
        this.tasks[index].completed = !this.tasks[index].completed;
        this.saveTasks();
        this.renderAll();
    }

    editTask(index) {
        const newText = prompt('Edit task:', this.tasks[index].text);
        if (newText !== null && newText.trim() !== "") {
            this.tasks[index].text = newText.trim();
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(index) {
        if (confirm('Delete this task?')) {
            this.tasks.splice(index, 1);
            this.saveTasks();
            this.renderAll();
        }
    }

    addTask() {
        const text = prompt('Enter task description:');
        if (text) {
            this.tasks.push({ id: Date.now(), text, completed: false });
            this.saveTasks();
            this.renderTasks();
        }
    }

    saveTasks() {
        this.saveLocal();
        this.syncToCloud();
    }

    showAddTradeModal(type = 'forex') {
        document.getElementById('trade-type').value = type;
        document.getElementById('trade-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('trade-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('trade-modal').classList.remove('active');
        document.getElementById('trade-form').reset();
        this.editingTradeIndex = null;
        document.querySelector('#trade-modal h2').innerText = 'Add New Trade';
    }

    editTrade(index) {
        const trade = this.trades[index];
        this.editingTradeIndex = index;

        document.querySelector('#trade-modal h2').innerText = 'Edit Trade';
        document.getElementById('trade-type').value = trade.type;
        document.getElementById('trade-asset').value = trade.asset;
        document.getElementById('trade-side').value = trade.side || 'Long';
        document.getElementById('trade-entry').value = trade.entry;
        document.getElementById('trade-exit').value = trade.exit;
        document.getElementById('trade-pl').value = trade.pl;
        document.getElementById('trade-commission').value = trade.commission || 0;
        document.getElementById('trade-date').value = trade.date;
        document.getElementById('trade-reason').value = trade.reason || '';

        document.getElementById('trade-modal').classList.add('active');
    }

    handleTradeSubmit() {
        const trade = {
            type: document.getElementById('trade-type').value,
            asset: document.getElementById('trade-asset').value,
            entry: document.getElementById('trade-entry').value,
            exit: document.getElementById('trade-exit').value,
            pl: document.getElementById('trade-pl').value,
            commission: document.getElementById('trade-commission').value || 0,
            side: document.getElementById('trade-side').value,
            reason: document.getElementById('trade-reason').value || '',
            date: document.getElementById('trade-date').value,
        };

        if (this.editingTradeIndex !== null) {
            this.trades[this.editingTradeIndex] = trade;
        } else {
            this.trades.push(trade);
        }

        this.saveLocal();
        this.syncToCloud();
        this.closeModal();
        this.renderAll();
    }

    deleteTrade(index) {
        if (confirm('Delete this trade?')) {
            this.trades.splice(index, 1);
            this.saveLocal();
            this.syncToCloud();
            this.renderAll();
        }
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('calendar-month-year');

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        monthYear.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.currentDate);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        grid.innerHTML = '';

        // Empty cells for first week
        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTrades = this.trades.filter(t => t.date === dateStr);
            const dailyGrossPL = dayTrades.reduce((sum, t) => sum + parseFloat(t.pl), 0);
            const dailyComm = dayTrades.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);
            const dailyNetPL = dailyGrossPL - dailyComm;

            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day ${dailyNetPL > 0 ? 'profit' : (dailyNetPL < 0 ? 'loss' : '')}`;
            dayEl.innerHTML = `
                <span class="day-number">${day}</span>
                <span class="day-pl">${dailyNetPL !== 0 ? '$' + dailyNetPL.toFixed(0) : ''}</span>
            `;
            grid.appendChild(dayEl);
        }
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    exportPDF(type) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const title = type.charAt(0).toUpperCase() + type.slice(1) + ' Trading Review';
        doc.setFontSize(20);
        doc.text(title, 20, 20);

        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

        let filteredTrades = [];
        const now = new Date();

        if (type === 'daily') {
            const today = now.toISOString().split('T')[0];
            filteredTrades = this.trades.filter(t => t.date === today);
        } else if (type === 'weekly') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            filteredTrades = this.trades.filter(t => new Date(t.date) >= weekAgo);
        } else if (type === 'monthly') {
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            filteredTrades = this.trades.filter(t => new Date(t.date) >= monthAgo);
        }

        const data = filteredTrades.map(t => [
            t.date,
            t.asset,
            t.side || '-',
            t.type.toUpperCase(),
            t.entry,
            t.exit,
            `$${parseFloat(t.commission || 0).toFixed(2)}`,
            t.reason || '-',
            `$${t.pl}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Date', 'Asset', 'Side', 'Type', 'Entry', 'Exit', 'Comm.', 'Reason', 'P/L']],
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        const totalGrossPL = filteredTrades.reduce((sum, t) => sum + parseFloat(t.pl), 0);
        const totalComm = filteredTrades.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);
        const totalNetPL = totalGrossPL - totalComm;

        doc.text(`Total Commission: $${totalComm.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 15);
        doc.text(`Total Net P/L: $${totalNetPL.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 25);

        // Include Journal Entries for Weekly and Monthly Reviews
        if (type === 'weekly' || type === 'monthly') {
            doc.addPage();
            doc.setFontSize(18);
            doc.text(`${type === 'weekly' ? 'Weekly' : 'Monthly'} Journal Summary`, 20, 20);

            let filteredJournal = [];
            const jNow = new Date();
            if (type === 'weekly') {
                const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
                filteredJournal = this.journal.filter(j => new Date(j.date) >= weekAgo);
            } else {
                const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));
                filteredJournal = this.journal.filter(j => new Date(j.date) >= monthAgo);
            }

            let yPos = 40;
            if (filteredJournal.length === 0) {
                doc.setFontSize(12);
                doc.text("No journal entries recorded for this period.", 20, yPos);
            } else {
                filteredJournal.forEach(entry => {
                    if (yPos > 270) { doc.addPage(); yPos = 20; }
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(14);
                    doc.text(`${entry.date}: ${entry.title}`, 20, yPos);
                    yPos += 10;

                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(11);
                    const splitText = doc.splitTextToSize(entry.content, 170);
                    doc.text(splitText, 20, yPos);
                    yPos += (splitText.length * 7) + 15;
                });
            }
        }

        doc.save(`AlphaTrack_${type}_Review.pdf`);
    }

    exportToCSV() {
        if (this.trades.length === 0) return alert('No trades to export.');

        const headers = ["Date", "Asset", "Side", "Type", "Entry", "Exit", "Commission", "Reason", "Gross P/L", "Net P/L"];
        const rows = this.trades.map(t => [
            t.date,
            t.asset,
            t.side || '',
            t.type,
            t.entry,
            t.exit,
            t.commission,
            `"${t.reason || ''}"`,
            t.pl,
            (parseFloat(t.pl) - parseFloat(t.commission || 0)).toFixed(2)
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "AlphaTrack_Export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    renderChart() {
        const ctx = document.getElementById('equity-chart');
        if (!ctx) return;

        if (this.trades.length === 0) {
            if (this.equityChart) this.equityChart.destroy();
            // Optional: show a message on the canvas or its parent
            return;
        }

        // Sort trades by date to calculate cumulative P/L correctly
        const sortedTrades = [...this.trades].sort((a, b) => new Date(a.date) - new Date(b.date));

        let cumulativePL = 0;
        const data = sortedTrades.map(t => {
            const netPl = parseFloat(t.pl) - parseFloat(t.commission || 0);
            cumulativePL += netPl;
            return { x: t.date, y: cumulativePL.toFixed(2) };
        });

        // Add a starting point at zero
        const firstDate = new Date(sortedTrades[0].date);
        firstDate.setDate(firstDate.getDate() - 1);
        data.unshift({ x: firstDate.toISOString().split('T')[0], y: 0 });

        if (this.equityChart) {
            this.equityChart.destroy();
        }

        this.equityChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Cumulative P/L ($)',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: (value) => `$${value}`
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `Total P/L: $${context.parsed.y}`
                        }
                    }
                }
            }
        });
    }

    showJournalModal(entry = null) {
        const modal = document.getElementById('journal-modal');
        const form = document.getElementById('journal-form');
        const title = document.getElementById('journal-modal-title');

        if (entry) {
            title.innerText = 'Edit Journal Entry';
            document.getElementById('journal-id').value = entry.id;
            document.getElementById('journal-title').value = entry.title;
            document.getElementById('journal-date').value = entry.date;
            document.getElementById('journal-content').value = entry.content;
        } else {
            title.innerText = 'New Journal Entry';
            form.reset();
            document.getElementById('journal-id').value = '';
            document.getElementById('journal-date').value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('active');
    }

    closeJournalModal() {
        document.getElementById('journal-modal').classList.remove('active');
        document.getElementById('journal-form').reset();
    }

    handleJournalSubmit() {
        const id = document.getElementById('journal-id').value;
        const entry = {
            id: id || Date.now(),
            title: document.getElementById('journal-title').value,
            date: document.getElementById('journal-date').value,
            content: document.getElementById('journal-content').value
        };

        if (id) {
            const index = this.journal.findIndex(e => e.id == id);
            this.journal[index] = entry;
        } else {
            this.journal.unshift(entry);
        }

        this.saveLocal();
        this.syncToCloud();
        this.closeJournalModal();
        this.renderJournal();
    }

    deleteJournal(id) {
        if (confirm('Delete this journal entry?')) {
            this.journal = this.journal.filter(e => e.id != id);
            this.saveLocal();
            this.syncToCloud();
            this.renderJournal();
        }
    }

    editJournalAction(id) {
        const entry = this.journal.find(e => e.id == id);
        if (entry) this.showJournalModal(entry);
    }

    renderJournal() {
        const list = document.getElementById('journal-list');
        if (!list) return;
        list.innerHTML = '';

        this.journal.forEach(entry => {
            const article = document.createElement('article');
            article.className = 'journal-card glass';
            article.innerHTML = `
                <div class="journal-header">
                    <div>
                        <div class="journal-date">${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <h3 class="journal-title">${entry.title}</h3>
                    </div>
                </div>
                <div class="journal-body">${entry.content}</div>
                <div class="journal-footer">
                    <button class="btn-icon" onclick="app.editJournalAction(${entry.id})"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon" onclick="app.deleteJournal(${entry.id})"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            list.appendChild(article);
        });
        lucide.createIcons();
    }

}

const app = new AlphaTrack();
window.app = app; // Make it globally accessible for inline onclicks

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
