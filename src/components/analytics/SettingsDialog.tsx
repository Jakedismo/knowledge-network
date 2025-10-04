'use client';

import React from 'react';
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
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: {
    autoRefreshInterval: number;
  };
  onSettingsChange: (newSettings: { autoRefreshInterval: number }) => void;
}

export function SettingsDialog({ open, onClose, settings, onSettingsChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = React.useState(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    toast({
      title: 'Settings Saved',
      description: 'Your analytics dashboard settings have been updated.',
    });
    onClose();
  };

  const handleIntervalChange = (value: number[]) => {
    setLocalSettings({ ...localSettings, autoRefreshInterval: value[0] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            Configure your analytics dashboard preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="refresh-interval">Auto-Refresh Interval (seconds)</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="refresh-interval"
                min={10}
                max={120}
                step={5}
                value={[localSettings.autoRefreshInterval]}
                onValueChange={handleIntervalChange}
              />
              <span className="font-mono text-sm w-12 text-center">
                {localSettings.autoRefreshInterval}s
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              How often the dashboard should automatically refresh.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}