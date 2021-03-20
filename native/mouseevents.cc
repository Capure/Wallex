#include "./mouseevents.h"

#include "./cpusaver.h"

#include <windows.h>
#include <iostream>
#include <vector>

namespace mouseevents {
  HHOOK _hook;
  HANDLE _hThread;
  HWND slv_32;
  BOOL alreadyHooked = FALSE;

  struct EventData{
    int x;
    int y;
    HWND hwnd;
    BOOL stale = FALSE;
    // ^ This is a memory leak
    // every time you spawn a new wallpaper
    // this vector gets bigger
    // you cannot just delete the entry
    // cuz you will get a seg fault thanks to multiple threads accessing this vector at once
    // so one of them can still be using a pointer to the element you just deleted
    // honestly it's not that big of a deal cuz at the end of the day
    // thoes wallpapers are using electron
    // so you have too much memory anyways
  };

  std::vector<EventData>* eventData = new std::vector<EventData>();

  void Move(int x, int y) {
    for (auto i : *eventData) {
      if (i.stale) { continue; } // This could slow you down after a while
      LPARAM mousePosWallpaper = MAKELPARAM(x - i.x, y - i.y);
      PostMessageA(i.hwnd, WM_MOUSEMOVE,0 , mousePosWallpaper);
    }
  }

  void LMB_Down(int x, int y) {
    for (auto i : *eventData) {
      if (i.stale) { continue; } // This could slow you down after a while
      LPARAM mousePosWallpaper = MAKELPARAM(x - i.x, y - i.y);
      PostMessageA(i.hwnd, WM_LBUTTONDOWN, 0, mousePosWallpaper);
    }
  }

  void LMB_Up(int x, int y) {
    for (auto i : *eventData) {
      if (i.stale) { continue; } // This could slow you down after a while
      LPARAM mousePosWallpaper = MAKELPARAM(x - i.x, y - i.y);
      PostMessageA(i.hwnd, WM_LBUTTONUP, 0, mousePosWallpaper);
    }
  }

  LRESULT CALLBACK HookCallback(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
        MSLLHOOKSTRUCT *data = (MSLLHOOKSTRUCT *)lParam;
        if (WindowFromPoint(data->pt) != slv_32) {
            return CallNextHookEx(_hook, nCode, wParam, lParam);
        }
        auto x = data->pt.x;
        auto y = data->pt.y;

        if (wParam == WM_LBUTTONUP) {
            LMB_Up(x, y);
        } else if (wParam == WM_LBUTTONDOWN) {
            LMB_Down(x, y);
        } else if (wParam == WM_MOUSEMOVE) {
            Move(x, y);
        }
    }

    return CallNextHookEx(_hook, nCode, wParam, lParam);
  }

  inline void WinEventProc(HWINEVENTHOOK hWinEventHook,
                                DWORD         event,
                                HWND          hwnd,
                                LONG          idObject,
                                LONG          idChild,
                                DWORD         dwEventThread,
                                DWORD         dwmsEventTime) {
      if ( idObject == OBJID_WINDOW && idChild == CHILDID_SELF ) {
        for (int i = 0; i< eventData->size(); i++) {
          if ((*eventData)[i].hwnd == hwnd){
            (*eventData)[i].stale = TRUE;
          }
        }
      }
  }

  DWORD WINAPI ListenForWindowExit(LPVOID lpParam) {
    HWINEVENTHOOK hook = SetWinEventHook(EVENT_OBJECT_DESTROY,
                                         EVENT_OBJECT_DESTROY,
                                         NULL,
                                         WinEventProc,
                                         NULL,
                                         NULL,
                                         WINEVENT_OUTOFCONTEXT);
    
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
  }

  DWORD WINAPI MouseHookThread(LPVOID lpParam) {
    _hook = SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, 0);
    if (!alreadyHooked) {
      DWORD dThID;
      CreateThread(NULL, NULL, ListenForWindowExit, NULL, NULL, &dThID);
      alreadyHooked = TRUE;
    }

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
  }

  BOOL CALLBACK FindSysListView32(HWND hwnd, LPARAM param) {
    HWND shell_dll = FindWindowExA(hwnd, NULL, (LPCSTR)"SHELLDLL_DefView", NULL);

    if (shell_dll) {
        slv_32 = FindWindowExA(shell_dll, NULL, (LPCSTR)"SysListView32", NULL);
        return FALSE;
    }

    return TRUE;
  }

  void startMouseEvents() {
    DWORD dwThreadID;
    _hThread = CreateThread(NULL, 0, MouseHookThread, NULL, 0, &dwThreadID);
  }

  void createMouseForwarder(unsigned char* handleBuffer, int offsetX, int offsetY) {
    LONG_PTR handle = *reinterpret_cast<LONG_PTR*>(handleBuffer);
    HWND hwnd = (HWND)(LONG_PTR)handle;

    EventData newEventData;
    newEventData.x = offsetX;
    newEventData.y = offsetY;
    newEventData.hwnd = hwnd;

    eventData->push_back(newEventData);

    if (!alreadyHooked) {
      EnumWindows(&FindSysListView32, NULL);    
      startMouseEvents();
    }
  }
}
