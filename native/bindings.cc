/*
 * Copyright 2018 Robin Andersson <me@robinwassen.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ---------------------------------------------------------------
 *  
 * This file was modified on March the 6th 2021 by Kacper Stolarek
 * 
*/

#include <napi.h>

#include "./electronwallpaper.h"
#include "./mouseevents.h"
#include "./output.h"

namespace bindings {

  using Napi::Uint8Array;
  using Napi::Env;
  using Napi::CallbackInfo;
  using Napi::Object;
  using Napi::String;
  using Napi::Function;
  using Napi::Function;
  using Napi::Function;
  using electronwallpaper::AttachWindow;
  using mouseevents::createMouseForwarder;
  using Output::CreateError;

  void AttachWindowExport(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 5) {
      CreateError(env, "attachWindow expects five arguments").ThrowAsJavaScriptException();
    } else if (!info[0].IsObject()) {
      CreateError(env, "attachWindow expects first argument to be a window handle buffer").ThrowAsJavaScriptException();
    }
    if (!info[1].IsNumber()) {
      CreateError(env, "attachWindow expects the second argument to be a number(Offset X).").ThrowAsJavaScriptException();
    }
    if (!info[2].IsNumber()) {
      CreateError(env, "attachWindow expects the third argument to be a number(Offset Y).").ThrowAsJavaScriptException();
    }
    if (!info[3].IsNumber()) {
      CreateError(env, "attachWindow expects the fourth argument to be a number(Width).").ThrowAsJavaScriptException();
    }
    if (!info[4].IsNumber()) {
      CreateError(env, "attachWindow expects the fifth argument to be a number(Height).").ThrowAsJavaScriptException();
    }

    unsigned char* windowHandleBuffer = info[0].As<Uint8Array>().Data();
    int OffsetX = info[1].ToNumber();
    int OffsetY = info[2].ToNumber();
    int Width = info[3].ToNumber();
    int Height = info[4].ToNumber();

    AttachWindow(windowHandleBuffer, OffsetX, OffsetY, Width, Height);
  }

  void createMouseForwarderExport(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (info.Length() < 3) {
      CreateError(env, "move expects 3 arguments.").ThrowAsJavaScriptException();
    } else if (!info[0].IsObject()) {
      CreateError(env, "move expects first argument to be a window handle buffer").ThrowAsJavaScriptException();
    }
    if (!info[1].IsNumber()) {
      CreateError(env, "move expects the second argument to be a number(x).").ThrowAsJavaScriptException();
    }
    if (!info[2].IsNumber()) {
      CreateError(env, "move expects the third argument to be a number(y).").ThrowAsJavaScriptException();
    }

    unsigned char* windowHandleBuffer = info[0].As<Uint8Array>().Data();

    int offsetX = info[1].ToNumber();
    int offsetY = info[2].ToNumber();

    createMouseForwarder(windowHandleBuffer, offsetX, offsetY);
  }
  Object Initialize(Env env, Object exports) {
    exports.Set(String::New(env, "attachWindow"), Function::New(env, AttachWindowExport));
    exports.Set(String::New(env, "createMouseForwarder"), Function::New(env, createMouseForwarderExport));
    return exports;
  }
}  // namespace bindings

using bindings::Initialize;
NODE_API_MODULE(module_name, Initialize)