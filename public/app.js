document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeModal = document.getElementById('closeModal');
  const settingsForm = document.getElementById('settingsForm');
  const apiUrlInput = document.getElementById('apiUrl');
  const tokenInput = document.getElementById('token');
  const toggleToken = document.getElementById('toggleToken');
  const openBtn = document.getElementById('openBtn');
  const closeBtn = document.getElementById('closeBtn');
  const checkBtn = document.getElementById('checkBtn');
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');

  // Load settings from server
  loadSettings();

  // Add visual feedback when buttons are clicked
  const buttons = [openBtn, closeBtn, settingsBtn, checkBtn];
  buttons.forEach(button => {
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = '';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
    });
  });

  // Event Listeners
  settingsBtn.addEventListener('click', () => {
    document.body.style.overflow = 'hidden';
    settingsModal.classList.add('show');
    // Reset token input when opening modal
    tokenInput.value = '';
  });

  function closeModalHandler() {
    settingsModal.classList.remove('show');
    setTimeout(() => {
      document.body.style.overflow = '';
    }, 300);
  }

  closeModal.addEventListener('click', closeModalHandler);

  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeModalHandler();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('show')) {
      closeModalHandler();
    }
  });

  toggleToken.addEventListener('click', () => {
    if (tokenInput.type === 'password') {
      tokenInput.type = 'text';
      toggleToken.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      tokenInput.type = 'password';
      toggleToken.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });

  // Token help toggle
  const tokenHelp = document.getElementById('tokenHelp');
  const tokenHelpText = document.getElementById('tokenHelpText');
  if (tokenHelp && tokenHelpText) {
    tokenHelp.addEventListener('click', (e) => {
      e.preventDefault();
      tokenHelpText.style.display = tokenHelpText.style.display === 'none' ? 'block' : 'none';
    });
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveBtn = settingsForm.querySelector('.save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    saveBtn.disabled = true;
    
    await saveSettings();
    
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
      closeModalHandler();
    }, 500);
  });

  openBtn.addEventListener('click', () => triggerAction('open'));
  closeBtn.addEventListener('click', () => triggerAction('close'));
  checkBtn.addEventListener('click', () => triggerAction('check'));

  // Functions
  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.apiUrl) {
        apiUrlInput.value = data.apiUrl;
        updateButtonsState(data.apiUrl && data.token);
      } else {
        setTimeout(() => {
          settingsModal.classList.add('show');
          showNotification('Veuillez configurer les paramètres', true);
        }, 500);
      }
    } catch (error) {
      showNotification('Erreur lors du chargement des paramètres', true);
    }
  }

  async function saveSettings() {
    try {
      const apiUrl = apiUrlInput.value.trim();
      const token = tokenInput.value.trim();
      
      // Si le token n'est pas fourni, utiliser celui déjà enregistré
      const response = await fetch('/api/settings');
      const currentSettings = await response.json();
      
      const settingsToSave = {
        apiUrl,
        token: token || currentSettings.token
      };
      
      const saveResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      });
      
      if (saveResponse.ok) {
        showNotification('Paramètres sauvegardés');
        updateButtonsState(true);
      } else {
        showNotification('Erreur lors de la sauvegarde des paramètres', true);
      }
    } catch (error) {
      showNotification('Erreur lors de la sauvegarde des paramètres', true);
    }
  }

  async function triggerAction(action) {
    try {
      const button = action === 'open' ? openBtn : 
                    action === 'close' ? closeBtn : 
                    checkBtn;
      const originalText = button.innerHTML;
      
      updateButtonsState(false);
      
      const actionText = {
        'open': 'Ouverture...',
        'close': 'Fermeture...',
        'check': 'Vérification...'
      };
      
      button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${actionText[action]}`;
      
      console.log(`Sending ${action} action to server...`);
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      button.innerHTML = originalText;
      
      if (response.ok) {
        const successMessages = {
          'open': 'Volets en cours d\'ouverture',
          'close': 'Volets en cours de fermeture',
          'check': 'Vérification en cours'
        };
        showNotification(successMessages[action]);
      } else {
        console.error('Server error:', data);
        let errorMessage = data.error || 'Erreur lors de l\'envoi de la commande';
        
        // Handle specific error cases
        if (response.status === 401 || (data.error && data.error.includes('401'))) {
          errorMessage = 'Erreur d\'authentification avec Home Assistant. Veuillez vérifier votre token dans les paramètres.';
          // Open settings modal automatically
          setTimeout(() => {
            document.body.style.overflow = 'hidden';
            settingsModal.classList.add('show');
            // Clear token to force re-entry
            tokenInput.value = '';
          }, 1500);
        } else if (data.details) {
          errorMessage += ` - ${data.details}`;
        }
        
        showNotification(errorMessage, true);
      }
      
      updateButtonsState(true);
    } catch (error) {
      console.error('Connection error:', error);
      showNotification('Erreur de connexion au serveur: ' + error.message, true);
      updateButtonsState(true);
      
      openBtn.innerHTML = `<i class="fas fa-arrow-up"></i> Ouvrir TOUS`;
      closeBtn.innerHTML = `<i class="fas fa-arrow-down"></i> Fermer TOUS`;
      checkBtn.innerHTML = `<i class="fas fa-search"></i> Vérifier l'état`;
    }
  }

  function updateButtonsState(enabled) {
    [openBtn, closeBtn, checkBtn].forEach(button => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? '1' : '0.5';
      button.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  function showNotification(message, isError = false) {
    notificationText.textContent = message;
    notification.classList.toggle('error', isError);
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
}); 