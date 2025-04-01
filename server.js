const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const app = express();

// Forcer l'utilisation du port 3157 explicitement, sans considérer la variable d'environnement
// pour éviter les conflits avec le port 3000
const port = 3157;

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory: ${logsDir}`);
}

// Setup log file
const logFile = path.join(logsDir, 'server.log');

// Enhanced logging
function logger(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data || undefined
  };
  
  const logString = JSON.stringify(logEntry);
  
  // Console output
  console[level === 'error' ? 'error' : 'log'](`${timestamp} [${level}] ${message}`, data || '');
  
  // File output
  try {
    fs.appendFileSync(logFile, logString + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

const log = {
  info: (message, data) => logger('info', message, data),
  error: (message, data) => logger('error', message, data),
  debug: (message, data) => logger('debug', message, data),
  warn: (message, data) => logger('warn', message, data)
};

// Middleware for request logging
app.use((req, res, next) => {
  log.info(`${req.method} ${req.url}`, { 
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error handling request ${req.method} ${req.url}`, err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Config file path
const configDir = path.join(__dirname, 'config');
const configFile = path.join(configDir, 'settings.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log(`Created config directory: ${configDir}`);
}

// API Routes
app.get('/api/settings', (req, res) => {
  try {
    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      console.log('Settings loaded successfully');
      res.json({
        apiUrl: config.apiUrl,
        token: config.token ? '********' : null
      });
    } else {
      console.log('No settings file found, returning empty object');
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
    console.log(`Saving settings - API URL: ${apiUrl}, Token provided: ${!!token}`);
    
    // Load existing config if it exists
    let config = {};
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      console.log('Loaded existing config');
    }
    
    // Update config
    config.apiUrl = apiUrl;
    if (token) {
      config.token = token;
    }
    
    // Save config
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    console.log('Settings saved successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Error saving settings', details: error.message });
  }
});

app.post('/api/trigger', async (req, res) => {
  log.info('Trigger API call received', { body: req.body });
  
  try {
    const { action } = req.body;
    
    // Validate action
    if (!['open', 'close', 'check'].includes(action)) {
      log.error('Invalid action received', { action });
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Load config
    if (!fs.existsSync(configFile)) {
      log.error('Configuration file not found', { path: configFile });
      return res.status(400).json({ error: 'Configuration not found' });
    }
    
    log.info('Reading configuration file');
    const configData = fs.readFileSync(configFile, 'utf8');
    
    try {
      const config = JSON.parse(configData);
      log.info('Configuration loaded', { apiUrl: config.apiUrl, hasToken: !!config.token });
      
      if (!config.apiUrl || !config.token) {
        log.error('Missing configuration values');
        return res.status(400).json({ error: 'Missing API URL or token' });
      }
      
      // Map action to entity_id
      const entityMap = {
        'open': 'automation.ouvrirvolets',
        'close': 'automation.fermervolets',
        'check': 'automation.veriffermeture'
      };
      
      const entity_id = entityMap[action];
      log.info('Triggering Home Assistant entity', { entity_id });
      
      // Adjust URL if needed (fix http/https issues)
      let haUrl = config.apiUrl;
      
      // Ensure there's no trailing slash
      if (haUrl.endsWith('/')) {
        haUrl = haUrl.slice(0, -1);
      }
      
      // Append API endpoint
      haUrl = `${haUrl}/api/services/automation/trigger`;
      log.info('Prepared Home Assistant URL', { url: haUrl });
      
      try {
        // Create request data
        const requestBody = JSON.stringify({ entity_id });
        const requestOptions = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          },
          body: requestBody
        };
        
        // Log request (without token)
        log.info('Sending request to Home Assistant', {
          url: haUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        });
        
        // Make request with longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const response = await fetch(haUrl, {
            ...requestOptions,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          log.info('Home Assistant response received', { status: response.status });
          
          if (!response.ok) {
            const errorText = await response.text();
            log.error('Home Assistant returned error', { 
              status: response.status, 
              body: errorText 
            });
            
            return res.status(response.status).json({
              error: `Home Assistant returned error ${response.status}`,
              details: errorText
            });
          }
          
          const responseData = await response.json();
          log.info('Home Assistant success response', { data: responseData });
          
          return res.json({
            success: true,
            data: responseData
          });
          
        } catch (fetchError) {
          clearTimeout(timeoutId);
          log.error('Fetch error', { 
            message: fetchError.message,
            name: fetchError.name,
            stack: fetchError.stack
          });
          
          // Handle timeout specifically
          if (fetchError.name === 'AbortError') {
            return res.status(504).json({
              error: 'Request to Home Assistant timed out',
              details: 'The server took too long to respond'
            });
          }
          
          return res.status(500).json({
            error: 'Error connecting to Home Assistant',
            details: fetchError.message
          });
        }
        
      } catch (requestError) {
        log.error('Error preparing request', { error: requestError });
        return res.status(500).json({
          error: 'Error preparing Home Assistant request',
          details: requestError.message
        });
      }
      
    } catch (parseError) {
      log.error('Error parsing configuration file', { error: parseError, data: configData });
      return res.status(500).json({
        error: 'Error parsing configuration file',
        details: parseError.message
      });
    }
    
  } catch (error) {
    log.error('Unhandled error in trigger API', { 
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Unhandled server error',
      details: error.message
    });
  }
});

app.listen(port, () => {
  log.info(`Server started`, {
    port,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    workingDirectory: process.cwd()
  });
  
  // Check and log config status
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      log.info('Configuration loaded successfully', { 
        hasApiUrl: !!config.apiUrl, 
        hasToken: !!config.token
      });
    } catch (error) {
      log.error('Failed to parse configuration file', { error });
    }
  } else {
    log.warn('No configuration file found, waiting for setup', { configPath: configFile });
  }
  
  // Log application environment info
  log.info('Environment information', {
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV,
    tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED
  });
  
  // Log network info
  try {
    const interfaces = require('os').networkInterfaces();
    const addresses = {};
    for (const name of Object.keys(interfaces)) {
      for (const info of interfaces[name]) {
        if (info.family === 'IPv4' && !info.internal) {
          addresses[name] = info.address;
        }
      }
    }
    log.info('Network interfaces', addresses);
  } catch (error) {
    log.error('Failed to get network interfaces', { error });
  }
}); 