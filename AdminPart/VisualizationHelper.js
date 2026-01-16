// AdminPart/VisualizationHelper.js
const VisualizationHelper = {
    colors: {
        primary: '#9c27b0',
        secondary: '#2196f3',
        success: '#4caf50',
        warning: '#ff9800',
        danger: '#f44336',
        info: '#00bcd4',
        purple: ['#9c27b0', '#7b1fa2', '#6a1b9a', '#4a148c'],
        blue: ['#2196f3', '#1976d2', '#1565c0', '#0d47a1'],
        green: ['#4caf50', '#388e3c', '#2e7d32', '#1b5e20'],
        orange: ['#ff9800', '#f57c00', '#ef6c00', '#e65100']
    },

    // Create a beautiful chart
    createChart: function(canvasId, config) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        const defaultConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            family: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif"
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 6
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            elements: {
                line: {
                    tension: 0.3
                }
            }
        };

        return new Chart(ctx, {
            ...defaultConfig,
            ...config
        });
    },

    // Create gradient fill
    createGradient: function(ctx, color1, color2) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    },

    // Format numbers with commas
    formatNumber: function(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    // Create doughnut chart
    createDoughnutChart: function(canvasId, labels, data, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        const gradient = this.createGradient(ctx, 'rgba(156, 39, 176, 0.8)', 'rgba(156, 39, 176, 0.2)');
        
        return this.createChart(canvasId, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#9c27b0', '#2196f3', '#4caf50', '#ff9800',
                        '#e91e63', '#00bcd4', '#ff5722', '#795548'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                cutout: '65%',
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value, ctx) => {
                            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value * 100) / sum);
                            return percentage + '%';
                        }
                    }
                }
            }
        });
    },

    // Create bar chart
    createBarChart: function(canvasId, labels, datasets, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        
        const gradientDatasets = datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: this.createGradient(ctx, 
                dataset.backgroundColor || this.colors.primary, 
                dataset.backgroundColor + '33' || this.colors.primary + '33'
            ),
            borderColor: dataset.borderColor || dataset.backgroundColor || this.colors.primary,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
        }));
        
        return this.createChart(canvasId, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: gradientDatasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return VisualizationHelper.formatNumber(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    },

    // Create line chart
    createLineChart: function(canvasId, labels, datasets, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        return this.createChart(canvasId, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map((dataset, index) => ({
                    ...dataset,
                    borderWidth: 3,
                    tension: 0.2,
                    fill: dataset.fill || false,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: dataset.borderColor,
                    pointBorderWidth: 2
                }))
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                }
            }
        });
    },

    // Create radar chart
    createRadarChart: function(canvasId, labels, data, title) {
        return this.createChart(canvasId, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Performance',
                    data: data,
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    borderColor: '#9c27b0',
                    borderWidth: 2,
                    pointBackgroundColor: '#9c27b0',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    },

    // Create heatmap
    createHeatmap: function(canvasId, data, xLabels, yLabels, title) {
        // This is a simplified heatmap using bar chart
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        const heatmapColors = [
            'rgba(33, 150, 243, 0.2)', 'rgba(33, 150, 243, 0.4)', 
            'rgba(33, 150, 243, 0.6)', 'rgba(33, 150, 243, 0.8)', 
            'rgba(33, 150, 243, 1)'
        ];
        
        const datasets = data.map((row, rowIndex) => ({
            label: yLabels[rowIndex],
            data: row,
            backgroundColor: row.map(value => {
                const max = Math.max(...data.flat());
                const intensity = Math.min(value / max, 1);
                const colorIndex = Math.floor(intensity * (heatmapColors.length - 1));
                return heatmapColors[colorIndex];
            })
        }));
        
        return this.createBarChart(canvasId, xLabels, datasets, title);
    },

    // Load data from TTMS API
    fetchTTMSData: async function(entity, params = {}) {
        try {
            const baseUrl = 'http://web.fc.utm.my/ttms/web_man_webservice_json.cgi';
            const queryParams = new URLSearchParams({
                entity: entity,
                ...params
            }).toString();
            
            const response = await fetch(`${baseUrl}?${queryParams}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Error fetching ${entity}:`, error);
            return [];
        }
    }
};