/*
 * For reference look at: https://github.com/nodejs/node-addon-examples/tree/main/src/3-context-awareness/node_10
 */
#include <math.h>
#include <node.h>
#include <node_buffer.h>
#include <windows.h>

using namespace v8;

// Message to Progman to spawn a WorkerW
#define WM_SPAWN_WORKER 0x052C

class AddonData {
 public:
  static Local<Value> New(Isolate* isolate, Local<Object> exports) {
    return External::New(isolate, new AddonData(isolate, exports));
  }

  // returns true is successful
  bool AttachWindow() {
    HWND progman = FindWindowA("Progman", NULL);
    LRESULT result = SendMessageTimeout(progman, WM_SPAWN_WORKER, NULL, NULL,
                                        SMTO_NORMAL, 1000, NULL);

    if (!result) {
      return false;
    }

    BOOL success = EnumWindows(&FindWorkerW, reinterpret_cast<LPARAM>(&workerw));

    if ((!success && GetLastError() != 0x0) || !workerw) {
      return false;
    }

    success = SetWindowLongPtr(window_to_attach, GWL_EXSTYLE, GetWindowLongPtr(window_to_attach, GWL_EXSTYLE) | WS_EX_LAYERED);
    if (!success && GetLastError() != 0x0) {
      return false;
    }
    original_parent = SetParent(window_to_attach, workerw);
    if (!original_parent) {
      return false;
    }
    success = SetWindowPos(window_to_attach, NULL, offset_x, offset_y, width, height, 0);
    if (!success && GetLastError() != 0x0) {
      return false;
    }

    return true;
  }

  void SetWindowHandle(HWND handleBuffer) {
    window_to_attach = handleBuffer;
  }

  void SetOffset(int x, int y) {
    offset_x = x;
    offset_y = y;
  }

  void SetSize(int width, int height) {
    this->width = width;
    this->height = height;
  }


 private:
  HWND workerw;
  HWND original_parent;
  HWND window_to_attach;
  int offset_x, offset_y, width, height;

  explicit AddonData(Isolate* isolate, Local<Object> exports)
      : workerw(NULL), original_parent(NULL), window_to_attach(NULL), offset_x(0), offset_y(0), width(0), height(0) {
    exports_persistent.Reset(isolate, exports);
    exports_persistent.SetWeak(this, DeleteMe, WeakCallbackType::kParameter);
  }
  
  // finds the child of progman with class WorkerW that is a sibling of shelldll
  // must be passed to EnumWindows where the LPARAM is a pointer to the variable where the found handle should be stored
  static BOOL CALLBACK FindWorkerW(HWND hwnd, LPARAM param) {
    HWND shelldll = FindWindowExA(hwnd, NULL, "SHELLDLL_DefView", NULL);

    if (shelldll) {
        *reinterpret_cast<HWND*>(param) = FindWindowExA(hwnd, shelldll, "WorkerW", NULL);
        return FALSE;
    }

    return TRUE;
  }

  ~AddonData() { 
    SetParent(window_to_attach, original_parent);
    exports_persistent.Reset();
  }

  static void DeleteMe(const WeakCallbackInfo<AddonData>& info) {
    delete info.GetParameter();
  }

  Persistent<Object> exports_persistent;
};

void AttachWallpaper(const FunctionCallbackInfo<Value>& info) {
    Isolate *isolate = info.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();

    if (info.Length() < 5 ||
        !info[0]->IsObject() ||
        !info[1]->IsNumber() ||
        !info[2]->IsNumber() ||
        !info[3]->IsNumber() ||
        !info[4]->IsNumber()) {
        isolate->ThrowException(v8::Exception::TypeError(
        v8::String::NewFromUtf8Literal(isolate, "Invalid arguments.")));
        return;
    }

    AddonData* addon_data =
      static_cast<AddonData*>(info.Data().As<External>()->Value());
    
    if (!node::Buffer::HasInstance(info[0])) {
        isolate->ThrowException(v8::Exception::TypeError(
            v8::String::NewFromUtf8Literal(isolate, "The first argument must be a Buffer.")));
        return;
    }

    Local<Object> buffer_obj = info[0].As<Object>();
    char* buffer_data = node::Buffer::Data(buffer_obj);

    size_t buffer_length = node::Buffer::Length(buffer_obj);
    if (buffer_length != sizeof(HWND)) {
        isolate->ThrowException(v8::Exception::TypeError(
            v8::String::NewFromUtf8Literal(isolate, "Buffer is not the correct size for a window handle.")));
        return;
    }

    HWND window_handle = (HWND)(LONG_PTR)*reinterpret_cast<LONG_PTR *>(buffer_data);
    addon_data->SetWindowHandle(window_handle);

    Maybe<int32_t> maybe_offset_x = info[1]->Int32Value(context), maybe_offset_y = info[2]->Int32Value(context),
                  maybe_width = info[3]->Int32Value(context), maybe_height = info[4]->Int32Value(context);
    
    if (maybe_offset_x.IsNothing()) {
      isolate->ThrowException(v8::Exception::RangeError(
        v8::String::NewFromUtf8Literal(isolate, "OffsetX - Number out of 32-bit integer range.")));
      return;
    } else if (maybe_offset_y.IsNothing()) {
      isolate->ThrowException(v8::Exception::RangeError(
        v8::String::NewFromUtf8Literal(isolate, "OffsetY - Number out of 32-bit integer range.")));
      return;
    } else if (maybe_width.IsNothing()) {
      isolate->ThrowException(v8::Exception::RangeError(
        v8::String::NewFromUtf8Literal(isolate, "Width - Number out of 32-bit integer range.")));
      return;
    } else if (maybe_height.IsNothing()) {
      isolate->ThrowException(v8::Exception::RangeError(
        v8::String::NewFromUtf8Literal(isolate, "Height - Number out of 32-bit integer range.")));
      return;
    }

    addon_data->SetOffset(maybe_offset_x.FromJust(), maybe_offset_y.FromJust());
    addon_data->SetSize(maybe_width.FromJust(), maybe_height.FromJust());

    info.GetReturnValue().Set(addon_data->AttachWindow());
}

NODE_MODULE_INIT() {
  Isolate* isolate = context->GetIsolate();

  Local<Value> addon_data = AddonData::New(isolate, exports);
  
  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "attachWallpaper", NewStringType::kNormal)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, AttachWallpaper, addon_data)
                ->GetFunction(context)
                .ToLocalChecked())
      .FromJust();
}