# Zabbix Host Metrics Enhancer

A Zabbix module that enhances the native host.view page by adding real-time CPU, Memory, and Disk metrics directly into the host list table.

## Features

- **CPU Metrics**: Utilization percentage and number of cores
- **Memory Metrics**: Utilization percentage, available memory, and total memory
- **Disk Metrics**: Disk usage percentage
- **Color-coded values**: Green (OK), Orange (Warning), Red (Critical)
- **Theme support**: Compatible with Blue and Dark themes
- **Auto-refresh**: Metrics persist after page auto-refresh
- **Non-invasive**: Implemented as a module, no core file modifications required

## Requirements

- Zabbix 6.0 or higher
- Hosts must have the following items configured:
  - `system.cpu.util` - CPU utilization
  - `system.cpu.num` - CPU cores
  - `vm.memory.utilization` or `vm.memory.size[pavailable]` - Memory utilization
  - `vm.memory.size[available]` - Available memory
  - `vm.memory.size[total]` - Total memory
  - `vfs.fs.size[/,pused]` - Disk usage percentage

## Installation

### 1. Download or Clone the Module

```bash
cd /usr/share/zabbix/modules
git clone <repository-url> HostMetrics
```

Or manually create the directory structure:

```
/usr/share/zabbix/modules/HostMetrics/
├── manifest.json
├── Module.php
├── actions/
│   └── CControllerHostMetricsData.php
└── assets/
    ├── css/
    │   └── host-metrics.css
    └── js/
        └── host-metrics.js
```

### 2. Set Correct Permissions

```bash
chown -R www-data:www-data /usr/share/zabbix/modules/HostMetrics
chmod -R 755 /usr/share/zabbix/modules/HostMetrics
```

> **Note**: Replace `www-data` with your web server user (e.g., `apache`, `nginx`, `zabbix`)

### 3. Enable the Module in Zabbix

1. Log in to Zabbix as an administrator
2. Navigate to **Administration → General → Modules**
3. Click **Scan directory**
4. Find **Host Metrics Enhancer** in the list
5. Click **Enable**

### 4. Clear Browser Cache

Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac) to clear cache and reload the page.

## Usage

1. Navigate to **Monitoring → Hosts**
2. The following columns will be automatically added before the "Tags" column:
   - CPU Util %
   - CPU Cores
   - Memory Util %
   - Memory Available
   - Memory Total
   - Disk Used %

## Metric Color Coding

- **Green**: Value ≤ 60% (OK)
- **Orange**: Value > 60% and ≤ 80% (Warning)
- **Red**: Value > 80% (Critical)

## Troubleshooting

### Metrics not showing

1. Check if the module is enabled in **Administration → General → Modules**
2. Verify that your hosts have the required items configured
3. Open browser console (F12) and check for errors
4. Ensure items are monitored and have recent data

### Columns disappear after refresh

This should not happen with the latest version. If it does:
1. Clear browser cache completely
2. Disable and re-enable the module
3. Check browser console for JavaScript errors

### Permission issues

```bash
# Fix ownership
chown -R www-data:www-data /usr/share/zabbix/modules/HostMetrics

# Fix permissions
chmod -R 755 /usr/share/zabbix/modules/HostMetrics
```

## Uninstallation

1. Go to **Administration → General → Modules**
2. Find **Host Metrics Enhancer**
3. Click **Disable**
4. Optionally, delete the module directory:
```bash
rm -rf /usr/share/zabbix/modules/HostMetrics
```

## Technical Details

### File Structure

- **manifest.json**: Module configuration and metadata
- **Module.php**: Main module class
- **actions/CControllerHostMetricsData.php**: API controller for fetching metrics
- **assets/js/host-metrics.js**: Frontend JavaScript for DOM manipulation
- **assets/css/host-metrics.css**: Styling for metric columns

### How It Works

1. JavaScript detects when the host.view page is loaded
2. It injects new column headers into the table
3. Extracts host IDs from the table rows
4. Calls the backend API (`hostmetrics.data`) to fetch metrics
5. Injects metric values into the table with appropriate styling
6. Monitors for form replacement (refresh) and re-injects metrics

## License

This module is provided as-is without any warranty.

## Author

Monzphere

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
