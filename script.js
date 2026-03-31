class JobApplicationTracker {
    constructor() {
        this.applications = [];
        this.currentEditId = null;
        this.filteredApplications = [];
        this.charts = {};
        this.currentView = 'overview';
        this.isDarkMode = false;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
        this.updateStats();
    }

    setupEventListeners() {
        // Modal controls
        const modal = document.getElementById('jobModal');
        const addBtn = document.getElementById('addJobBtn');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('jobForm');

        addBtn.addEventListener('click', () => this.openModal());
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveApplication();
        });

        // Dashboard toggle
        const dashboardToggle = document.getElementById('dashboardToggle');
        dashboardToggle.addEventListener('click', () => {
            const dashboardSection = document.getElementById('dashboardSection');
            dashboardSection.style.display = dashboardSection.style.display === 'none' ? 'block' : 'none';
            if (dashboardSection.style.display === 'block') {
                this.updateDashboard();
            }
        });

        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.exportData();
        });

        // Filter controls
        const filterBtn = document.getElementById('filterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        const companyFilter = document.getElementById('companyFilter');
        const roleFilter = document.getElementById('roleFilter');
        const statusFilter = document.getElementById('statusFilter');
        const searchInput = document.getElementById('searchInput');

        filterBtn.addEventListener('click', () => {
            const filterSection = document.getElementById('filterSection');
            filterSection.style.display = filterSection.style.display === 'none' ? 'block' : 'none';
        });

        clearFilterBtn.addEventListener('click', () => {
            companyFilter.value = '';
            roleFilter.value = '';
            statusFilter.value = '';
            searchInput.value = '';
            this.applyFilters();
        });

        companyFilter.addEventListener('input', () => this.applyFilters());
        roleFilter.addEventListener('input', () => this.applyFilters());
        statusFilter.addEventListener('change', () => this.applyFilters());
        
        // Search with autocomplete
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Set today's date as default for applied date
        document.getElementById('appliedDate').valueAsDate = new Date();

        // Load dark mode preference
        this.loadDarkModePreference();
    }

    openModal(applicationId = null) {
        const modal = document.getElementById('jobModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('jobForm');

        if (applicationId) {
            const app = this.applications.find(a => a.id === applicationId);
            if (app) {
                modalTitle.textContent = 'Edit Job Application';
                this.currentEditId = applicationId;
                this.populateForm(app);
            }
        } else {
            modalTitle.textContent = 'Add Job Application';
            this.currentEditId = null;
            form.reset();
            document.getElementById('appliedDate').valueAsDate = new Date();
        }

        modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('jobModal');
        modal.style.display = 'none';
        document.getElementById('jobForm').reset();
        this.currentEditId = null;
    }

    populateForm(application) {
        document.getElementById('company').value = application.company;
        document.getElementById('role').value = application.role;
        document.getElementById('location').value = application.location || '';
        document.getElementById('salary').value = application.salary || '';
        document.getElementById('appliedDate').value = application.appliedDate || '';
        document.getElementById('interviewDate').value = application.interviewDate || '';
        document.getElementById('notes').value = application.notes || '';
        document.getElementById('status').value = application.status;
    }

    saveApplication() {
        const formData = {
            company: document.getElementById('company').value,
            role: document.getElementById('role').value,
            location: document.getElementById('location').value,
            salary: document.getElementById('salary').value,
            appliedDate: document.getElementById('appliedDate').value,
            interviewDate: document.getElementById('interviewDate').value,
            notes: document.getElementById('notes').value,
            status: document.getElementById('status').value
        };

        if (this.currentEditId) {
            // Update existing application
            const index = this.applications.findIndex(a => a.id === this.currentEditId);
            if (index !== -1) {
                this.applications[index] = { ...this.applications[index], ...formData };
            }
        } else {
            // Add new application
            const newApplication = {
                id: Date.now().toString(),
                ...formData,
                createdAt: new Date().toISOString()
            };
            this.applications.push(newApplication);
        }

        this.saveToStorage();
        this.applyFilters();
        this.updateStats();
        this.closeModal();
    }

    deleteApplication(applicationId) {
        if (confirm('Are you sure you want to delete this application?')) {
            this.applications = this.applications.filter(a => a.id !== applicationId);
            this.saveToStorage();
            this.applyFilters();
            this.updateStats();
        }
    }

    applyFilters() {
        const companyFilter = document.getElementById('companyFilter').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const searchInput = document.getElementById('searchInput').value.toLowerCase();

        this.filteredApplications = this.applications.filter(app => {
            const matchesCompany = !companyFilter || app.company.toLowerCase().includes(companyFilter);
            const matchesRole = !roleFilter || app.role.toLowerCase().includes(roleFilter);
            const matchesStatus = !statusFilter || app.status === statusFilter;
            const matchesSearch = !searchInput || 
                app.company.toLowerCase().includes(searchInput) ||
                app.role.toLowerCase().includes(searchInput) ||
                (app.location && app.location.toLowerCase().includes(searchInput)) ||
                (app.notes && app.notes.toLowerCase().includes(searchInput));
            
            return matchesCompany && matchesRole && matchesStatus && matchesSearch;
        });

        this.render();
    }

    render() {
        const columns = ['applied', 'interview', 'offer', 'rejected'];
        
        columns.forEach(status => {
            const container = document.getElementById(`${status}-cards`);
            container.innerHTML = '';
            
            const statusApplications = this.filteredApplications.filter(app => app.status === status);
            
            statusApplications.forEach(app => {
                const card = this.createJobCard(app);
                container.appendChild(card);
            });

            // Update column counts
            const countElement = document.querySelector(`[data-status="${status}"] .column-count`);
            if (countElement) {
                countElement.textContent = statusApplications.length;
            }
        });

        this.setupDragAndDrop();
    }

    createJobCard(application) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.draggable = true;
        card.dataset.id = application.id;
        card.dataset.status = application.status;

        const appliedDate = application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : '';
        const interviewDate = application.interviewDate ? new Date(application.interviewDate).toLocaleDateString() : '';

        card.innerHTML = `
            <div class="job-card-header">
                <div>
                    <div class="job-company">${application.company}</div>
                    <div class="job-role">${application.role}</div>
                </div>
            </div>
            ${application.location ? `<div class="job-location">📍 ${application.location}</div>` : ''}
            ${application.salary ? `<div class="job-salary">💰 ${application.salary}</div>` : ''}
            <div class="job-dates">
                ${appliedDate ? `<div class="job-date">📅 Applied: ${appliedDate}</div>` : ''}
                ${interviewDate ? `<div class="job-date">🎯 Interview: ${interviewDate}</div>` : ''}
            </div>
            ${application.notes ? `<div class="job-notes">${application.notes}</div>` : ''}
            <div class="job-actions">
                <button class="btn btn-secondary" onclick="tracker.openModal('${application.id}')">Edit</button>
                <button class="btn btn-danger" onclick="tracker.deleteApplication('${application.id}')">Delete</button>
            </div>
        `;

        return card;
    }

    setupDragAndDrop() {
        const cards = document.querySelectorAll('.job-card');
        const columns = document.querySelectorAll('.column-cards');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
                e.target.classList.add('dragging');
            });

            card.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                if (e.target === column) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const draggedCard = document.querySelector('.dragging');
                if (draggedCard) {
                    const newStatus = column.id.replace('-cards', '');
                    const applicationId = draggedCard.dataset.id;
                    
                    // Update application status
                    const app = this.applications.find(a => a.id === applicationId);
                    if (app) {
                        app.status = newStatus;
                        this.saveToStorage();
                        this.applyFilters();
                        this.updateStats();
                    }
                }
            });
        });
    }

    updateStats() {
        const total = this.applications.length;
        const applied = this.applications.filter(a => a.status === 'applied').length;
        const interviews = this.applications.filter(a => a.status === 'interview').length;
        const offers = this.applications.filter(a => a.status === 'offer').length;
        
        const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
        const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0;

        document.getElementById('totalApps').textContent = total;
        document.getElementById('interviewRate').textContent = `${interviewRate}%`;
        document.getElementById('offerCount').textContent = offers;
        document.getElementById('appliedCount').textContent = applied;
    }

    saveToStorage() {
        localStorage.setItem('jobApplications', JSON.stringify(this.applications));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('jobApplications');
        if (stored) {
            this.applications = JSON.parse(stored);
        } else {
            // Add sample data for demonstration
            this.applications = [
                {
                    id: '1',
                    company: 'Tech Corp',
                    role: 'Frontend Developer',
                    location: 'San Francisco, CA',
                    salary: '$120k - $150k',
                    appliedDate: '2024-01-15',
                    interviewDate: '2024-01-22',
                    notes: 'Great team culture, modern tech stack',
                    status: 'interview',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    company: 'StartupXYZ',
                    role: 'Full Stack Engineer',
                    location: 'Remote',
                    salary: '$100k - $130k',
                    appliedDate: '2024-01-10',
                    notes: 'Fast-paced environment, learning opportunities',
                    status: 'applied',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    company: 'Enterprise Inc',
                    role: 'Senior Developer',
                    location: 'New York, NY',
                    salary: '$140k - $180k',
                    appliedDate: '2024-01-05',
                    interviewDate: '2024-01-12',
                    notes: 'Stable company, good benefits',
                    status: 'offer',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '4',
                    company: 'Digital Agency',
                    role: 'UI/UX Designer',
                    location: 'Los Angeles, CA',
                    salary: '$90k - $120k',
                    appliedDate: '2024-01-20',
                    interviewDate: '2024-01-25',
                    notes: 'Creative projects, design-focused team',
                    status: 'interview',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '5',
                    company: 'FinTech Startup',
                    role: 'Backend Developer',
                    location: 'Remote',
                    salary: '$110k - $140k',
                    appliedDate: '2024-01-08',
                    notes: 'Financial technology, challenging problems',
                    status: 'rejected',
                    createdAt: new Date().toISOString()
                }
            ];
        }
        
        this.filteredApplications = [...this.applications];
    }

    // Dashboard Methods
    updateDashboard() {
        this.updateEnhancedStats();
        this.createCharts();
        this.updateInsights();
        this.updateTimeline();
        this.updateAnalytics();
    }

    updateEnhancedStats() {
        const total = this.applications.length;
        const applied = this.applications.filter(a => a.status === 'applied').length;
        const interviews = this.applications.filter(a => a.status === 'interview').length;
        const offers = this.applications.filter(a => a.status === 'offer').length;
        const rejected = this.applications.filter(a => a.status === 'rejected').length;
        
        const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
        const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0;

        // Calculate weekly changes
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyApps = this.applications.filter(a => new Date(a.createdAt) > weekAgo).length;
        const weeklyInterviews = this.applications.filter(a => 
            a.interviewDate && new Date(a.interviewDate) > weekAgo
        ).length;
        const weeklyOffers = this.applications.filter(a => 
            a.status === 'offer' && new Date(a.createdAt) > weekAgo
        ).length;

        // Update dashboard stats
        document.getElementById('totalApps').textContent = total;
        document.getElementById('interviewRate').textContent = `${interviewRate}%`;
        document.getElementById('offerCount').textContent = offers;
        document.getElementById('appliedCount').textContent = applied;

        // Update weekly changes
        document.getElementById('totalChange').textContent = `+${weeklyApps} this week`;
        document.getElementById('interviewChange').textContent = `+${weeklyInterviews} this week`;
        document.getElementById('offerChange').textContent = `+${weeklyOffers} this week`;
        document.getElementById('appliedChange').textContent = `+${weeklyApps} this week`;
    }

    createCharts() {
        this.createStatusChart();
        this.createTimelineChart();
        this.createCompanyChart();
        this.createRoleChart();
        this.createMonthlyChart();
    }

    createStatusChart() {
        const ctx = document.getElementById('statusChart').getContext('2d');
        
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusCounts = {
            applied: this.applications.filter(a => a.status === 'applied').length,
            interview: this.applications.filter(a => a.status === 'interview').length,
            offer: this.applications.filter(a => a.status === 'offer').length,
            rejected: this.applications.filter(a => a.status === 'rejected').length
        };

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Applied', 'Interview', 'Offer', 'Rejected'],
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#4299e1',
                        '#f6ad55',
                        '#48bb78',
                        '#f56565'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createTimelineChart() {
        const ctx = document.getElementById('timelineChart').getContext('2d');
        
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Group applications by week
        const weeklyData = this.groupByWeek(this.applications);
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyData.labels,
                datasets: [{
                    label: 'Applications',
                    data: weeklyData.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createCompanyChart() {
        const ctx = document.getElementById('companyChart').getContext('2d');
        
        if (this.charts.company) {
            this.charts.company.destroy();
        }

        const companyCounts = this.getCompanyCounts();
        
        this.charts.company = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: companyCounts.labels,
                datasets: [{
                    label: 'Applications per Company',
                    data: companyCounts.data,
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createRoleChart() {
        const ctx = document.getElementById('roleChart').getContext('2d');
        
        if (this.charts.role) {
            this.charts.role.destroy();
        }

        const roleCounts = this.getRoleCounts();
        
        this.charts.role = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: roleCounts.labels,
                datasets: [{
                    data: roleCounts.data,
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f6ad55',
                        '#48bb78',
                        '#f56565',
                        '#4299e1'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        const monthlyData = this.getMonthlyData();
        
        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Applied',
                        data: monthlyData.applied,
                        backgroundColor: '#4299e1'
                    },
                    {
                        label: 'Interview',
                        data: monthlyData.interview,
                        backgroundColor: '#f6ad55'
                    },
                    {
                        label: 'Offer',
                        data: monthlyData.offer,
                        backgroundColor: '#48bb78'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateInsights() {
        this.updateTopCompanies();
        this.updatePopularRoles();
        this.updateSuccessMetrics();
    }

    updateTopCompanies() {
        const companies = this.getCompanyCounts();
        const topCompanies = companies.labels.slice(0, 5);
        const container = document.getElementById('topCompanies');
        
        container.innerHTML = topCompanies.map((company, index) => `
            <div class="insight-item">
                <span class="insight-rank">#${index + 1}</span>
                <span class="insight-label">${company}</span>
                <span class="insight-value">${companies.data[index]} apps</span>
            </div>
        `).join('');
    }

    updatePopularRoles() {
        const roles = this.getRoleCounts();
        const topRoles = roles.labels.slice(0, 5);
        const container = document.getElementById('popularRoles');
        
        container.innerHTML = topRoles.map((role, index) => `
            <div class="insight-item">
                <span class="insight-rank">#${index + 1}</span>
                <span class="insight-label">${role}</span>
                <span class="insight-value">${roles.data[index]} apps</span>
            </div>
        `).join('');
    }

    updateSuccessMetrics() {
        const total = this.applications.length;
        const offers = this.applications.filter(a => a.status === 'offer').length;
        const interviews = this.applications.filter(a => a.status === 'interview').length;
        
        const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0;
        const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
        const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;
        
        const container = document.getElementById('successMetrics');
        container.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${offerRate}%</div>
                <div class="metric-label">Offer Rate</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${interviewRate}%</div>
                <div class="metric-label">Interview Rate</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${responseRate}%</div>
                <div class="metric-label">Response Rate</div>
            </div>
        `;
    }

    updateTimeline() {
        const container = document.getElementById('timelineContent');
        const sortedApps = [...this.applications].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 10);
        
        container.innerHTML = sortedApps.map((app, index) => `
            <div class="timeline-item">
                <div class="timeline-marker">${index + 1}</div>
                <div class="timeline-content">
                    <div class="timeline-date">${new Date(app.createdAt).toLocaleDateString()}</div>
                    <div class="timeline-title">${app.company} - ${app.role}</div>
                    <div class="timeline-description">Status: ${app.status}</div>
                </div>
            </div>
        `).join('');
    }

    updateAnalytics() {
        const container = document.getElementById('responseMetrics');
        const avgResponseTime = this.calculateAverageResponseTime();
        const statusDistribution = this.getStatusDistribution();
        
        container.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${avgResponseTime} days</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${statusDistribution.highest}</div>
                <div class="metric-label">Most Common Status</div>
            </div>
        `;
    }

    // Helper Methods
    groupByWeek(applications) {
        const weeks = {};
        const now = new Date();
        
        applications.forEach(app => {
            const appDate = new Date(app.createdAt);
            const weekNum = Math.floor((now - appDate) / (7 * 24 * 60 * 60 * 1000));
            
            if (!weeks[weekNum]) {
                weeks[weekNum] = 0;
            }
            weeks[weekNum]++;
        });
        
        const labels = [];
        const data = [];
        
        for (let i = 3; i >= 0; i--) {
            labels.push(`Week ${4 - i}`);
            data.push(weeks[i] || 0);
        }
        
        return { labels, data };
    }

    getCompanyCounts() {
        const counts = {};
        this.applications.forEach(app => {
            counts[app.company] = (counts[app.company] || 0) + 1;
        });
        
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(([company]) => company),
            data: sorted.map(([, count]) => count)
        };
    }

    getRoleCounts() {
        const counts = {};
        this.applications.forEach(app => {
            counts[app.role] = (counts[app.role] || 0) + 1;
        });
        
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(([role]) => role),
            data: sorted.map(([, count]) => count)
        };
    }

    getMonthlyData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentMonth = new Date().getMonth();
        
        const monthlyStats = {
            labels: [],
            applied: [],
            interview: [],
            offer: []
        };
        
        for (let i = 2; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            monthlyStats.labels.push(months[monthIndex]);
            
            const monthApps = this.applications.filter(app => {
                const appMonth = new Date(app.createdAt).getMonth();
                return appMonth === monthIndex;
            });
            
            monthlyStats.applied.push(monthApps.filter(a => a.status === 'applied').length);
            monthlyStats.interview.push(monthApps.filter(a => a.status === 'interview').length);
            monthlyStats.offer.push(monthApps.filter(a => a.status === 'offer').length);
        }
        
        return monthlyStats;
    }

    calculateAverageResponseTime() {
        const responseTimes = [];
        
        this.applications.forEach(app => {
            if (app.interviewDate && app.appliedDate) {
                const applied = new Date(app.appliedDate);
                const interview = new Date(app.interviewDate);
                const days = Math.floor((interview - applied) / (24 * 60 * 60 * 1000));
                responseTimes.push(days);
            }
        });
        
        if (responseTimes.length === 0) return 0;
        return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    }

    getStatusDistribution() {
        const counts = {
            applied: 0,
            interview: 0,
            offer: 0,
            rejected: 0
        };
        
        this.applications.forEach(app => {
            counts[app.status]++;
        });
        
        const highest = Object.entries(counts).reduce((a, b) => 
            counts[a[0]] > counts[b[0]] ? a : b
        )[0];
        
        return { counts, highest: highest.charAt(0).toUpperCase() + highest.slice(1) };
    }

    // View Management
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide views
        document.querySelectorAll('.dashboard-view').forEach(viewEl => {
            viewEl.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        
        // Update view-specific content
        if (view === 'timeline') {
            this.updateTimeline();
        } else if (view === 'analytics') {
            this.updateAnalytics();
        }
    }

    // Dark Mode
    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        
        const darkModeToggle = document.getElementById('darkModeToggle');
        darkModeToggle.textContent = this.isDarkMode ? '☀️' : '🌙';
        
        localStorage.setItem('darkMode', this.isDarkMode);
        
        // Update chart colors for dark mode
        if (this.isDarkMode) {
            Chart.defaults.color = '#e2e8f0';
            Chart.defaults.borderColor = '#4a5568';
        } else {
            Chart.defaults.color = '#2d3748';
            Chart.defaults.borderColor = '#e2e8f0';
        }
        
        // Recreate charts with new colors
        if (document.getElementById('dashboardSection').style.display === 'block') {
            this.createCharts();
        }
    }

    loadDarkModePreference() {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        this.isDarkMode = savedDarkMode;
        
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').textContent = '☀️';
            Chart.defaults.color = '#e2e8f0';
            Chart.defaults.borderColor = '#4a5568';
        }
    }

    // Search with Autocomplete
    handleSearch(query) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        const suggestions = this.getSearchSuggestions(query);
        
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion => `
                <div class="search-suggestion" onclick="tracker.selectSuggestion('${suggestion.text}')">
                    <strong>${suggestion.highlight}</strong>
                    <small>${suggestion.type}</small>
                </div>
            `).join('');
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    getSearchSuggestions(query) {
        const suggestions = [];
        const lowerQuery = query.toLowerCase();
        
        this.applications.forEach(app => {
            if (app.company.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    text: app.company,
                    type: 'Company',
                    highlight: this.highlightMatch(app.company, query)
                });
            }
            
            if (app.role.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    text: app.role,
                    type: 'Role',
                    highlight: this.highlightMatch(app.role, query)
                });
            }
        });
        
        return suggestions.slice(0, 5);
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    selectSuggestion(text) {
        document.getElementById('searchInput').value = text;
        document.getElementById('searchSuggestions').style.display = 'none';
        this.applyFilters();
    }

    // Export Functionality
    exportData() {
        const data = {
            applications: this.applications,
            exportDate: new Date().toISOString(),
            stats: {
                total: this.applications.length,
                applied: this.applications.filter(a => a.status === 'applied').length,
                interview: this.applications.filter(a => a.status === 'interview').length,
                offer: this.applications.filter(a => a.status === 'offer').length,
                rejected: this.applications.filter(a => a.status === 'rejected').length
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the tracker when DOM is loaded
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new JobApplicationTracker();
});
