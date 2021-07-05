#include <iostream>
#include <vector>
#include <windows.h>

namespace cpusaver {
RECT rect;
DWORD thId;
BOOL isListeningForExit = FALSE;

struct WindowSize {
  int height;
  int width;
};

class CpuSaverThreadData {
public: // TODO: unfuck this
  HWND main_window_handle;
  BOOL minimized = FALSE;
  BOOL windowIsOpen = TRUE;
  BOOL isVideoPlayer = FALSE;
  WindowSize main_window_size;
  int offset_x = 0;
  int offset_y = 0;
};

struct WindowDataPair {
  HWND hwnd;
  HANDLE saver_thread;
  CpuSaverThreadData *data;
};

std::vector<WindowDataPair> openWindows;

void Minimize(HWND hwnd) {
  WINDOWPLACEMENT window_placement;
  GetWindowPlacement(hwnd, &window_placement);
  window_placement.showCmd = SW_SHOWMINIMIZED;
  SetWindowPlacement(hwnd, &window_placement);
}

void Maximize(HWND hwnd) {
  WINDOWPLACEMENT window_placement;
  GetWindowPlacement(hwnd, &window_placement);
  window_placement.showCmd = SW_RESTORE;
  SetWindowPlacement(hwnd, &window_placement);
}

void PauseVideoPlayer(CpuSaverThreadData data) {
  POINT middle;
  middle.x = (data.main_window_size.width / 2) + data.offset_x;
  middle.y = (data.main_window_size.height / 2) + data.offset_y;
  SendMessage(data.main_window_handle, WM_RBUTTONDOWN, NULL,
              MAKELPARAM(middle.x, middle.y));
  SendMessage(data.main_window_handle, WM_RBUTTONUP, NULL,
              MAKELPARAM(middle.x, middle.y));
}

void ResumeVideoPlayer(CpuSaverThreadData data) {
  POINT middle;
  middle.x = (data.main_window_size.width / 2) + data.offset_x;
  middle.y = (data.main_window_size.height / 2) + data.offset_y;
  SendMessage(data.main_window_handle, WM_LBUTTONDOWN, NULL,
              MAKELPARAM(middle.x, middle.y));
  SendMessage(data.main_window_handle, WM_LBUTTONUP, NULL,
              MAKELPARAM(middle.x, middle.y));
}

BOOL CheckForFullscreen(CpuSaverThreadData *data) {
  POINT middle;
  middle.x = (data->main_window_size.width / 2) + data->offset_x;
  middle.y = (data->main_window_size.height / 2) + data->offset_y;
  HWND middleWindow = WindowFromPoint(middle);
  HWND parentOfMiddle = GetParent(middleWindow);
  if (parentOfMiddle) {
    middleWindow = parentOfMiddle;
  }

  RECT middleRect;
  GetWindowRect(middleWindow, &middleRect);
  int width = middleRect.right - middleRect.left;
  int height = middleRect.bottom - middleRect.top;
  if (middleWindow == GetDesktopWindow()) {
    return FALSE;
  }

  char className[256];
  GetClassNameA(middleWindow, className, 256);

  if (!strcmp(className, "SHELLDLL_DefView") ||
      !strcmp(className, "SysListView32")) {
    return FALSE;
  }
  if (height >= data->main_window_size.height &&
      width >= data->main_window_size.width) {
    return TRUE;
  }
  return FALSE;
}

inline void WinEventProc(HWINEVENTHOOK hWinEventHook, DWORD event, HWND hwnd,
                         LONG idObject, LONG idChild, DWORD dwEventThread,
                         DWORD dwmsEventTime) {
  if (idObject == OBJID_WINDOW && idChild == CHILDID_SELF) {
    for (int i = 0; i < openWindows.size(); i++) {
      if (openWindows[i].hwnd == hwnd) {
        TerminateThread(openWindows[i].saver_thread, NULL);
        delete openWindows[i].data;
        openWindows.erase(openWindows.begin() + i);
      }
    }
  }
}

DWORD WINAPI ListenForWindowExit(LPVOID lpParam) {
  HWINEVENTHOOK hook =
      SetWinEventHook(EVENT_OBJECT_DESTROY, EVENT_OBJECT_DESTROY, NULL,
                      WinEventProc, NULL, NULL, WINEVENT_OUTOFCONTEXT);

  MSG msg;
  while (GetMessage(&msg, NULL, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  UnhookWinEvent(hook);

  return 0;
}

DWORD WINAPI CpuSaverThread(LPVOID lParam) {
  CpuSaverThreadData &cpuSaverData =
      *reinterpret_cast<CpuSaverThreadData *>(lParam);
  while (cpuSaverData.windowIsOpen) {
    if (CheckForFullscreen(&cpuSaverData)) {
      if (!cpuSaverData.minimized) {
        cpuSaverData.isVideoPlayer ? PauseVideoPlayer(cpuSaverData)
                                   : Minimize(cpuSaverData.main_window_handle);
        cpuSaverData.minimized = TRUE;
      }
    } else {
      if (cpuSaverData.minimized) {
        cpuSaverData.isVideoPlayer ? ResumeVideoPlayer(cpuSaverData)
                                   : Maximize(cpuSaverData.main_window_handle);
        cpuSaverData.minimized = FALSE;
      }
    }
    Sleep(100);
  }
  return 0;
}

void AttachSaver(unsigned char *handleBuffer, bool isVideoPlayer, int OffsetX,
                 int OffsetY, int SafeWidth, int SafeHeight) {
  LONG_PTR handle = *reinterpret_cast<LONG_PTR *>(handleBuffer);
  HWND hwnd = (HWND)(LONG_PTR)handle;
  CpuSaverThreadData *cpuSaverData = new CpuSaverThreadData();
  cpuSaverData->main_window_handle = hwnd;
  cpuSaverData->main_window_size.width = SafeWidth;
  cpuSaverData->main_window_size.height = SafeHeight;
  cpuSaverData->isVideoPlayer = isVideoPlayer;
  cpuSaverData->offset_x = OffsetX;
  cpuSaverData->offset_y = OffsetY;
  if (!isListeningForExit) {
    DWORD dThID;
    CreateThread(NULL, NULL, ListenForWindowExit, NULL, NULL, &dThID);
  }
  HANDLE saver_thread = CreateThread(NULL, NULL, CpuSaverThread,
                                     (LPVOID)cpuSaverData, NULL, &thId);
  WindowDataPair windowDataPair;
  windowDataPair.hwnd = hwnd;
  windowDataPair.data = cpuSaverData;
  openWindows.push_back(windowDataPair);
}
} // namespace cpusaver