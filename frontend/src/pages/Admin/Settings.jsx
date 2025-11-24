import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../services/adminService';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('✅ Settings saved!');
    } catch (error) {
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!settings) return <div className="error">Settings not found</div>;

  return (
    <div className="settings">
      <h1>⚙️ Settings</h1>

      <div className="settings-group">
        <h2>Site Info</h2>
        <input
          type="text"
          placeholder="Site Name"
          value={settings.siteName || ''}
          onChange={(e) =>
            setSettings({ ...settings, siteName: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Description"
          value={settings.siteDescription || ''}
          onChange={(e) =>
            setSettings({ ...settings, siteDescription: e.target.value })
          }
        />
      </div>

      <div className="settings-group">
        <h2>🎨 Theme Colors</h2>
        <div className="color-grid">
          <div className="color-input">
            <label>Primary</label>
            <input
              type="color"
              value={settings.theme?.primaryColor || '#1a73e8'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    primaryColor: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="color-input">
            <label>Secondary</label>
            <input
              type="color"
              value={settings.theme?.secondaryColor || '#34a853'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    secondaryColor: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="color-input">
            <label>Accent</label>
            <input
              type="color"
              value={settings.theme?.accentColor || '#fbbc04'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    accentColor: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-save">
        {saving ? '💾 Saving...' : '✅ Save Settings'}
      </button>
    </div>
  );
}
