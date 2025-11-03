
/*
 * For reference look at: https://github.com/nodejs/node-addon-examples/tree/main/src/3-context-awareness/node_10
 */
#include <node.h>
#include <node_buffer.h>
#include <cmath>
#include <rtaudio/RtAudio.h>
#include <fftw3.h>

using namespace v8;

constexpr unsigned int SAMPLE_RATE = 48000;
constexpr unsigned int NUM_BANDS = 64;

struct OutputData {
  float* left;
  float* right;
};

// Required by v8
inline void BufferCleanup(char* data, void* hint) {
    delete[] reinterpret_cast<float*>(data);
}

class AddonData {
 public:
  OutputData outputData;

  static Local<Value> New(Isolate* isolate, Local<Object> exports) {
    return External::New(isolate, new AddonData(isolate, exports));
  }

  // returns true if successful
  bool startCapture() {
    if (audio.getDeviceCount() < 1) {
        // No devices found
        return false;
    }

    if (audio.isStreamOpen()) {
      // Already listening
      return false;
    }
    
    RtAudio::StreamParameters params;
    params.deviceId = audio.getDefaultOutputDevice();
    params.nChannels = 2;
    params.firstChannel = 0;

    // This can be updated by rtaudio
    unsigned int nBufferFrames = 1024;

    audio.openStream(nullptr, &params, RTAUDIO_FLOAT32, SAMPLE_RATE, &nBufferFrames, &audioCallback, &outputData);
    audio.startStream();

    return true;
  }

 private:
  RtAudio audio;

  static void computeBands(const double* in, float* bands, unsigned int nBufferFrames) {
    fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * nBufferFrames);
    fftw_plan plan = fftw_plan_dft_r2c_1d(nBufferFrames, const_cast<double*>(in), out, FFTW_ESTIMATE);
    fftw_execute(plan);

    // Compute magnitudes
    std::vector<double> mags(nBufferFrames / 2);
    for (size_t i = 0; i < mags.size(); ++i)
        mags[i] = sqrt(out[i][0] * out[i][0] + out[i][1] * out[i][1]);

    // Divide into NUM_BANDS groups
    size_t binSize = mags.size() / NUM_BANDS;
    double maxVal = 1e-9;
    for (size_t i = 0; i < NUM_BANDS; ++i) {
        double sum = 0;
        for (size_t j = i * binSize; j < (i + 1) * binSize && j < mags.size(); ++j)
            sum += mags[j];
        bands[i] = static_cast<float>(sum / binSize);
        maxVal = std::max(maxVal, (double)bands[i]);
    }

    // Normalize
    for (size_t i = 0; i < NUM_BANDS; i++) {
      bands[i] = std::min(1.0f, static_cast<float>(bands[i] / maxVal));
    }

    fftw_destroy_plan(plan);
    fftw_free(out);
  }

  static int audioCallback(void* outputBuffer, void* inputBuffer,
    unsigned int nBufferFrames, double streamTime,
    RtAudioStreamStatus status, void* userData) {
    OutputData* outputData = reinterpret_cast<OutputData*>(userData);

    float* in = static_cast<float*>(inputBuffer);
    static std::vector<double> left(nBufferFrames), right(nBufferFrames);

    // Separate channels
    for (unsigned int i = 0; i < nBufferFrames; ++i) {
        left[i] = in[2 * i];
        right[i] = in[2 * i + 1];
    }

    computeBands(left.data(), outputData->left, nBufferFrames);
    computeBands(right.data(), outputData->right, nBufferFrames);

    return 0;
  }


  explicit AddonData(Isolate* isolate, Local<Object> exports) : audio(RtAudio::WINDOWS_WASAPI) {
    auto* allocator = isolate->GetArrayBufferAllocator();

    // TODO: Free this
    outputData.left = static_cast<float*>(allocator->Allocate(sizeof(float)*NUM_BANDS));
    outputData.right = static_cast<float*>(allocator->Allocate(sizeof(float)*NUM_BANDS));

    exports_persistent.Reset(isolate, exports);
    exports_persistent.SetWeak(this, DeleteMe, WeakCallbackType::kParameter);
  }

  ~AddonData() { 
    audio.stopStream();
    if (audio.isStreamOpen()) audio.closeStream();
    exports_persistent.Reset();
  }

  static void DeleteMe(const WeakCallbackInfo<AddonData>& info) {
    delete info.GetParameter();
  }

  Persistent<Object> exports_persistent;
};

void CaptureAudio(const FunctionCallbackInfo<Value>& info) {
    Isolate *isolate = info.GetIsolate();
    auto* allocator = isolate->GetArrayBufferAllocator();

    AddonData* addon_data =
      static_cast<AddonData*>(info.Data().As<External>()->Value());

    bool success = addon_data->startCapture();
    if (!success) {
      // TODO: Throw JS exception here
    }
    
    Local<Object> bufferLeft = node::Buffer::New(isolate, reinterpret_cast<char*>(addon_data->outputData.left), NUM_BANDS * sizeof(float), BufferCleanup, nullptr).ToLocalChecked();
    Local<Object> bufferRight = node::Buffer::New(isolate, reinterpret_cast<char*>(addon_data->outputData.right), NUM_BANDS * sizeof(float), BufferCleanup, nullptr).ToLocalChecked();

    Local<Object> result = Object::New(isolate);
    result->Set(isolate->GetCurrentContext(),
                String::NewFromUtf8(isolate, "left").ToLocalChecked(), bufferLeft).Check();
    result->Set(isolate->GetCurrentContext(),
                String::NewFromUtf8(isolate, "right").ToLocalChecked(), bufferRight).Check();


    info.GetReturnValue().Set(result);
}

NODE_MODULE_INIT() {
  Isolate* isolate = context->GetIsolate();

  Local<Value> addon_data = AddonData::New(isolate, exports);
  
  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "captureAudio", NewStringType::kNormal)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, CaptureAudio, addon_data)
                ->GetFunction(context)
                .ToLocalChecked())
      .FromJust();
}