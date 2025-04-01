const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Config file path
const configDir = path.join(__dirname, 'config');
const configFile = path.join(configDir, 'settings.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// API Routes
app.get('/api/settings', (req, res) => {
  try {
    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      res.json({
        apiUrl: config.apiUrl,
        token: config.token ? '********' : null
      });
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Error reading settings' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { apiUrl, token } = req.body;
    
    // Load existing config if it exists
    let config = {};
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }
    
    // Update config
    config.apiUrl = apiUrl;
    if (token) {
      config.token = token;
    }
    
    // Save config
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Error saving settings' });
  }
});

app.post('/api/trigger', async (req, res) => {
  try {
    const { action } = req.body;
    console.log('Received action request:', action);
    
    // Validate action
    if (!['open', 'close', 'check'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Load config
    if (!fs.existsSync(configFile)) {
      return res.status(400).json({ error: 'Configuration not found' });
    }
    
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log('Using config:', { apiUrl: config.apiUrl, hasToken: !!config.token });
    
    if (!config.apiUrl || !config.token) {
      return res.status(400).json({ error: 'Missing configuration' });
    }
    
    // Map action to entity_id
    const entityMap = {
      'open': 'automation.ouvrirvolets',
      'close': 'automation.fermervolets',
      'check': 'automation.veriffermeture'
    };
    
    const entity_id = entityMap[action];
    console.log('Triggering entity:', entity_id);
    
    // Call Home Assistant API
    const haUrl = `${config.apiUrl}/api/services/automation/trigger`;
    console.log('Sending request to:', haUrl);
    
    const response = await fetch(haUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entity_id
      })
    });
    
    if (!response.ok) {
      throw new Error(`Home Assistant returned ${response.status}`);
    }
    
    console.log('Success triggering automation');
    res.json({ success: true });
  } catch (error) {
    console.error('Error triggering automation:', error);
    res.status(500).json({ error: 'Error triggering automation' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 