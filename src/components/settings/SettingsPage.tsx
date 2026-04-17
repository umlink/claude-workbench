import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { useSettingsStore } from "../../state/settingsStore";
import { useTheme, type Theme } from "../../providers/ThemeProvider";
import type { AppSettings } from "../../lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

interface SettingsPageProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPage({ open, onClose }: SettingsPageProps) {
  const { settings, loadSettings, updateSettings } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<AppSettings>(settings);

  useEffect(() => {
    if (open) loadSettings();
  }, [open, loadSettings]);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(form);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent side="left">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            Settings
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General</div>
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={theme}
              onValueChange={(value: Theme) => setTheme(value)}
            >
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4">Terminal</div>
          <div className="grid gap-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Input
              id="font-family"
              type="text"
              value={form.terminal_font_family}
              onChange={(e) => setForm({ ...form, terminal_font_family: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Input
                id="font-size"
                type="number"
                value={form.terminal_font_size}
                onChange={(e) => setForm({ ...form, terminal_font_size: parseInt(e.target.value) || 14 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scrollback">Scrollback Lines</Label>
              <Input
                id="scrollback"
                type="number"
                value={form.terminal_scrollback}
                onChange={(e) => setForm({ ...form, terminal_scrollback: parseInt(e.target.value) || 10000 })}
              />
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4">Data</div>
          <div className="grid gap-2">
            <Label htmlFor="data-retention">Data Retention (days)</Label>
            <Input
              id="data-retention"
              type="number"
              value={form.data_retention_days}
              onChange={(e) => setForm({ ...form, data_retention_days: parseInt(e.target.value) || 90 })}
            />
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DrawerClose>
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
