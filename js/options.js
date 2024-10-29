$(document).ready(function () {
    // Menu option click event
    $('#menu').find('.option').click(function () {
        const target = $(this).attr('data-target');
        showSection(target);
    });

    // Show home section by default
    showSection('home');

    // Initialize version number
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        $("#version").text(chrome.runtime.getManifest().version_name);
    } else {
        $("#version").text('1.0.0');
    }

    // Load saved settings and apply theme
    loadSettings();

    // Save settings button click event
    $('#saveSettings').click(function () {
        saveSettings();
    });

    // Listen for theme updates
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (request.action === 'updateTheme') {
                applyTheme(request.themeChoice);
            }
        });
    }
});

/**
 * Displays the specified section and hides others
 * @param {string} sectionId - The ID of the section to display
 */
function showSection(sectionId) {
    if (!sectionId) return;

    const $section = $('#' + sectionId);
    if (!$section.length) return;

    $('#contenedor').children('.section').hide();
    $section.show();

    // Highlight active menu option
    $('#menu').find('.option').removeClass('active');
    $('#menu').find(`.option[data-target="${sectionId}"]`).addClass('active');
}

/**
 * Loads the saved settings and updates the UI
 */
function loadSettings() {
    getThemeChoice(function (themeChoice) {
        $('#themeChoice').val(themeChoice);
        applyTheme(themeChoice);
    });
}

/**
 * Saves the settings selected by the user
 */
function saveSettings() {
    const themeChoice = $('#themeChoice').val();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ themeChoice: themeChoice }, function () {
            notification('הגדרות נשמרו בהצלחה');
        });
    } else {
        localStorage.setItem('themeChoice', themeChoice);
        notification('הגדרות נשמרו בהצלחה');
    }

    // Apply the theme immediately
    applyTheme(themeChoice);

    // Send a message to update the theme in content scripts
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'updateTheme', themeChoice: themeChoice });
    }
}

/**
 * Retrieves the theme choice from storage
 * @param {function} callback - The callback function to execute with the theme choice
 */
function getThemeChoice(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['themeChoice'], function (data) {
            let themeChoice = data.themeChoice || 'light';
            callback(themeChoice);
        });
    } else {
        let themeChoice = localStorage.getItem('themeChoice') || 'light';
        callback(themeChoice);
    }
}

/**
 * Applies the selected theme to the options page
 * @param {string} themeChoice - The selected theme ('light', 'dark', 'auto')
 */
function applyTheme(themeChoice) {
    if (themeChoice === 'auto') {
        const hour = new Date().getHours();
        themeChoice = (hour >= 7 && hour < 19) ? 'light' : 'dark';
    }

    if (themeChoice === 'dark') {
        document.documentElement.classList.add('dark-mode');
        replaceLogo('dark');
    } else {
        document.documentElement.classList.remove('dark-mode');
        replaceLogo('light');
    }
}

/**
 * Replaces the logo based on the theme
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function replaceLogo(theme) {
    const logoImg = document.getElementById('logo');
    if (logoImg) {
        if (theme === 'dark') {
            logoImg.src = 'assets/ModernUi/DarkLogo.svg';
        } else {
            logoImg.src = 'assets/ModernUi/Logo.svg';
        }
    }
}

/**
 * Displays a notification to the user
 * @param {string} message - The notification message
 */
function notification(message) {
    // For simplicity, using alert; replace with a custom notification if needed
    alert(message);
}
