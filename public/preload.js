// Emulates the wallpaper engine api
const {ipcRenderer} = require('electron');

let videoSrc = null;
let project = null;
let enableSound = null;

ipcRenderer.on('video-src', (_, pathToVideo) => {
  videoSrc = pathToVideo;
});

ipcRenderer.on('load-project', (_, projectToSet) => {
  project = projectToSet;
});

ipcRenderer.on('enable-sound', (_, enableSoundToSet) => {
  enableSound = enableSoundToSet;
});

window.wallpaperRegisterAudioListener = (wallpaperAudioListener) => {
  window.wallpaperAudioListener = wallpaperAudioListener;
  window.dispatchEvent(new Event('audioListenerLoaded'));
}


window.addEventListener('audioListenerLoaded', () => {
  if (enableSound === null) {
    const waitForEnableSound = setInterval(() => {
      if (enableSound !== null) { 
        window.dispatchEvent(new Event('audioListenerLoaded'));
        clearInterval(waitForEnableSound);
      }
    }, 20);
  } else if (enableSound) {
    window.dispatchEvent(new Event('enableAudio'));
  }
});

window.addEventListener('enableAudio', () => {
  navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop'
      }
    },
    video: { // This has to be here cuz reasons
      mandatory: {
        chromeMediaSource: 'desktop',
        maxWidth: 1,
        maxHeight: 1
      }
    }
  }).then(stream => {
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    const audioAnalyser = audioCtx.createAnalyser();
    src.connect(audioAnalyser);
    audioAnalyser.fftSize = 128; // 64 elements per channel
    const freqArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    setInterval(() => {
      audioAnalyser.getByteFrequencyData(freqArray);
      const convertedArray = [];
      freqArray.forEach(raw => convertedArray.push(parseInt(raw.toString()) / 1024)); // Left channel
      freqArray.forEach(raw => convertedArray.push(parseInt(raw.toString()) / 1024)); // Right channel
      window.wallpaperAudioListener(convertedArray);
    }, 1);
  }).catch(e => console.error(e));
});

HTMLCanvasElement.prototype.addEventListener = (eName, listener) => window.addEventListener(eName, listener);

window.addEventListener('load', () => {
  window.dispatchEvent(new Event('mouseenter'));
});


window.addEventListener('DOMContentLoaded', () => {
    const waitForWallpaper = setInterval(() => {
        if (window.wallpaperPropertyListener === undefined || window.wallpaperPropertyListener.applyUserProperties === undefined || project === null) {
            return;
        }
        if (videoSrc) {
          project.general.properties = {...project.general.properties, video: videoSrc};
        }
        ipcRenderer.on('update-props', () => window.wallpaperPropertyListener.applyUserProperties(project.general.properties)); // Allows wallex to update the props while the wallpaper is running
        window.wallpaperPropertyListener.applyUserProperties(project.general.properties);
        clearInterval(waitForWallpaper);
    }, 100);
})