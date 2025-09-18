'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Download, FileText, FileJson, FileSpreadsheet, File } from 'lucide-react';
import { ExportFormat } from '@/types/analytics';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  data: any;
  timeRange: string;
}

export function ExportDialog({ open, onClose, data, timeRange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.CSV);
  const [selectedData, setSelectedData] = useState({
    userEngagement: true,
    systemHealth: true,
    topContent: true,
    recentErrors: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Prepare export data
      const exportData: any = {};
      if (selectedData.userEngagement) exportData.userEngagement = data.userEngagement;
      if (selectedData.systemHealth) exportData.systemHealth = data.systemHealth;
      if (selectedData.topContent) exportData.topContent = data.topContent;
      if (selectedData.recentErrors) exportData.recentErrors = data.recentErrors;

      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format,
          data: exportData,
          timeRange
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const { jobId } = await response.json();

      // Poll for export completion
      await pollExportStatus(jobId);

      toast({
        title: 'Export Successful',
        description: 'Your data has been exported successfully.'
      });

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const pollExportStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`/api/analytics/export/${jobId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check export status');
      }

      const job = await response.json();

      if (job.status === 'completed') {
        // Get download URL
        const downloadResponse = await fetch(`/api/analytics/export/${jobId}/download`, {
          credentials: 'include'
        });

        if (!downloadResponse.ok) {
          throw new Error('Failed to get download URL');
        }

        const { url } = await downloadResponse.json();

        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return;
      } else if (job.status === 'failed') {
        throw new Error(job.error || 'Export failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Export timeout');
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case ExportFormat.CSV:
        return FileText;
      case ExportFormat.JSON:
        return FileJson;
      case ExportFormat.EXCEL:
        return FileSpreadsheet;
      case ExportFormat.PDF:
        return File;
      default:
        return FileText;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Analytics Data</DialogTitle>
          <DialogDescription>
            Choose the format and data to export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(ExportFormat).map((fmt) => {
                  const Icon = getFormatIcon(fmt);
                  return (
                    <label
                      key={fmt}
                      className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <RadioGroupItem value={fmt} />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{fmt.toUpperCase()}</span>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Data Selection */}
          <div className="space-y-3">
            <Label>Select Data to Export</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedData.userEngagement}
                  onCheckedChange={(checked) =>
                    setSelectedData({ ...selectedData, userEngagement: !!checked })
                  }
                />
                <span className="text-sm">User Engagement Metrics</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedData.systemHealth}
                  onCheckedChange={(checked) =>
                    setSelectedData({ ...selectedData, systemHealth: !!checked })
                  }
                />
                <span className="text-sm">System Health Metrics</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedData.topContent}
                  onCheckedChange={(checked) =>
                    setSelectedData({ ...selectedData, topContent: !!checked })
                  }
                />
                <span className="text-sm">Top Content Analytics</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedData.recentErrors}
                  onCheckedChange={(checked) =>
                    setSelectedData({ ...selectedData, recentErrors: !!checked })
                  }
                />
                <span className="text-sm">Recent Errors</span>
              </label>
            </div>
          </div>

          {/* Time Range Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              Time Range: <span className="font-medium">{timeRange}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}