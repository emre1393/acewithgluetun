const API_BASE = `http://${window.location.hostname}:${window.location.port || '6878'}`;
const STAT_UPDATE_INTERVAL = 1000; // 1 second

let hls = null;
let currentStreamData = null;
let statusPollingInterval = null;
let intentionallyStopped = false;

// DOM Elements
const streamIdInput = document.getElementById('streamId');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const videoPlayer = document.getElementById('videoPlayer');
const infoText = document.getElementById('infoText');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const statusBtn = document.getElementById('statusBtn');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');

// Store original copy button HTML
let originalCopyBtnHTML = copyBtn ? copyBtn.innerHTML : '';

// Event Listeners
playBtn.addEventListener('click', handlePlay);
stopBtn.addEventListener('click', handleStop);
copyBtn.addEventListener('click', handleCopyUrl);
refreshBtn.addEventListener('click', () => location.reload());
streamIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handlePlay();
    }
});

/**
 * Handle play button click
 */
async function handlePlay() {
    const streamId = streamIdInput.value.trim();

    if (!streamId) {
        showError('Please enter a stream ID');
        return;
    }

    intentionallyStopped = false;
    setLoading(true);
    hideError();
    clearStatus();

    try {
        // Fetch stream manifest
        const manifestUrl = `${API_BASE}/ace/manifest.m3u8?id=${encodeURIComponent(streamId)}&format=json`;
        const response = await fetch(manifestUrl);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.response || !data.response.playback_url) {
            throw new Error('Invalid response format: missing playback_url');
        }

        currentStreamData = data.response;
        infoText.textContent = `Stream is loading...`;

        // Load HLS stream
        loadStream(currentStreamData.playback_url);

        // Start polling status
        startStatusPolling(currentStreamData.stat_url);

    } catch (error) {
        console.error('Play error:', error);
        showError(`Failed to load stream: ${error.message}`);
        setLoading(false);
    }
}

/**
 * Handle stop stream
 */
async function handleStop() {
    if (!currentStreamData || !currentStreamData.command_url) {
        showError('No stream to stop');
        return;
    }

    intentionallyStopped = true;

    try {
        // Send stop command to server
        const stopUrl = `${currentStreamData.command_url}?method=stop`;
        const response = await fetch(stopUrl);

        if (!response.ok) {
            console.warn(`Stop command returned status ${response.status}`);
        }

        // Stop local playback
        if (hls) {
            hls.destroy();
            hls = null;
        }

        videoPlayer.src = '';
        videoPlayer.pause();

        // Clear status polling
        clearStatus();

        // Update UI
        stopBtn.disabled = true;
        playBtn.disabled = false;
        infoText.textContent = 'Stream stopped';

        console.log('Stream stopped successfully');

    } catch (error) {
        console.error('Stop error:', error);
        showError(`Failed to stop stream: ${error.message}`);
    }
}

/**
 * Handle copy stream URL
 */
function handleCopyUrl() {
    if (!currentStreamData || !currentStreamData.playback_url) {
        showError('No stream URL available. Play a stream first.');
        return;
    }

    // Use Clipboard API if available
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(currentStreamData.playback_url)
            .then(() => {
                // Provide visual feedback
                copyBtn.textContent = '✓';
                copyBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalCopyBtnHTML;
                    copyBtn.style.backgroundColor = '';
                }, 1500);
                
                console.log('Stream URL copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy URL:', err);
                showError('Failed to copy URL to clipboard');
            });
    } else {
        // Fallback: use execCommand
        const tempInput = document.createElement('input');
        tempInput.value = currentStreamData.playback_url;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                copyBtn.textContent = '✓';
                copyBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                setTimeout(() => {
                    copyBtn.innerHTML = originalCopyBtnHTML;
                    copyBtn.style.backgroundColor = '';
                }, 1500);
                console.log('Stream URL copied to clipboard (fallback)');
            } else {
                showError('Failed to copy URL to clipboard');
            }
        } catch (err) {
            console.error('Fallback failed:', err);
            showError('Failed to copy URL to clipboard');
        }
        document.body.removeChild(tempInput);
    }
}

/**
 * Load HLS stream
 */
function loadStream(playbackUrl) {
    try {
        // Check if HLS.js is available
        if (!window.Hls) {
            throw new Error('HLS.js library not loaded');
        }

        // Destroy existing HLS instance
        if (hls) {
            hls.destroy();
        }

        // Create new HLS instance
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
        });

        hls.loadSource(playbackUrl);
        hls.attachMedia(videoPlayer);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('Manifest parsed');
            videoPlayer.play().catch(err => {
                console.warn('Autoplay failed:', err);
                infoText.textContent = 'Stream loaded. Click play to start.';
            });
            stopBtn.disabled = false;
            setLoading(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
                showError(`Stream error: ${data.type}`);
                setLoading(false);
            }
        });

    } catch (error) {
        console.error('Stream load error:', error);
        showError(`Failed to load stream: ${error.message}`);
        setLoading(false);
    }
}

/**
 * Start polling stream status
 */
function startStatusPolling(statUrl) {
    // Clear any existing interval
    if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
    }

    // Fetch immediately
    fetchStreamStatus(statUrl);

    // Then poll at regular intervals
    statusPollingInterval = setInterval(() => {
        fetchStreamStatus(statUrl);
    }, STAT_UPDATE_INTERVAL);
}

/**
 * Fetch stream status
 */
async function fetchStreamStatus(statUrl) {
    try {
        const response = await fetch(statUrl);

        if (!response.ok) {
            throw new Error(`Status request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            console.warn('Status error:', data.error);
            return;
        }

        if (data.response) {
            updateStatusDisplay(data.response);
        }

    } catch (error) {
        console.warn('Status fetch error:', error);
    }
}

/**
 * Update status display
 */
function updateStatusDisplay(status) {
    // Status
    const statusMap = {
        'dl': 'Live',
        'pref': 'Prebuffering'
    };

    document.getElementById('status-status').textContent = statusMap[status.status] || status.status || '-';

    // Speed down
    document.getElementById('status-speed_down').textContent = formatSpeed(status.speed_down);

    // Speed up
    document.getElementById('status-speed_up').textContent = formatSpeed(status.speed_up);

    // Peers
    document.getElementById('status-peers').textContent = status.peers || '0';

    // Downloaded
    document.getElementById('status-downloaded').textContent = formatBytes(status.downloaded);

    // Uploaded
    document.getElementById('status-uploaded').textContent = formatBytes(status.uploaded);
}

/**
 * Clear status display
 */
function clearStatus() {
    ['status', 'speed_down', 'speed_up', 'peers', 'downloaded', 'uploaded'].forEach(field => {
        document.getElementById(`status-${field}`).textContent = '-';
    });

    if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;
    }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Format speed to human readable
 * Input is in KB/s
 */
function formatSpeed(kilobytesPerSec) {
    if (!kilobytesPerSec || kilobytesPerSec === 0) return '0 KB/s';
    return kilobytesPerSec.toFixed(2) + ' KB/s';
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorSection.style.display = 'none';
    errorMessage.textContent = '';
}

/**
 * Set loading state
 */
function setLoading(isLoading) {
    if (isLoading) {
        playBtn.disabled = true;
        stopBtn.disabled = true;
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.id = 'playBtnSpinner';
        playBtn.insertBefore(spinner, playBtn.firstChild);
        infoText.textContent = 'Loading stream...';
    } else {
        playBtn.disabled = false;
        const spinner = document.getElementById('playBtnSpinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

// Handle video events
videoPlayer.addEventListener('play', () => {
    infoText.textContent = 'Playing...';
});

videoPlayer.addEventListener('pause', () => {
    infoText.textContent = 'Paused';
});

videoPlayer.addEventListener('error', (e) => {
    // Don't show error if user intentionally stopped the stream
    if (intentionallyStopped) {
        intentionallyStopped = false;
        return;
    }
    console.error('Video error:', e);
    showError('Video playback error');
});

// Initialize
window.addEventListener('load', () => {
    infoText.textContent = 'Ready to play';
    streamIdInput.focus();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (hls) {
        hls.destroy();
    }
    if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
    }
    if (videoPlayer.src) {
        videoPlayer.src = '';
    }
});
