<?php

namespace Modules\HostMetrics\Actions;

use CController;
use CControllerResponseData;
use API;

class CControllerHostMetricsData extends CController {

    protected function init(): void {
        $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        $fields = [
            'hostids' => 'array_id'
        ];

        $ret = $this->validateInput($fields);

        if (!$ret) {
            $this->setResponse(new CControllerResponseData(['error' => $this->getValidationError()]));
        }

        return $ret;
    }

    protected function checkPermissions(): bool {
        return true;
    }

    private function formatBytes(float $bytes): string {
        if ($bytes == 0) return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = floor(log($bytes, 1024));
        $power = min($power, count($units) - 1);

        $value = $bytes / pow(1024, $power);

        return round($value, 2) . ' ' . $units[$power];
    }

    protected function doAction(): void {
        $hostids = $this->getInput('hostids', []);

        if (empty($hostids)) {
            header('Content-Type: application/json');
            echo json_encode(['metrics' => []]);
            exit;
        }

        $metric_keys = [
            'system.cpu.util',
            'system.cpu.num',
            'vm.memory.utilization',
            'vm.memory.size[pavailable]',
            'vm.memory.size[available]',
            'vm.memory.size[total]',
            'vfs.fs.size[/,pused]'
        ];

        try {
            $items = API::Item()->get([
                'output' => ['itemid', 'hostid', 'key_', 'lastvalue', 'units'],
                'hostids' => $hostids,
                'search' => [
                    'key_' => $metric_keys
                ],
                'searchByAny' => true,
                'monitored' => true
            ]);

            $metrics = [];
            foreach ($items as $item) {
                if (!isset($metrics[$item['hostid']])) {
                    $metrics[$item['hostid']] = [];
                }

                if (strpos($item['key_'], 'cpu.util') !== false) {
                    $metrics[$item['hostid']]['cpu_util'] = round((float)$item['lastvalue'], 2);
                } elseif (strpos($item['key_'], 'cpu.num') !== false) {
                    $metrics[$item['hostid']]['cpu_cores'] = (int)$item['lastvalue'];
                } elseif (strpos($item['key_'], 'memory.utilization') !== false) {
                    $metrics[$item['hostid']]['memory_util'] = round((float)$item['lastvalue'], 2);
                } elseif (strpos($item['key_'], 'pavailable') !== false) {
                    if (!isset($metrics[$item['hostid']]['memory_util'])) {
                        $metrics[$item['hostid']]['memory_util'] = round(100 - (float)$item['lastvalue'], 2);
                    }
                } elseif (strpos($item['key_'], 'size[available]') !== false) {
                    $metrics[$item['hostid']]['memory_available'] = $this->formatBytes((float)$item['lastvalue']);
                } elseif (strpos($item['key_'], 'size[total]') !== false) {
                    $metrics[$item['hostid']]['memory_total'] = $this->formatBytes((float)$item['lastvalue']);
                } elseif (strpos($item['key_'], 'pused') !== false) {
                    $metrics[$item['hostid']]['disk'] = round((float)$item['lastvalue'], 2);
                }
            }

            header('Content-Type: application/json');
            echo json_encode(['metrics' => $metrics]);
            exit;
        } catch (\Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    }
}
