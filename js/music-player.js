import terminalController from './core/terminal-controller.js';
import terminal from './core/terminal.js';
import terminalView from './core/terminal-view.js';
import logger from './core/logger.js';
import { animateMusicPlayerButtons } from './animations/music-player-animation.js';

let soundcloudWidget;
let currentVolume = 50;

const playlist = [
    // --- START: EDIT YOUR PLAYLIST HERE ---
    {
        url: 'https://soundcloud.com/leather-and-lace/funami-fm',
        title: 'Funami FM',
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/moskalus/premiere-alder-basalt-tripalium-corp',
        title: 'Alder - Basalt',
        startTime: 4,
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/urbanstghetto/dj-freelancer-6666alxsf-remix',
        title: '6666 - ALXSF Remix',
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/twoshell/everybody-worldwide-1',
        title: 'Everybody Worldwide - Two Shell',
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/woodland-creatures-label/02-deadseankennedy-business-and-my-bread-2',
        title: 'Deadseankennedy - Business and my Bread',
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/hypno_groove/premiere-connor-byrne-fierce-deity-kouncil-cuts',
        title: 'Fierce',
        type: 'soundcloud'
    },
    {
        url: 'https://soundcloud.com/hyperboloid/pixelord-nft-acid',
        title: 'Pixelord - NFT Acid',
        type: 'soundcloud'
    },
    // --- END: EDIT YOUR PLAYLIST HERE ---
];
let currentTrackIndex = 0;

// Helper function to update song information display
function updateSongInfo(title, url) {
    const songInfo = document.getElementById('song-info');
    if (songInfo) {
        if (title) {
            songInfo.innerHTML = `<a href="${url}" target="_blank">${title}</a>`;
            songInfo.style.display = 'block';
        } else {
            songInfo.style.display = 'none';
        }
    }
}

// Function to stop the player
function stopPlayer() {
    if (soundcloudWidget && typeof soundcloudWidget.pause === 'function') {
        soundcloudWidget.pause();
    }
}

// Function to load and switch tracks
function loadTrack(track, shouldPlayImmediately = true) {
    stopPlayer();

    const { url, title } = track;
    updateSongInfo(title, url);

    // All tracks are SoundCloud now
    const soundcloudPlayerIframe = document.getElementById('soundcloud-player');
    if (!soundcloudWidget) {
        soundcloudWidget = SC.Widget(soundcloudPlayerIframe);
        soundcloudWidget.bind(SC.Widget.Events.ERROR, (err) => {
            logger.error('SoundCloud Widget Error:', err);
            terminal.write({ text: 'Error with SoundCloud player.', className: "terminal-error" });
            terminalView.createInputLine();
        });
        soundcloudWidget.bind(SC.Widget.Events.READY, () => {
            logger.info('SoundCloud Widget is ready.');
            soundcloudWidget.setVolume(currentVolume);
            soundcloudWidget.load(url, {
                auto_play: shouldPlayImmediately,
                callback: () => {
                    if (track.startTime) {
                        soundcloudWidget.seekTo(track.startTime * 1000);
                    }
                }
            });
        });
    } else {
        soundcloudWidget.load(url, {
            auto_play: shouldPlayImmediately,
            callback: () => {
                if (track.startTime) {
                    soundcloudWidget.seekTo(track.startTime * 1000);
                }
            }
        });
    }
}

export function initializeMusicPlayer() {
    const soundcloudPlayerIframe = document.getElementById('soundcloud-player');
    const prevBtn = document.getElementById('prev-btn');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeUpBtn = document.getElementById('volume-up-btn');
    const volumeDownBtn = document.getElementById('volume-down-btn');

    if (!soundcloudPlayerIframe || !prevBtn || !playBtn || !stopBtn || !nextBtn || !volumeUpBtn || !volumeDownBtn) {
        logger.error('Music player UI elements not found.');
        return;
    }

    // Helper functions for playlist navigation
    function playNextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(playlist[currentTrackIndex]);
    }

    function playPreviousTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(playlist[currentTrackIndex]);
    }

    // Event Listeners for player controls
    playBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) {
            terminal.write({ text: "Please unlock the terminal to access Funami FM.", className: "terminal-error" });
            terminalView.createInputLine();
            return;
        }
        playCurrentTrack();
    });

    stopBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) return;
        stopPlayer();
    });

    nextBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) return;
        playNextTrack();
    });

    prevBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) return;
        playPreviousTrack();
    });

    volumeUpBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) {
            terminal.write({ text: "Please unlock the terminal to access Funami FM.", className: "terminal-error" });
            terminalView.createInputLine();
            return;
        }
        currentVolume = Math.min(100, currentVolume + 10);
        if (soundcloudWidget) {
            soundcloudWidget.setVolume(currentVolume);
        }
    });

    volumeDownBtn.addEventListener('click', () => {
        if (!terminalController.isAuthenticated) {
            terminal.write({ text: "Please unlock the terminal to access Funami FM.", className: "terminal-error" });
            terminalView.createInputLine();
            return;
        }
        currentVolume = Math.max(0, currentVolume - 10);
        if (soundcloudWidget) {
            soundcloudWidget.setVolume(currentVolume);
        }
    });

    // Function to toggle player visibility
    function togglePlayerVisibility() {
        const playerContainer = document.getElementById('music-player-container');
        if (playerContainer) {
            const isVisible = playerContainer.style.display !== 'none';
            playerContainer.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                animateMusicPlayerButtons(playerContainer);
            }
            return !isVisible;
        }
        return false;
    }

    function playCurrentTrack() {
        if (!soundcloudWidget) {
            loadTrack(playlist[currentTrackIndex], true);
            return;
        }
        soundcloudWidget.play();
        updateSongInfo(playlist[currentTrackIndex].title, playlist[currentTrackIndex].url);
    }

    function stopMusic() {
        stopPlayer();
    }

    function setVolume(volume) {
        currentVolume = Math.max(0, Math.min(100, volume));
        if (soundcloudWidget && typeof soundcloudWidget.setVolume === 'function') {
            soundcloudWidget.setVolume(currentVolume);
        }
    }

    // Expose functions for external use
    window.musicPlayer = {
        loadTrack,
        toggleVisibility: togglePlayerVisibility,
        playNextTrack,
        playPreviousTrack,
        playCurrentTrack,
        stop: stopMusic,
        setVolume,
        getPlaylist: () => playlist,
        getCurrentTrackInfo: () => {
            const track = playlist[currentTrackIndex];
            // SoundCloud status is hard to get synchronously, so this is an approximation
            return {
                track,
                index: currentTrackIndex,
                status: soundcloudWidget ? 'Ready' : 'Stopped',
                volume: currentVolume
            };
        }
    };
}
