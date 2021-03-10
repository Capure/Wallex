// Emulates the wallpaper engine api
// const mouseEvents = require('global-mouse-events');
const { remote } = require('electron');
const mouseEventsNative = require('../mouseEvents');

const currentWindow = remote.getCurrentWindow();

window.addEventListener('offsetLoaded', e => {
  console.log(e);
  mouseEventsNative.createMouseForwarder(currentWindow, e.jsOffsetX, e.jsOffsetY);
});

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


// window.mouseIsOnScreen = false;
// window.jsOffsetX = window.jsOffsetY = 0; // Default

// HTMLCanvasElement.prototype.addEventListener = (eName, listener) => window.addEventListener(eName, listener);

// mouseEvents.on("mouseup", event => {
//   mouseEventsNative.lmbUp(currentWindow, event.x - jsOffsetX, event.y - jsOffsetY);
// });

// mouseEvents.on("mousedown", event => {
//   mouseEventsNative.lmbDown(currentWindow, event.x - jsOffsetX, event.y - jsOffsetY);
// });

// mouseEvents.on("mousemove", event => {
//   if (event.x - jsOffsetX < 0 || event.y - jsOffsetY < 0 || event.x - jsOffsetX > window.innerWidth || event.y - jsOffsetY > window.innerHeight) {
//     if (window.mouseIsOnScreen) {
//         window.mouseIsOnScreen = false;
//         window.dispatchEvent(new Event('mouseleave', { isTrusted: true, screenX: event.x - jsOffsetX, screenY: event.y - jsOffsetY, clientX: event.x - jsOffsetX, clientY: event.y - jsOffsetY }));
//     }
//   } else {
//       if (!window.mouseIsOnScreen) {
//         window.mouseIsOnScreen = true;
//         window.dispatchEvent(new Event('mouseenter', { isTrusted: true, screenX: event.x - jsOffsetX, screenY: event.y - jsOffsetY, clientX: event.x - jsOffsetX, clientY: event.y - jsOffsetY }));
//       }
//   }
//   mouseEventsNative.move(currentWindow, event.x - jsOffsetX, event.y - jsOffsetY);
// });

// mouseEvents.on("mousewheel", event => {
//   // const newEvent = new Event('mousewheel', event);
//   // window.dispatchEvent(newEvent);
//   // TODO: implement this
// });


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