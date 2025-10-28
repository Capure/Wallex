/*
 * For reference look at: https://github.com/nodejs/node-addon-examples/tree/main/src/3-context-awareness/node_10
 */
#include <math.h>
#include <node.h>
#include <node_buffer.h>
#include <windows.h>
#include <vector>

using namespace v8;

// Message to Progman to spawn a WorkerW
#define WM_SPAWN_WORKER 0x052C

struct EventData {
  int x;
  int y;
  HWND hwnd;
};

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

    return CreateMouseForwarder();
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
  HWND sys_list_view_32;
  HHOOK mouse_hook;
  HANDLE mouse_hook_thread;
  bool win_exit_already_hooked;
  std::vector<EventData> mouse_events;
  int offset_x, offset_y, width, height;
  // this is a hack to access instance of this class from within winapi callbacks
  static inline AddonData* instance;

  explicit AddonData(Isolate* isolate, Local<Object> exports)
      : workerw(NULL), original_parent(NULL), window_to_attach(NULL),
        sys_list_view_32(NULL), mouse_hook(NULL), mouse_hook_thread(NULL), mouse_events(),
        offset_x(0), offset_y(0), width(0), height(0), win_exit_already_hooked(false) {
    instance = this;
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

  // finds SysListView32 which is what the user clicks on when clicking on the desktop
  static BOOL CALLBACK FindSysListView32(HWND hwnd, LPARAM param) {
    HWND shelldll = FindWindowExA(hwnd, NULL, "SHELLDLL_DefView", NULL);

    if (shelldll) {
        *reinterpret_cast<HWND*>(param) = FindWindowExA(shelldll, NULL, "SysListView32", NULL);
        return FALSE;
    }

    return TRUE;
  }
  
  static inline void SendMouseMsg(WPARAM message_type, int x, int y) {
    for (auto i : instance->mouse_events) {
      LPARAM mousePosWallpaper = MAKELPARAM(x - i.x, y - i.y);
      PostMessageA(i.hwnd, message_type, 0, mousePosWallpaper);
    }
  }

  static inline LRESULT CALLBACK HookCallback(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
      MSLLHOOKSTRUCT *data = (MSLLHOOKSTRUCT *)lParam;
      if (WindowFromPoint(data->pt) != instance->sys_list_view_32) {
        return CallNextHookEx(instance->mouse_hook, nCode, wParam, lParam);
      }

      auto x = data->pt.x;
      auto y = data->pt.y;

      if (wParam == WM_LBUTTONUP || wParam == WM_LBUTTONDOWN || wParam == WM_MOUSEMOVE) {
        SendMouseMsg(wParam, x, y);
      }
    }

    return CallNextHookEx(instance->mouse_hook, nCode, wParam, lParam);
  }

  // clears out data for a given window on exit
  static inline void WinEventProc(HWINEVENTHOOK hWinEventHook, DWORD event, HWND hwnd,
                          LONG idObject, LONG idChild, DWORD dwEventThread,
                          DWORD dwmsEventTime) {
    if (idObject == OBJID_WINDOW && idChild == CHILDID_SELF) {
      for (int i = 0; i < instance->mouse_events.size(); i++) {
        if (instance->mouse_events[i].hwnd == hwnd) {
          SuspendThread(instance->mouse_hook_thread);
          instance->mouse_events.erase(instance->mouse_events.begin() + i);
          ResumeThread(instance->mouse_hook_thread);
        }
      }
    }
  }

  static inline DWORD WINAPI ListenForWindowExit(LPVOID lpParam) {
    HWINEVENTHOOK hook =
        SetWinEventHook(EVENT_OBJECT_DESTROY, EVENT_OBJECT_DESTROY, NULL,
                        WinEventProc, NULL, NULL, WINEVENT_OUTOFCONTEXT);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }

    return 0;
  }

  static inline DWORD WINAPI MouseHookThread(LPVOID lpParam) {
    *reinterpret_cast<HHOOK*>(lpParam) = SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, NULL);

    if (!*reinterpret_cast<HHOOK*>(lpParam) && GetLastError != 0x0) {
      return TRUE;
    }

    if (!instance->win_exit_already_hooked) {
      DWORD dThID;
      HANDLE thread = CreateThread(NULL, NULL, ListenForWindowExit, NULL, NULL, &dThID);
      if (!thread) {
        return TRUE;
      }
      instance->win_exit_already_hooked = true;
    }

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }

    return FALSE;
  }

  bool CreateMouseForwarder() {
    EventData initialEvent;
    initialEvent.x = offset_x;
    initialEvent.y = offset_y;
    initialEvent.hwnd = window_to_attach;

    mouse_events.push_back(initialEvent);

    EnumWindows(&FindSysListView32, reinterpret_cast<LPARAM>(&sys_list_view_32));
    if (!sys_list_view_32) {
      return false;
    }

    DWORD dwThreadID;
    mouse_hook_thread = CreateThread(NULL, 0, MouseHookThread, reinterpret_cast<LPVOID>(&mouse_hook), 0, &dwThreadID);

    if (!mouse_hook_thread) {
      return false;
    }

    return true;
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