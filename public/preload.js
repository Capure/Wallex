// Emulates the wallpaper engine api
window.wallpaperRegisterAudioListener = (wallpaperAudioListener) => {
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
        freqArray.forEach(raw => convertedArray.push(parseInt(raw.toString()) / 510)); // Left channel
        freqArray.forEach(raw => convertedArray.push(parseInt(raw.toString()) / 510)); // Right channel
        wallpaperAudioListener(convertedArray);
      }, 1);
    }).catch(e => console.error(e));
}

HTMLCanvasElement.prototype.addEventListener = (eName, listener) => window.addEventListener(eName, listener);

window.addEventListener('load', () => {
  window.dispatchEvent(new Event('mouseenter'));
});


window.addEventListener('DOMContentLoaded', () => {
    const waitForWallpaper = setInterval(() => {
        if (window.noproject) {
            clearInterval(waitForWallpaper);
            return;
        }
        if (window.wallpaperPropertyListener === undefined || window.wallpaperPropertyListener.applyUserProperties === undefined || window.project === undefined) {
            return;
        }
        window.wallpaperPropertyListener.applyUserProperties(window.project.general.properties);
        clearInterval(waitForWallpaper);
    }, 100);
})