(function() {
    'use strict';

    const HostMetricsEnhancer = {
        isProcessing: false,
        isInjected: false,

        init() {
            if (!this.isHostViewPage()) {
                return;
            }

            this.isInjected = false;
            this.isProcessing = false;
            this.waitForTable();
        },

        isHostViewPage() {
            const url = window.location.href;
            return url.includes('action=host.view') ||
                   document.querySelector('form[name="host_view"]') !== null;
        },

        waitForTable() {
            const checkTable = () => {
                const table = document.querySelector('form[name="host_view"] table.list-table');
                if (table && table.querySelector('tbody tr')) {
                    this.injectMetrics();
                } else {
                    setTimeout(checkTable, 100);
                }
            };
            checkTable();
        },

        async injectMetrics() {
            const table = document.querySelector('form[name="host_view"] table.list-table');
            if (!table || this.isProcessing) return;

            this.isProcessing = true;

            try {
                const existingHeader = table.querySelector('thead th.host-metrics-col');

                if (existingHeader) {
                    this.isInjected = true;
                    this.isProcessing = false;
                    return;
                }

                this.injectHeaders(table);
                await this.fetchAndInjectMetrics(table);
                this.isInjected = true;
            } catch (error) {
                console.error('[HostMetrics] Error:', error);
            } finally {
                this.isProcessing = false;
            }
        },

        injectHeaders(table) {
            const headerRow = table.querySelector('thead tr');
            if (!headerRow) return;

            const headers = Array.from(headerRow.querySelectorAll('th'));
            const tagsIndex = headers.findIndex(th => th.textContent.trim() === 'Tags');

            if (tagsIndex === -1) return;

            const cpuUtilHeader = document.createElement('th');
            cpuUtilHeader.textContent = 'CPU Util %';
            cpuUtilHeader.className = 'host-metrics-col';

            const cpuCoresHeader = document.createElement('th');
            cpuCoresHeader.textContent = 'CPU Cores';
            cpuCoresHeader.className = 'host-metrics-col';

            const memoryUtilHeader = document.createElement('th');
            memoryUtilHeader.textContent = 'Memory Util %';
            memoryUtilHeader.className = 'host-metrics-col';

            const memoryAvailHeader = document.createElement('th');
            memoryAvailHeader.textContent = 'Memory Available';
            memoryAvailHeader.className = 'host-metrics-col';

            const memoryTotalHeader = document.createElement('th');
            memoryTotalHeader.textContent = 'Memory Total';
            memoryTotalHeader.className = 'host-metrics-col';

            const diskHeader = document.createElement('th');
            diskHeader.textContent = 'Disk Used %';
            diskHeader.className = 'host-metrics-col';

            const tagsHeader = headers[tagsIndex];
            tagsHeader.parentNode.insertBefore(diskHeader, tagsHeader);
            tagsHeader.parentNode.insertBefore(memoryTotalHeader, diskHeader);
            tagsHeader.parentNode.insertBefore(memoryAvailHeader, memoryTotalHeader);
            tagsHeader.parentNode.insertBefore(memoryUtilHeader, memoryAvailHeader);
            tagsHeader.parentNode.insertBefore(cpuCoresHeader, memoryUtilHeader);
            tagsHeader.parentNode.insertBefore(cpuUtilHeader, cpuCoresHeader);
        },

        async fetchAndInjectMetrics(table) {
            const rows = table.querySelectorAll('tbody tr');
            const hostIds = [];

            rows.forEach(row => {
                const hostLink = row.querySelector('a[data-menu-popup]');
                if (hostLink) {
                    try {
                        const menuPopup = JSON.parse(hostLink.getAttribute('data-menu-popup'));
                        if (menuPopup.data && menuPopup.data.hostid) {
                            hostIds.push({
                                hostid: menuPopup.data.hostid,
                                row: row
                            });
                        }
                    } catch (e) {
                        console.warn('[HostMetrics] Could not parse hostid:', e);
                    }
                }
            });

            if (hostIds.length === 0) return;

            const metrics = await this.fetchMetricsFromAPI(hostIds.map(h => h.hostid));

            hostIds.forEach(({hostid, row}) => {
                const hostMetrics = metrics[hostid] || {};
                this.injectMetricsIntoRow(row, hostMetrics);
            });
        },

        async fetchMetricsFromAPI(hostids) {
            try {
                const formData = new URLSearchParams();
                hostids.forEach((id, index) => {
                    formData.append(`hostids[${index}]`, id);
                });

                const response = await fetch('zabbix.php?action=hostmetrics.data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString()
                });

                const text = await response.text();

                if (!text || text.trim() === '') {
                    return {};
                }

                const data = JSON.parse(text);

                if (data && data.metrics) {
                    return data.metrics;
                }
            } catch (error) {
                console.error('[HostMetrics] API error:', error);
            }

            return {};
        },

        injectMetricsIntoRow(row, metrics) {
            if (row.querySelector('.host-metrics-cell')) {
                return;
            }

            const cells = Array.from(row.querySelectorAll('td'));
            let tagsIndex = -1;

            cells.forEach((cell, index) => {
                if (cell.querySelector('.tag-list, [class*="tag"]') ||
                    cell.textContent.trim() === 'No tags') {
                    tagsIndex = index;
                }
            });

            if (tagsIndex === -1) {
                tagsIndex = cells.length - 6;
            }

            const cpuUtilCell = this.createMetricCell(metrics.cpu_util, true);
            const cpuCoresCell = this.createMetricCell(metrics.cpu_cores, false);
            const memoryUtilCell = this.createMetricCell(metrics.memory_util, true);
            const memoryAvailCell = this.createMemorySizeCell(metrics.memory_available);
            const memoryTotalCell = this.createMemorySizeCell(metrics.memory_total);
            const diskCell = this.createMetricCell(metrics.disk, true);

            const tagsCell = cells[tagsIndex];
            if (tagsCell) {
                tagsCell.parentNode.insertBefore(diskCell, tagsCell);
                tagsCell.parentNode.insertBefore(memoryTotalCell, diskCell);
                tagsCell.parentNode.insertBefore(memoryAvailCell, memoryTotalCell);
                tagsCell.parentNode.insertBefore(memoryUtilCell, memoryAvailCell);
                tagsCell.parentNode.insertBefore(cpuCoresCell, memoryUtilCell);
                tagsCell.parentNode.insertBefore(cpuUtilCell, cpuCoresCell);
            }
        },

        createMetricCell(value, isPercentage = true) {
            const td = document.createElement('td');
            td.className = 'host-metrics-cell';

            if (value !== undefined && value !== null) {
                const span = document.createElement('span');

                if (isPercentage) {
                    span.textContent = value + '%';
                    span.className = 'host-metric-value';

                    if (value > 80) {
                        span.classList.add('metric-critical');
                    } else if (value > 60) {
                        span.classList.add('metric-warning');
                    } else {
                        span.classList.add('metric-ok');
                    }
                } else {
                    span.textContent = value;
                    span.className = 'host-metric-value';
                }

                td.appendChild(span);
            } else {
                td.textContent = '—';
                td.style.color = '#999';
            }

            return td;
        },

        createMemorySizeCell(value) {
            const td = document.createElement('td');
            td.className = 'host-metrics-cell';

            if (value !== undefined && value !== null && value !== '') {
                const span = document.createElement('span');
                span.textContent = value;
                span.className = 'host-metric-value';
                td.appendChild(span);
            } else {
                td.textContent = '—';
                td.style.color = '#999';
            }

            return td;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HostMetricsEnhancer.init());
    } else {
        HostMetricsEnhancer.init();
    }

    (function() {
        const originalReplaceWith = $.fn.replaceWith;

        $.fn.replaceWith = function() {
            const isHostViewForm = this.is('form[name="host_view"]');
            const result = originalReplaceWith.apply(this, arguments);

            if (isHostViewForm) {
                setTimeout(() => {
                    HostMetricsEnhancer.init();
                }, 300);
            }

            return result;
        };
    })();

})();
