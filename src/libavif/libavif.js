// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary;

if (ENVIRONMENT_IS_NODE) {

  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');
  var nodePath = require('path');

  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = nodePath.dirname(scriptDirectory) + '/';
  } else {
    scriptDirectory = __dirname + '/';
  }

// include: node_shell_read.js
read_ = (filename, binary) => {
  // We need to re-wrap `file://` strings to URLs. Normalizing isn't
  // necessary in that case, the path should already be absolute.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return fs.readFileSync(filename, binary ? undefined : 'utf8');
};

readBinary = (filename) => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
    ret = new Uint8Array(ret);
  }
  return ret;
};

readAsync = (filename, onload, onerror, binary = true) => {
  // See the comment in the `read_` function.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
    if (err) onerror(err);
    else onload(binary ? data.buffer : data);
  });
};
// end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  process.on('uncaughtException', (ex) => {
    // suppress ExitStatus exceptions from showing an error
    if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
      throw ex;
    }
  });

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = '';
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  }

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js
read_ = (url) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }
} else
{
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];

if (Module['thisProgram']) thisProgram = Module['thisProgram'];

if (Module['quit']) quit_ = Module['quit'];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary; 
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];

// include: wasm2js.js
// wasm2js.js - enough of a polyfill for the WebAssembly object so that we can load
// wasm2js code that way.

// Emit "var WebAssembly" if definitely using wasm2js. Otherwise, in MAYBE_WASM2JS
// mode, we can't use a "var" since it would prevent normal wasm from working.
/** @suppress{duplicate, const} */
var
WebAssembly = {
  // Note that we do not use closure quoting (this['buffer'], etc.) on these
  // functions, as they are just meant for internal use. In other words, this is
  // not a fully general polyfill.
  /** @constructor */
  Memory: function(opts) {
    this.buffer = new ArrayBuffer(opts['initial'] * 65536);
  },

  Module: function(binary) {
    // TODO: use the binary and info somehow - right now the wasm2js output is embedded in
    // the main JS
  },

  /** @constructor */
  Instance: function(module, info) {
    // TODO: use the module somehow - right now the wasm2js output is embedded in
    // the main JS
    // This will be replaced by the actual wasm2js code.
    this.exports = (
function instantiate(info) {
function Table(ret) {
  // grow method not included; table is not growable
  ret.set = function(i, func) {
    this[i] = func;
  };
  ret.get = function(i) {
    return this[i];
  };
  return ret;
}

  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 65536, "T3V0IG9mIG1lbW9yeQBhdmlmRGVjb2RlclNldElPTWVtb3J5AC0rICAgMFgweAAtMFgrMFggMFgtMHgrMHggMHgAIXNyY1JvdyA9PSAhZHN0Um93AGZyb250AE5vIGNvbnRlbnQASW52YWxpZCBhcmd1bWVudABJdGVtIElEICV1IHJlYWQgaGFzIG92ZXJmbG93aW5nIG9mZnNldABJTyBub3Qgc2V0AHNyY0ltYWdlLT55dXZGb3JtYXQgPT0gZHN0SW1hZ2UtPnl1dkZvcm1hdABJdGVtIElEICV1IGhhcyB6ZXJvIGV4dGVudHMAaXRlbS0+b3duc01lcmdlZEV4dGVudHMAQWxwaGEgcGxhbmUgZGltZW5zaW9ucyBkbyBub3QgbWF0Y2ggY29sb3IgcGxhbmUgZGltZW5zaW9ucwBQbGFuZSBzaXplcyBkb24ndCBtYXRjaCBpc3BlIHZhbHVlcwBJdGVtIElEICV1IHRyaWVkIHRvIHJlYWQgJXp1IGJ5dGVzLCBidXQgb25seSByZWNlaXZlZCAlenUgYnl0ZXMASXRlbSBJRCAldSBoYXMgJXp1IHVuZXhwZWN0ZWQgdHJhaWxpbmcgYnl0ZXMAYXZpZkRlY29kZXJEYXRhQWxsb2NhdGVHcmlkSW1hZ2VQbGFuZXMAYXZpZkltYWdlQ29weVNhbXBsZXMAR3JpZCBpbWFnZSBjb250YWlucyBtaXNtYXRjaGVkIHRpbGVzAGF2aWZEZWNvZGVyRGVjb2RlVGlsZXMAVGhlIGltYWdlIGlzIGluY29tcGF0aWJsZSB3aXRoIGFscmVhZHkgZW5jb2RlZCBpbWFnZXMAQWxsb2NhdGlvbiBvZiBZVVYgcGxhbmVzIGZhaWxlZDogJXMAQWxsb2NhdGlvbiBvZiBhbHBoYSBwbGFuZSBmYWlsZWQ6ICVzAFVua25vd24gRXJyb3IASU8gRXJyb3IASXRlbSBJRCAldSBoYXMgaW1wb3NzaWJsZSBleHRlbnQgb2Zmc2V0IGluIGlkYXQgYnVmZmVyAEl0ZW0gSUQgJXUgaGFzIGltcG9zc2libGUgZXh0ZW50IHNpemUgaW4gaWRhdCBidWZmZXIASW52YWxpZCBmdHlwAGlvAEludmFsaWQgY29kZWMtc3BlY2lmaWMgb3B0aW9uAG5hbgBNaXNzaW5nIG9yIGVtcHR5IGltYWdlIGl0ZW0AZGVjb2Rlci0+YWxsb3dJbmNyZW1lbnRhbABzcmNJbWFnZS0+ZGVwdGggPT0gZHN0SW1hZ2UtPmRlcHRoAFRoZSBjb2xvciBpbWFnZSBpdGVtIGRvZXMgbm90IG1hdGNoIHRoZSBhbHBoYSBpbWFnZSBpdGVtIGluIHdpZHRoLCBoZWlnaHQsIG9yIGJpdCBkZXB0aABVbnN1cHBvcnRlZCBkZXB0aABDb2xvciBhbmQgYWxwaGEgcGxhbmVzIHNpemUgbWlzbWF0Y2gATm8gaW1hZ2VzIHJlbWFpbmluZwBDYW5ub3QgY2hhbmdlIHNvbWUgc2V0dGluZyBkdXJpbmcgZW5jb2RpbmcAaW5mAEltYWdlIGFsbG9jYXRpb24gZmFpbHVyZQBObyBjb2RlYyBhdmFpbGFibGUAYXZpZkRlY29kZXJOZXh0SW1hZ2UAYXZpZkRlY29kZXJEYXRhQ29weVRpbGVUb0ltYWdlAEl0ZW0gSUQgJXUgaXMgc3RvcmVkIGluIGFuIGlkYXQsIGJ1dCBubyBhc3NvY2lhdGVkIGlkYXQgYm94IHdhcyBmb3VuZABJbnZhbGlkIGltYWdlIGdyaWQATm90IGltcGxlbWVudGVkAE5vIFlVViBmb3JtYXQgc2VsZWN0ZWQAUmVmb3JtYXQgZmFpbGVkAEVuY29kaW5nIG9mIGNvbG9yIHBsYW5lcyBmYWlsZWQARGVjb2Rpbmcgb2YgY29sb3IgcGxhbmVzIGZhaWxlZABCTUZGIHBhcnNpbmcgZmFpbGVkAEVuY29kaW5nIG9mIGFscGhhIHBsYW5lIGZhaWxlZABEZWNvZGluZyBvZiBhbHBoYSBwbGFuZSBmYWlsZWQAYXZpZkltYWdlTGltaXRlZFRvRnVsbEFscGhhIGZhaWxlZABhdmlmSW1hZ2VTY2FsZSgpIGZhaWxlZAB0aWxlLT5jb2RlYy0+Z2V0TmV4dEltYWdlKCkgZmFpbGVkAEludmFsaWQgRXhpZiBwYXlsb2FkAGF2aWZEZWNvZGVySXRlbVJlYWQAZGF2MWQAL2hvbWUvamFuZS9saWJhdmlmLmpzL2xpYmF2aWYtMS4wLjQvc3JjL2F2aWYuYwAvaG9tZS9qYW5lL2xpYmF2aWYuanMvbGliYXZpZi0xLjAuNC9zcmMvcmVhZC5jAFRydW5jYXRlZCBkYXRhAGF2aWZJbWFnZVNjYWxlIHJlcXVlc3RlZCBpbnZhbGlkIGRzdCBkaW1lbnNpb25zIFsldXgldV0AYXZpZkltYWdlU2NhbGUgcmVxdWVzdGVkIGRzdCBkaW1lbnNpb25zIHRoYXQgYXJlIHRvbyBsYXJnZSBbJXV4JXVdAGF2aWZJbWFnZVNjYWxlIHJlcXVlc3RlZCBpbnZhbGlkIGhlaWdodCBzY2FsZSBmb3IgbGlieXV2IFsldSAtPiAldV0AYXZpZkltYWdlU2NhbGUgcmVxdWVzdGVkIGludmFsaWQgd2lkdGggc2NhbGUgZm9yIGxpYnl1diBbJXUgLT4gJXVdAFdhaXRpbmcgb24gSU8ATkFOAE9LAElORgBBVklGX0ZBTFNFAHRpbGUtPmltYWdlLT55dXZGb3JtYXQgPT0gQVZJRl9QSVhFTF9GT1JNQVRfTk9ORQBJdGVtIElEICV1IGV4dGVudCBvZmZzZXQgZmFpbGVkIHNpemUgaGludCBzYW5pdHkgY2hlY2suIFRydW5jYXRlZCBkYXRhPwBJdGVtIElEICV1IHJlcG9ydGVkIHNpemUgZmFpbGVkIHNpemUgaGludCBzYW5pdHkgY2hlY2suIFRydW5jYXRlZCBkYXRhPwAxLjAuNABHcmlkIGltYWdlIHdpZHRoICgldSkgb3IgaGVpZ2h0ICgldSkgb3IgdGlsZSB3aWR0aCAoJXUpIG9yIGhlaWdodCAoJXUpIHNoYWxsIGJlIGV2ZW4gaWYgY2hyb21hIGlzIHN1YnNhbXBsZWQgaW4gdGhhdCBkaW1lbnNpb24uIFNlZSBNSUFGIChJU08vSUVDIDIzMDAwLTIyOjIwMTkpLCBTZWN0aW9uIDcuMy4xMS40LjIAR3JpZCBpbWFnZSB0aWxlIHdpZHRoICgldSkgb3IgaGVpZ2h0ICgldSkgY2Fubm90IGJlIHNtYWxsZXIgdGhhbiA2NC4gU2VlIE1JQUYgKElTTy9JRUMgMjMwMDAtMjI6MjAxOSksIFNlY3Rpb24gNy4zLjExLjQuMgBHcmlkIGltYWdlIHRpbGVzIGluIHRoZSByaWdodG1vc3QgY29sdW1uIGFuZCBib3R0b21tb3N0IHJvdyBkbyBub3Qgb3ZlcmxhcCB0aGUgcmVjb25zdHJ1Y3RlZCBpbWFnZSBncmlkIGNhbnZhcy4gU2VlIE1JQUYgKElTTy9JRUMgMjMwMDAtMjI6MjAxOSksIFNlY3Rpb24gNy4zLjExLjQuMiwgRmlndXJlIDIAaW5mby0+dGlsZUNvdW50ID09IDEAdGlsZUluZGV4ID09IDAALgBkZWNvZGVyLT5kYXRhLT50aWxlcy5jb3VudCA9PSAoZGVjb2Rlci0+ZGF0YS0+Y29sb3IudGlsZUNvdW50ICsgZGVjb2Rlci0+ZGF0YS0+YWxwaGEudGlsZUNvdW50KQAobnVsbCkAcGxhbmVIZWlnaHQgPT0gYXZpZkltYWdlUGxhbmVIZWlnaHQoZHN0SW1hZ2UsIGMpAHBsYW5lV2lkdGggPT0gYXZpZkltYWdlUGxhbmVXaWR0aChkc3RJbWFnZSwgYykAKHByZXBhcmVDb2xvclRpbGVSZXN1bHQgPT0gQVZJRl9SRVNVTFRfV0FJVElOR19PTl9JTykgfHwgKHByZXBhcmVBbHBoYVRpbGVSZXN1bHQgPT0gQVZJRl9SRVNVTFRfV0FJVElOR19PTl9JTykAKHByZXBhcmVDb2xvclRpbGVSZXN1bHQgPT0gQVZJRl9SRVNVTFRfT0spICYmIChwcmVwYXJlQWxwaGFUaWxlUmVzdWx0ID09IEFWSUZfUkVTVUxUX09LKQBHcmlkIGltYWdlIHRpbGVzIGRvIG5vdCBjb21wbGV0ZWx5IGNvdmVyIHRoZSBpbWFnZSAoSEVJRiAoSVNPL0lFQyAyMzAwOC0xMjoyMDE3KSwgU2VjdGlvbiA2LjYuMi4zLjEpAAAAAAAZAAoAGRkZAAAAAAUAAAAAAAAJAAAAAAsAAAAAAAAAABkAEQoZGRkDCgcAAQAJCxgAAAkGCwAACwAGGQAAABkZGQAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAZAAoNGRkZAA0AAAIACQ4AAAAJAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAEwAAAAATAAAAAAkMAAAAAAAMAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA8AAAAEDwAAAAAJEAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAARAAAAABEAAAAACRIAAAAAABIAABIAABoAAAAaGhoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGgAAABoaGgAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAABcAAAAAFwAAAAAJFAAAAAAAFAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAAAAAAAAAAAAAAAVAAAAABUAAAAACRYAAAAAABYAABYAADAxMjM0NTY3ODlBQkNERUY=");
  base64DecodeToExistingUint8Array(bufferView, 69360, "4BEBAAAAAAAAAAAAAAAAAAIAAAABAAAAtAYBAAkAAAAKAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
}

  var scratchBuffer = new ArrayBuffer(16);
  var i32ScratchView = new Int32Array(scratchBuffer);
  var f32ScratchView = new Float32Array(scratchBuffer);
  var f64ScratchView = new Float64Array(scratchBuffer);
  
  function wasm2js_scratch_load_i32(index) {
    return i32ScratchView[index];
  }
      
  function wasm2js_scratch_store_i32(index, value) {
    i32ScratchView[index] = value;
  }
      
  function wasm2js_scratch_load_f64() {
    return f64ScratchView[0];
  }
      
  function wasm2js_scratch_store_f64(value) {
    f64ScratchView[0] = value;
  }
      function wasm2js_trap() { throw new Error('abort'); }

function asmFunc(imports) {
 var buffer = new ArrayBuffer(16777216);
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var env = imports.env;
 var fimport$0 = env.emscripten_resize_heap;
 var fimport$1 = env.emscripten_memcpy_js;
 var fimport$2 = env.abort;
 var fimport$3 = env.__assert_fail;
 var fimport$4 = env.dav1d_version;
 var fimport$5 = env.dav1d_default_settings;
 var fimport$6 = env.dav1d_open;
 var fimport$7 = env.dav1d_data_wrap;
 var fimport$8 = env.dav1d_send_data;
 var fimport$9 = env.dav1d_data_unref;
 var fimport$10 = env.dav1d_get_picture;
 var fimport$11 = env.dav1d_picture_unref;
 var fimport$12 = env.dav1d_close;
 var fimport$13 = env.ScalePlane_12;
 var fimport$14 = env.ScalePlane;
 var global$0 = 65536;
 var __wasm_intrinsics_temp_i64 = 0;
 var __wasm_intrinsics_temp_i64$hi = 0;
 var i64toi32_i32$HIGH_BITS = 0;
 // EMSCRIPTEN_START_FUNCS
;
 function $0() {
  $26();
 }
 
 function $1() {
  return __wasm_memory_size() << 16 | 0 | 0;
 }
 
 function $2() {
  return 69424 | 0;
 }
 
 function $3($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $1_1 = HEAP32[(0 + 69360 | 0) >> 2] | 0;
  $2_1 = ($0_1 + 7 | 0) & -8 | 0;
  $0_1 = $1_1 + $2_1 | 0;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!$2_1) {
      break label$3
     }
     if ($0_1 >>> 0 <= $1_1 >>> 0) {
      break label$2
     }
    }
    if ($0_1 >>> 0 <= ($1() | 0) >>> 0) {
     break label$1
    }
    if (fimport$0($0_1 | 0) | 0) {
     break label$1
    }
   }
   (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = 48), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
   return -1 | 0;
  }
  HEAP32[(0 + 69360 | 0) >> 2] = $0_1;
  return $1_1 | 0;
 }
 
 function $4($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $3_1 = 0, $5_1 = 0;
  label$1 : {
   if ($2_1 >>> 0 < 512 >>> 0) {
    break label$1
   }
   fimport$1($0_1 | 0, $1_1 | 0, $2_1 | 0);
   return $0_1 | 0;
  }
  $3_1 = $0_1 + $2_1 | 0;
  label$2 : {
   label$3 : {
    if (($1_1 ^ $0_1 | 0) & 3 | 0) {
     break label$3
    }
    label$4 : {
     label$5 : {
      if ($0_1 & 3 | 0) {
       break label$5
      }
      $2_1 = $0_1;
      break label$4;
     }
     label$6 : {
      if ($2_1) {
       break label$6
      }
      $2_1 = $0_1;
      break label$4;
     }
     $2_1 = $0_1;
     label$7 : while (1) {
      HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
      $1_1 = $1_1 + 1 | 0;
      $2_1 = $2_1 + 1 | 0;
      if (!($2_1 & 3 | 0)) {
       break label$4
      }
      if ($2_1 >>> 0 < $3_1 >>> 0) {
       continue label$7
      }
      break label$7;
     };
    }
    label$8 : {
     $4_1 = $3_1 & -4 | 0;
     if ($4_1 >>> 0 < 64 >>> 0) {
      break label$8
     }
     $5_1 = $4_1 + -64 | 0;
     if ($2_1 >>> 0 > $5_1 >>> 0) {
      break label$8
     }
     label$9 : while (1) {
      HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
      HEAP32[($2_1 + 4 | 0) >> 2] = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
      HEAP32[($2_1 + 8 | 0) >> 2] = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
      HEAP32[($2_1 + 12 | 0) >> 2] = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
      HEAP32[($2_1 + 16 | 0) >> 2] = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
      HEAP32[($2_1 + 20 | 0) >> 2] = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
      HEAP32[($2_1 + 24 | 0) >> 2] = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
      HEAP32[($2_1 + 28 | 0) >> 2] = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
      HEAP32[($2_1 + 32 | 0) >> 2] = HEAP32[($1_1 + 32 | 0) >> 2] | 0;
      HEAP32[($2_1 + 36 | 0) >> 2] = HEAP32[($1_1 + 36 | 0) >> 2] | 0;
      HEAP32[($2_1 + 40 | 0) >> 2] = HEAP32[($1_1 + 40 | 0) >> 2] | 0;
      HEAP32[($2_1 + 44 | 0) >> 2] = HEAP32[($1_1 + 44 | 0) >> 2] | 0;
      HEAP32[($2_1 + 48 | 0) >> 2] = HEAP32[($1_1 + 48 | 0) >> 2] | 0;
      HEAP32[($2_1 + 52 | 0) >> 2] = HEAP32[($1_1 + 52 | 0) >> 2] | 0;
      HEAP32[($2_1 + 56 | 0) >> 2] = HEAP32[($1_1 + 56 | 0) >> 2] | 0;
      HEAP32[($2_1 + 60 | 0) >> 2] = HEAP32[($1_1 + 60 | 0) >> 2] | 0;
      $1_1 = $1_1 + 64 | 0;
      $2_1 = $2_1 + 64 | 0;
      if ($2_1 >>> 0 <= $5_1 >>> 0) {
       continue label$9
      }
      break label$9;
     };
    }
    if ($2_1 >>> 0 >= $4_1 >>> 0) {
     break label$2
    }
    label$10 : while (1) {
     HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
     $1_1 = $1_1 + 4 | 0;
     $2_1 = $2_1 + 4 | 0;
     if ($2_1 >>> 0 < $4_1 >>> 0) {
      continue label$10
     }
     break label$2;
    };
   }
   label$11 : {
    if ($3_1 >>> 0 >= 4 >>> 0) {
     break label$11
    }
    $2_1 = $0_1;
    break label$2;
   }
   label$12 : {
    $4_1 = $3_1 + -4 | 0;
    if ($4_1 >>> 0 >= $0_1 >>> 0) {
     break label$12
    }
    $2_1 = $0_1;
    break label$2;
   }
   $2_1 = $0_1;
   label$13 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    HEAP8[($2_1 + 1 | 0) >> 0] = HEAPU8[($1_1 + 1 | 0) >> 0] | 0;
    HEAP8[($2_1 + 2 | 0) >> 0] = HEAPU8[($1_1 + 2 | 0) >> 0] | 0;
    HEAP8[($2_1 + 3 | 0) >> 0] = HEAPU8[($1_1 + 3 | 0) >> 0] | 0;
    $1_1 = $1_1 + 4 | 0;
    $2_1 = $2_1 + 4 | 0;
    if ($2_1 >>> 0 <= $4_1 >>> 0) {
     continue label$13
    }
    break label$13;
   };
  }
  label$14 : {
   if ($2_1 >>> 0 >= $3_1 >>> 0) {
    break label$14
   }
   label$15 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    $1_1 = $1_1 + 1 | 0;
    $2_1 = $2_1 + 1 | 0;
    if (($2_1 | 0) != ($3_1 | 0)) {
     continue label$15
    }
    break label$15;
   };
  }
  return $0_1 | 0;
 }
 
 function $5($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, i64toi32_i32$0 = 0, $4_1 = 0, i64toi32_i32$1 = 0, $6_1 = 0, $5_1 = 0, $6$hi = 0;
  label$1 : {
   if (!$2_1) {
    break label$1
   }
   HEAP8[$0_1 >> 0] = $1_1;
   $3_1 = $0_1 + $2_1 | 0;
   HEAP8[($3_1 + -1 | 0) >> 0] = $1_1;
   if ($2_1 >>> 0 < 3 >>> 0) {
    break label$1
   }
   HEAP8[($0_1 + 2 | 0) >> 0] = $1_1;
   HEAP8[($0_1 + 1 | 0) >> 0] = $1_1;
   HEAP8[($3_1 + -3 | 0) >> 0] = $1_1;
   HEAP8[($3_1 + -2 | 0) >> 0] = $1_1;
   if ($2_1 >>> 0 < 7 >>> 0) {
    break label$1
   }
   HEAP8[($0_1 + 3 | 0) >> 0] = $1_1;
   HEAP8[($3_1 + -4 | 0) >> 0] = $1_1;
   if ($2_1 >>> 0 < 9 >>> 0) {
    break label$1
   }
   $4_1 = (0 - $0_1 | 0) & 3 | 0;
   $3_1 = $0_1 + $4_1 | 0;
   $1_1 = Math_imul($1_1 & 255 | 0, 16843009);
   HEAP32[$3_1 >> 2] = $1_1;
   $4_1 = ($2_1 - $4_1 | 0) & -4 | 0;
   $2_1 = $3_1 + $4_1 | 0;
   HEAP32[($2_1 + -4 | 0) >> 2] = $1_1;
   if ($4_1 >>> 0 < 9 >>> 0) {
    break label$1
   }
   HEAP32[($3_1 + 8 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 4 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -8 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -12 | 0) >> 2] = $1_1;
   if ($4_1 >>> 0 < 25 >>> 0) {
    break label$1
   }
   HEAP32[($3_1 + 24 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 20 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 16 | 0) >> 2] = $1_1;
   HEAP32[($3_1 + 12 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -16 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -20 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -24 | 0) >> 2] = $1_1;
   HEAP32[($2_1 + -28 | 0) >> 2] = $1_1;
   $5_1 = $3_1 & 4 | 0 | 24 | 0;
   $2_1 = $4_1 - $5_1 | 0;
   if ($2_1 >>> 0 < 32 >>> 0) {
    break label$1
   }
   i64toi32_i32$0 = 0;
   i64toi32_i32$1 = 1;
   i64toi32_i32$1 = __wasm_i64_mul($1_1 | 0, i64toi32_i32$0 | 0, 1 | 0, i64toi32_i32$1 | 0) | 0;
   i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
   $6_1 = i64toi32_i32$1;
   $6$hi = i64toi32_i32$0;
   $1_1 = $3_1 + $5_1 | 0;
   label$2 : while (1) {
    i64toi32_i32$0 = $6$hi;
    i64toi32_i32$1 = $1_1;
    HEAP32[($1_1 + 24 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 28 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1_1;
    HEAP32[($1_1 + 16 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 20 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $6_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = i64toi32_i32$0;
    i64toi32_i32$1 = $1_1;
    HEAP32[$1_1 >> 2] = $6_1;
    HEAP32[($1_1 + 4 | 0) >> 2] = i64toi32_i32$0;
    $1_1 = $1_1 + 32 | 0;
    $2_1 = $2_1 + -32 | 0;
    if ($2_1 >>> 0 > 31 >>> 0) {
     continue label$2
    }
    break label$2;
   };
  }
  return $0_1 | 0;
 }
 
 function $6($0_1) {
  $0_1 = $0_1 | 0;
  var $5_1 = 0, $4_1 = 0, $7_1 = 0, $8_1 = 0, $3_1 = 0, $2_1 = 0, $6_1 = 0, $10_1 = 0, $11_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$2 = 0, $1_1 = 0, $9_1 = 0, $79_1 = 0, $183 = 0, $782 = 0, $784 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $1_1 = global$0 - 16 | 0;
  global$0 = $1_1;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             if ($0_1 >>> 0 > 244 >>> 0) {
              break label$11
             }
             label$12 : {
              $2_1 = HEAP32[(0 + 69428 | 0) >> 2] | 0;
              $3_1 = $0_1 >>> 0 < 11 >>> 0 ? 16 : ($0_1 + 11 | 0) & 504 | 0;
              $4_1 = $3_1 >>> 3 | 0;
              $0_1 = $2_1 >>> $4_1 | 0;
              if (!($0_1 & 3 | 0)) {
               break label$12
              }
              label$13 : {
               label$14 : {
                $3_1 = (($0_1 ^ -1 | 0) & 1 | 0) + $4_1 | 0;
                $4_1 = $3_1 << 3 | 0;
                $0_1 = $4_1 + 69468 | 0;
                $4_1 = HEAP32[($4_1 + 69476 | 0) >> 2] | 0;
                $5_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
                if (($0_1 | 0) != ($5_1 | 0)) {
                 break label$14
                }
                (wasm2js_i32$0 = 0, wasm2js_i32$1 = $2_1 & (__wasm_rotl_i32(-2 | 0, $3_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69428 | 0) >> 2] = wasm2js_i32$1;
                break label$13;
               }
               HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
               HEAP32[($0_1 + 8 | 0) >> 2] = $5_1;
              }
              $0_1 = $4_1 + 8 | 0;
              $3_1 = $3_1 << 3 | 0;
              HEAP32[($4_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
              $4_1 = $4_1 + $3_1 | 0;
              HEAP32[($4_1 + 4 | 0) >> 2] = HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 1 | 0;
              break label$1;
             }
             $6_1 = HEAP32[(0 + 69436 | 0) >> 2] | 0;
             if ($3_1 >>> 0 <= $6_1 >>> 0) {
              break label$10
             }
             label$15 : {
              if (!$0_1) {
               break label$15
              }
              label$16 : {
               label$17 : {
                $79_1 = $0_1 << $4_1 | 0;
                $0_1 = 2 << $4_1 | 0;
                $4_1 = __wasm_ctz_i32($79_1 & ($0_1 | (0 - $0_1 | 0) | 0) | 0 | 0) | 0;
                $0_1 = $4_1 << 3 | 0;
                $5_1 = $0_1 + 69468 | 0;
                $0_1 = HEAP32[($0_1 + 69476 | 0) >> 2] | 0;
                $7_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                if (($5_1 | 0) != ($7_1 | 0)) {
                 break label$17
                }
                $2_1 = $2_1 & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
                HEAP32[(0 + 69428 | 0) >> 2] = $2_1;
                break label$16;
               }
               HEAP32[($7_1 + 12 | 0) >> 2] = $5_1;
               HEAP32[($5_1 + 8 | 0) >> 2] = $7_1;
              }
              HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
              $7_1 = $0_1 + $3_1 | 0;
              $4_1 = $4_1 << 3 | 0;
              $3_1 = $4_1 - $3_1 | 0;
              HEAP32[($7_1 + 4 | 0) >> 2] = $3_1 | 1 | 0;
              HEAP32[($0_1 + $4_1 | 0) >> 2] = $3_1;
              label$18 : {
               if (!$6_1) {
                break label$18
               }
               $5_1 = ($6_1 & -8 | 0) + 69468 | 0;
               $4_1 = HEAP32[(0 + 69448 | 0) >> 2] | 0;
               label$19 : {
                label$20 : {
                 $8_1 = 1 << ($6_1 >>> 3 | 0) | 0;
                 if ($2_1 & $8_1 | 0) {
                  break label$20
                 }
                 HEAP32[(0 + 69428 | 0) >> 2] = $2_1 | $8_1 | 0;
                 $8_1 = $5_1;
                 break label$19;
                }
                $8_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
               }
               HEAP32[($5_1 + 8 | 0) >> 2] = $4_1;
               HEAP32[($8_1 + 12 | 0) >> 2] = $4_1;
               HEAP32[($4_1 + 12 | 0) >> 2] = $5_1;
               HEAP32[($4_1 + 8 | 0) >> 2] = $8_1;
              }
              $0_1 = $0_1 + 8 | 0;
              HEAP32[(0 + 69448 | 0) >> 2] = $7_1;
              HEAP32[(0 + 69436 | 0) >> 2] = $3_1;
              break label$1;
             }
             $9_1 = HEAP32[(0 + 69432 | 0) >> 2] | 0;
             if (!$9_1) {
              break label$10
             }
             $7_1 = HEAP32[(((__wasm_ctz_i32($9_1 | 0) | 0) << 2 | 0) + 69732 | 0) >> 2] | 0;
             $4_1 = ((HEAP32[($7_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
             $5_1 = $7_1;
             label$21 : {
              label$22 : while (1) {
               label$23 : {
                $0_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
                if ($0_1) {
                 break label$23
                }
                $0_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
                if (!$0_1) {
                 break label$21
                }
               }
               $5_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
               $183 = $5_1;
               $5_1 = $5_1 >>> 0 < $4_1 >>> 0;
               $4_1 = $5_1 ? $183 : $4_1;
               $7_1 = $5_1 ? $0_1 : $7_1;
               $5_1 = $0_1;
               continue label$22;
              };
             }
             $10_1 = HEAP32[($7_1 + 24 | 0) >> 2] | 0;
             label$24 : {
              $0_1 = HEAP32[($7_1 + 12 | 0) >> 2] | 0;
              if (($0_1 | 0) == ($7_1 | 0)) {
               break label$24
              }
              $5_1 = HEAP32[($7_1 + 8 | 0) >> 2] | 0;
              HEAP32[(0 + 69444 | 0) >> 2] | 0;
              HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
              HEAP32[($0_1 + 8 | 0) >> 2] = $5_1;
              break label$2;
             }
             label$25 : {
              label$26 : {
               $5_1 = HEAP32[($7_1 + 20 | 0) >> 2] | 0;
               if (!$5_1) {
                break label$26
               }
               $8_1 = $7_1 + 20 | 0;
               break label$25;
              }
              $5_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
              if (!$5_1) {
               break label$9
              }
              $8_1 = $7_1 + 16 | 0;
             }
             label$27 : while (1) {
              $11_1 = $8_1;
              $0_1 = $5_1;
              $8_1 = $0_1 + 20 | 0;
              $5_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
              if ($5_1) {
               continue label$27
              }
              $8_1 = $0_1 + 16 | 0;
              $5_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
              if ($5_1) {
               continue label$27
              }
              break label$27;
             };
             HEAP32[$11_1 >> 2] = 0;
             break label$2;
            }
            $3_1 = -1;
            if ($0_1 >>> 0 > -65 >>> 0) {
             break label$10
            }
            $0_1 = $0_1 + 11 | 0;
            $3_1 = $0_1 & -8 | 0;
            $10_1 = HEAP32[(0 + 69432 | 0) >> 2] | 0;
            if (!$10_1) {
             break label$10
            }
            $6_1 = 0;
            label$28 : {
             if ($3_1 >>> 0 < 256 >>> 0) {
              break label$28
             }
             $6_1 = 31;
             if ($3_1 >>> 0 > 16777215 >>> 0) {
              break label$28
             }
             $0_1 = Math_clz32($0_1 >>> 8 | 0);
             $6_1 = ((($3_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
            }
            $4_1 = 0 - $3_1 | 0;
            label$29 : {
             label$30 : {
              label$31 : {
               label$32 : {
                $5_1 = HEAP32[(($6_1 << 2 | 0) + 69732 | 0) >> 2] | 0;
                if ($5_1) {
                 break label$32
                }
                $0_1 = 0;
                $8_1 = 0;
                break label$31;
               }
               $0_1 = 0;
               $7_1 = $3_1 << (($6_1 | 0) == (31 | 0) ? 0 : 25 - ($6_1 >>> 1 | 0) | 0) | 0;
               $8_1 = 0;
               label$33 : while (1) {
                label$34 : {
                 $2_1 = ((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                 if ($2_1 >>> 0 >= $4_1 >>> 0) {
                  break label$34
                 }
                 $4_1 = $2_1;
                 $8_1 = $5_1;
                 if ($4_1) {
                  break label$34
                 }
                 $4_1 = 0;
                 $8_1 = $5_1;
                 $0_1 = $5_1;
                 break label$30;
                }
                $2_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
                $11_1 = HEAP32[(($5_1 + (($7_1 >>> 29 | 0) & 4 | 0) | 0) + 16 | 0) >> 2] | 0;
                $0_1 = $2_1 ? (($2_1 | 0) == ($11_1 | 0) ? $0_1 : $2_1) : $0_1;
                $7_1 = $7_1 << 1 | 0;
                $5_1 = $11_1;
                if ($5_1) {
                 continue label$33
                }
                break label$33;
               };
              }
              label$35 : {
               if ($0_1 | $8_1 | 0) {
                break label$35
               }
               $8_1 = 0;
               $0_1 = 2 << $6_1 | 0;
               $0_1 = ($0_1 | (0 - $0_1 | 0) | 0) & $10_1 | 0;
               if (!$0_1) {
                break label$10
               }
               $0_1 = HEAP32[(((__wasm_ctz_i32($0_1 | 0) | 0) << 2 | 0) + 69732 | 0) >> 2] | 0;
              }
              if (!$0_1) {
               break label$29
              }
             }
             label$36 : while (1) {
              $2_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
              $7_1 = $2_1 >>> 0 < $4_1 >>> 0;
              label$37 : {
               $5_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
               if ($5_1) {
                break label$37
               }
               $5_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
              }
              $4_1 = $7_1 ? $2_1 : $4_1;
              $8_1 = $7_1 ? $0_1 : $8_1;
              $0_1 = $5_1;
              if ($0_1) {
               continue label$36
              }
              break label$36;
             };
            }
            if (!$8_1) {
             break label$10
            }
            if ($4_1 >>> 0 >= ((HEAP32[(0 + 69436 | 0) >> 2] | 0) - $3_1 | 0) >>> 0) {
             break label$10
            }
            $11_1 = HEAP32[($8_1 + 24 | 0) >> 2] | 0;
            label$38 : {
             $0_1 = HEAP32[($8_1 + 12 | 0) >> 2] | 0;
             if (($0_1 | 0) == ($8_1 | 0)) {
              break label$38
             }
             $5_1 = HEAP32[($8_1 + 8 | 0) >> 2] | 0;
             HEAP32[(0 + 69444 | 0) >> 2] | 0;
             HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
             HEAP32[($0_1 + 8 | 0) >> 2] = $5_1;
             break label$3;
            }
            label$39 : {
             label$40 : {
              $5_1 = HEAP32[($8_1 + 20 | 0) >> 2] | 0;
              if (!$5_1) {
               break label$40
              }
              $7_1 = $8_1 + 20 | 0;
              break label$39;
             }
             $5_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
             if (!$5_1) {
              break label$8
             }
             $7_1 = $8_1 + 16 | 0;
            }
            label$41 : while (1) {
             $2_1 = $7_1;
             $0_1 = $5_1;
             $7_1 = $0_1 + 20 | 0;
             $5_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
             if ($5_1) {
              continue label$41
             }
             $7_1 = $0_1 + 16 | 0;
             $5_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
             if ($5_1) {
              continue label$41
             }
             break label$41;
            };
            HEAP32[$2_1 >> 2] = 0;
            break label$3;
           }
           label$42 : {
            $0_1 = HEAP32[(0 + 69436 | 0) >> 2] | 0;
            if ($0_1 >>> 0 < $3_1 >>> 0) {
             break label$42
            }
            $4_1 = HEAP32[(0 + 69448 | 0) >> 2] | 0;
            label$43 : {
             label$44 : {
              $5_1 = $0_1 - $3_1 | 0;
              if ($5_1 >>> 0 < 16 >>> 0) {
               break label$44
              }
              $7_1 = $4_1 + $3_1 | 0;
              HEAP32[($7_1 + 4 | 0) >> 2] = $5_1 | 1 | 0;
              HEAP32[($4_1 + $0_1 | 0) >> 2] = $5_1;
              HEAP32[($4_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
              break label$43;
             }
             HEAP32[($4_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
             $0_1 = $4_1 + $0_1 | 0;
             HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
             $7_1 = 0;
             $5_1 = 0;
            }
            HEAP32[(0 + 69436 | 0) >> 2] = $5_1;
            HEAP32[(0 + 69448 | 0) >> 2] = $7_1;
            $0_1 = $4_1 + 8 | 0;
            break label$1;
           }
           label$45 : {
            $7_1 = HEAP32[(0 + 69440 | 0) >> 2] | 0;
            if ($7_1 >>> 0 <= $3_1 >>> 0) {
             break label$45
            }
            $4_1 = $7_1 - $3_1 | 0;
            HEAP32[(0 + 69440 | 0) >> 2] = $4_1;
            $0_1 = HEAP32[(0 + 69452 | 0) >> 2] | 0;
            $5_1 = $0_1 + $3_1 | 0;
            HEAP32[(0 + 69452 | 0) >> 2] = $5_1;
            HEAP32[($5_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
            HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
            $0_1 = $0_1 + 8 | 0;
            break label$1;
           }
           label$46 : {
            label$47 : {
             if (!(HEAP32[(0 + 69900 | 0) >> 2] | 0)) {
              break label$47
             }
             $4_1 = HEAP32[(0 + 69908 | 0) >> 2] | 0;
             break label$46;
            }
            i64toi32_i32$1 = 0;
            i64toi32_i32$0 = -1;
            HEAP32[(i64toi32_i32$1 + 69912 | 0) >> 2] = -1;
            HEAP32[(i64toi32_i32$1 + 69916 | 0) >> 2] = i64toi32_i32$0;
            i64toi32_i32$1 = 0;
            i64toi32_i32$0 = 4096;
            HEAP32[(i64toi32_i32$1 + 69904 | 0) >> 2] = 4096;
            HEAP32[(i64toi32_i32$1 + 69908 | 0) >> 2] = i64toi32_i32$0;
            HEAP32[(0 + 69900 | 0) >> 2] = (($1_1 + 12 | 0) & -16 | 0) ^ 1431655768 | 0;
            HEAP32[(0 + 69920 | 0) >> 2] = 0;
            HEAP32[(0 + 69872 | 0) >> 2] = 0;
            $4_1 = 4096;
           }
           $0_1 = 0;
           $6_1 = $3_1 + 47 | 0;
           $2_1 = $4_1 + $6_1 | 0;
           $11_1 = 0 - $4_1 | 0;
           $8_1 = $2_1 & $11_1 | 0;
           if ($8_1 >>> 0 <= $3_1 >>> 0) {
            break label$1
           }
           $0_1 = 0;
           label$48 : {
            $4_1 = HEAP32[(0 + 69868 | 0) >> 2] | 0;
            if (!$4_1) {
             break label$48
            }
            $5_1 = HEAP32[(0 + 69860 | 0) >> 2] | 0;
            $10_1 = $5_1 + $8_1 | 0;
            if ($10_1 >>> 0 <= $5_1 >>> 0) {
             break label$1
            }
            if ($10_1 >>> 0 > $4_1 >>> 0) {
             break label$1
            }
           }
           label$49 : {
            label$50 : {
             if ((HEAPU8[(0 + 69872 | 0) >> 0] | 0) & 4 | 0) {
              break label$50
             }
             label$51 : {
              label$52 : {
               label$53 : {
                label$54 : {
                 label$55 : {
                  $4_1 = HEAP32[(0 + 69452 | 0) >> 2] | 0;
                  if (!$4_1) {
                   break label$55
                  }
                  $0_1 = 69876;
                  label$56 : while (1) {
                   label$57 : {
                    $5_1 = HEAP32[$0_1 >> 2] | 0;
                    if ($5_1 >>> 0 > $4_1 >>> 0) {
                     break label$57
                    }
                    if (($5_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0) >>> 0 > $4_1 >>> 0) {
                     break label$54
                    }
                   }
                   $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                   if ($0_1) {
                    continue label$56
                   }
                   break label$56;
                  };
                 }
                 $7_1 = $3(0 | 0) | 0;
                 if (($7_1 | 0) == (-1 | 0)) {
                  break label$51
                 }
                 $2_1 = $8_1;
                 label$58 : {
                  $0_1 = HEAP32[(0 + 69904 | 0) >> 2] | 0;
                  $4_1 = $0_1 + -1 | 0;
                  if (!($4_1 & $7_1 | 0)) {
                   break label$58
                  }
                  $2_1 = ($8_1 - $7_1 | 0) + (($4_1 + $7_1 | 0) & (0 - $0_1 | 0) | 0) | 0;
                 }
                 if ($2_1 >>> 0 <= $3_1 >>> 0) {
                  break label$51
                 }
                 label$59 : {
                  $0_1 = HEAP32[(0 + 69868 | 0) >> 2] | 0;
                  if (!$0_1) {
                   break label$59
                  }
                  $4_1 = HEAP32[(0 + 69860 | 0) >> 2] | 0;
                  $5_1 = $4_1 + $2_1 | 0;
                  if ($5_1 >>> 0 <= $4_1 >>> 0) {
                   break label$51
                  }
                  if ($5_1 >>> 0 > $0_1 >>> 0) {
                   break label$51
                  }
                 }
                 $0_1 = $3($2_1 | 0) | 0;
                 if (($0_1 | 0) != ($7_1 | 0)) {
                  break label$53
                 }
                 break label$49;
                }
                $2_1 = ($2_1 - $7_1 | 0) & $11_1 | 0;
                $7_1 = $3($2_1 | 0) | 0;
                if (($7_1 | 0) == ((HEAP32[$0_1 >> 2] | 0) + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0 | 0)) {
                 break label$52
                }
                $0_1 = $7_1;
               }
               if (($0_1 | 0) == (-1 | 0)) {
                break label$51
               }
               label$60 : {
                if ($2_1 >>> 0 < ($3_1 + 48 | 0) >>> 0) {
                 break label$60
                }
                $7_1 = $0_1;
                break label$49;
               }
               $4_1 = HEAP32[(0 + 69908 | 0) >> 2] | 0;
               $4_1 = (($6_1 - $2_1 | 0) + $4_1 | 0) & (0 - $4_1 | 0) | 0;
               if (($3($4_1 | 0) | 0 | 0) == (-1 | 0)) {
                break label$51
               }
               $2_1 = $4_1 + $2_1 | 0;
               $7_1 = $0_1;
               break label$49;
              }
              if (($7_1 | 0) != (-1 | 0)) {
               break label$49
              }
             }
             HEAP32[(0 + 69872 | 0) >> 2] = HEAP32[(0 + 69872 | 0) >> 2] | 0 | 4 | 0;
            }
            $7_1 = $3($8_1 | 0) | 0;
            $0_1 = $3(0 | 0) | 0;
            if (($7_1 | 0) == (-1 | 0)) {
             break label$5
            }
            if (($0_1 | 0) == (-1 | 0)) {
             break label$5
            }
            if ($7_1 >>> 0 >= $0_1 >>> 0) {
             break label$5
            }
            $2_1 = $0_1 - $7_1 | 0;
            if ($2_1 >>> 0 <= ($3_1 + 40 | 0) >>> 0) {
             break label$5
            }
           }
           $0_1 = (HEAP32[(0 + 69860 | 0) >> 2] | 0) + $2_1 | 0;
           HEAP32[(0 + 69860 | 0) >> 2] = $0_1;
           label$61 : {
            if ($0_1 >>> 0 <= (HEAP32[(0 + 69864 | 0) >> 2] | 0) >>> 0) {
             break label$61
            }
            HEAP32[(0 + 69864 | 0) >> 2] = $0_1;
           }
           label$62 : {
            label$63 : {
             $4_1 = HEAP32[(0 + 69452 | 0) >> 2] | 0;
             if (!$4_1) {
              break label$63
             }
             $0_1 = 69876;
             label$64 : while (1) {
              $5_1 = HEAP32[$0_1 >> 2] | 0;
              $8_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
              if (($7_1 | 0) == ($5_1 + $8_1 | 0 | 0)) {
               break label$62
              }
              $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
              if ($0_1) {
               continue label$64
              }
              break label$7;
             };
            }
            label$65 : {
             label$66 : {
              $0_1 = HEAP32[(0 + 69444 | 0) >> 2] | 0;
              if (!$0_1) {
               break label$66
              }
              if ($7_1 >>> 0 >= $0_1 >>> 0) {
               break label$65
              }
             }
             HEAP32[(0 + 69444 | 0) >> 2] = $7_1;
            }
            $0_1 = 0;
            HEAP32[(0 + 69880 | 0) >> 2] = $2_1;
            HEAP32[(0 + 69876 | 0) >> 2] = $7_1;
            HEAP32[(0 + 69460 | 0) >> 2] = -1;
            HEAP32[(0 + 69464 | 0) >> 2] = HEAP32[(0 + 69900 | 0) >> 2] | 0;
            HEAP32[(0 + 69888 | 0) >> 2] = 0;
            label$67 : while (1) {
             $4_1 = $0_1 << 3 | 0;
             $5_1 = $4_1 + 69468 | 0;
             HEAP32[($4_1 + 69476 | 0) >> 2] = $5_1;
             HEAP32[($4_1 + 69480 | 0) >> 2] = $5_1;
             $0_1 = $0_1 + 1 | 0;
             if (($0_1 | 0) != (32 | 0)) {
              continue label$67
             }
             break label$67;
            };
            $0_1 = $2_1 + -40 | 0;
            $4_1 = (-8 - $7_1 | 0) & 7 | 0;
            $5_1 = $0_1 - $4_1 | 0;
            HEAP32[(0 + 69440 | 0) >> 2] = $5_1;
            $4_1 = $7_1 + $4_1 | 0;
            HEAP32[(0 + 69452 | 0) >> 2] = $4_1;
            HEAP32[($4_1 + 4 | 0) >> 2] = $5_1 | 1 | 0;
            HEAP32[(($7_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
            HEAP32[(0 + 69456 | 0) >> 2] = HEAP32[(0 + 69916 | 0) >> 2] | 0;
            break label$6;
           }
           if ($4_1 >>> 0 >= $7_1 >>> 0) {
            break label$7
           }
           if ($4_1 >>> 0 < $5_1 >>> 0) {
            break label$7
           }
           if ((HEAP32[($0_1 + 12 | 0) >> 2] | 0) & 8 | 0) {
            break label$7
           }
           HEAP32[($0_1 + 4 | 0) >> 2] = $8_1 + $2_1 | 0;
           $0_1 = (-8 - $4_1 | 0) & 7 | 0;
           $5_1 = $4_1 + $0_1 | 0;
           HEAP32[(0 + 69452 | 0) >> 2] = $5_1;
           $7_1 = (HEAP32[(0 + 69440 | 0) >> 2] | 0) + $2_1 | 0;
           $0_1 = $7_1 - $0_1 | 0;
           HEAP32[(0 + 69440 | 0) >> 2] = $0_1;
           HEAP32[($5_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
           HEAP32[(($4_1 + $7_1 | 0) + 4 | 0) >> 2] = 40;
           HEAP32[(0 + 69456 | 0) >> 2] = HEAP32[(0 + 69916 | 0) >> 2] | 0;
           break label$6;
          }
          $0_1 = 0;
          break label$2;
         }
         $0_1 = 0;
         break label$3;
        }
        label$68 : {
         if ($7_1 >>> 0 >= (HEAP32[(0 + 69444 | 0) >> 2] | 0) >>> 0) {
          break label$68
         }
         HEAP32[(0 + 69444 | 0) >> 2] = $7_1;
        }
        $5_1 = $7_1 + $2_1 | 0;
        $0_1 = 69876;
        label$69 : {
         label$70 : {
          label$71 : while (1) {
           if ((HEAP32[$0_1 >> 2] | 0 | 0) == ($5_1 | 0)) {
            break label$70
           }
           $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
           if ($0_1) {
            continue label$71
           }
           break label$69;
          };
         }
         if (!((HEAPU8[($0_1 + 12 | 0) >> 0] | 0) & 8 | 0)) {
          break label$4
         }
        }
        $0_1 = 69876;
        label$72 : {
         label$73 : while (1) {
          label$74 : {
           $5_1 = HEAP32[$0_1 >> 2] | 0;
           if ($5_1 >>> 0 > $4_1 >>> 0) {
            break label$74
           }
           $5_1 = $5_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0;
           if ($5_1 >>> 0 > $4_1 >>> 0) {
            break label$72
           }
          }
          $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
          continue label$73;
         };
        }
        $0_1 = $2_1 + -40 | 0;
        $8_1 = (-8 - $7_1 | 0) & 7 | 0;
        $11_1 = $0_1 - $8_1 | 0;
        HEAP32[(0 + 69440 | 0) >> 2] = $11_1;
        $8_1 = $7_1 + $8_1 | 0;
        HEAP32[(0 + 69452 | 0) >> 2] = $8_1;
        HEAP32[($8_1 + 4 | 0) >> 2] = $11_1 | 1 | 0;
        HEAP32[(($7_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
        HEAP32[(0 + 69456 | 0) >> 2] = HEAP32[(0 + 69916 | 0) >> 2] | 0;
        $0_1 = ($5_1 + ((39 - $5_1 | 0) & 7 | 0) | 0) + -47 | 0;
        $8_1 = $0_1 >>> 0 < ($4_1 + 16 | 0) >>> 0 ? $4_1 : $0_1;
        HEAP32[($8_1 + 4 | 0) >> 2] = 27;
        i64toi32_i32$2 = 0;
        i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 69884 | 0) >> 2] | 0;
        i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 69888 | 0) >> 2] | 0;
        $782 = i64toi32_i32$0;
        i64toi32_i32$0 = $8_1 + 16 | 0;
        HEAP32[i64toi32_i32$0 >> 2] = $782;
        HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
        i64toi32_i32$2 = 0;
        i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 69876 | 0) >> 2] | 0;
        i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 69880 | 0) >> 2] | 0;
        $784 = i64toi32_i32$1;
        i64toi32_i32$1 = $8_1;
        HEAP32[($8_1 + 8 | 0) >> 2] = $784;
        HEAP32[($8_1 + 12 | 0) >> 2] = i64toi32_i32$0;
        HEAP32[(0 + 69884 | 0) >> 2] = $8_1 + 8 | 0;
        HEAP32[(0 + 69880 | 0) >> 2] = $2_1;
        HEAP32[(0 + 69876 | 0) >> 2] = $7_1;
        HEAP32[(0 + 69888 | 0) >> 2] = 0;
        $0_1 = $8_1 + 24 | 0;
        label$75 : while (1) {
         HEAP32[($0_1 + 4 | 0) >> 2] = 7;
         $7_1 = $0_1 + 8 | 0;
         $0_1 = $0_1 + 4 | 0;
         if ($7_1 >>> 0 < $5_1 >>> 0) {
          continue label$75
         }
         break label$75;
        };
        if (($8_1 | 0) == ($4_1 | 0)) {
         break label$6
        }
        HEAP32[($8_1 + 4 | 0) >> 2] = (HEAP32[($8_1 + 4 | 0) >> 2] | 0) & -2 | 0;
        $7_1 = $8_1 - $4_1 | 0;
        HEAP32[($4_1 + 4 | 0) >> 2] = $7_1 | 1 | 0;
        HEAP32[$8_1 >> 2] = $7_1;
        label$76 : {
         label$77 : {
          if ($7_1 >>> 0 > 255 >>> 0) {
           break label$77
          }
          $0_1 = ($7_1 & -8 | 0) + 69468 | 0;
          label$78 : {
           label$79 : {
            $5_1 = HEAP32[(0 + 69428 | 0) >> 2] | 0;
            $7_1 = 1 << ($7_1 >>> 3 | 0) | 0;
            if ($5_1 & $7_1 | 0) {
             break label$79
            }
            HEAP32[(0 + 69428 | 0) >> 2] = $5_1 | $7_1 | 0;
            $5_1 = $0_1;
            break label$78;
           }
           $5_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
          }
          HEAP32[($0_1 + 8 | 0) >> 2] = $4_1;
          HEAP32[($5_1 + 12 | 0) >> 2] = $4_1;
          $7_1 = 12;
          $8_1 = 8;
          break label$76;
         }
         $0_1 = 31;
         label$80 : {
          if ($7_1 >>> 0 > 16777215 >>> 0) {
           break label$80
          }
          $0_1 = Math_clz32($7_1 >>> 8 | 0);
          $0_1 = ((($7_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
         }
         HEAP32[($4_1 + 28 | 0) >> 2] = $0_1;
         i64toi32_i32$1 = $4_1;
         i64toi32_i32$0 = 0;
         HEAP32[($4_1 + 16 | 0) >> 2] = 0;
         HEAP32[($4_1 + 20 | 0) >> 2] = i64toi32_i32$0;
         $5_1 = ($0_1 << 2 | 0) + 69732 | 0;
         label$81 : {
          label$82 : {
           label$83 : {
            $8_1 = HEAP32[(0 + 69432 | 0) >> 2] | 0;
            $2_1 = 1 << $0_1 | 0;
            if ($8_1 & $2_1 | 0) {
             break label$83
            }
            HEAP32[(0 + 69432 | 0) >> 2] = $8_1 | $2_1 | 0;
            HEAP32[$5_1 >> 2] = $4_1;
            HEAP32[($4_1 + 24 | 0) >> 2] = $5_1;
            break label$82;
           }
           $0_1 = $7_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
           $8_1 = HEAP32[$5_1 >> 2] | 0;
           label$84 : while (1) {
            $5_1 = $8_1;
            if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($7_1 | 0)) {
             break label$81
            }
            $8_1 = $0_1 >>> 29 | 0;
            $0_1 = $0_1 << 1 | 0;
            $2_1 = ($5_1 + ($8_1 & 4 | 0) | 0) + 16 | 0;
            $8_1 = HEAP32[$2_1 >> 2] | 0;
            if ($8_1) {
             continue label$84
            }
            break label$84;
           };
           HEAP32[$2_1 >> 2] = $4_1;
           HEAP32[($4_1 + 24 | 0) >> 2] = $5_1;
          }
          $7_1 = 8;
          $8_1 = 12;
          $5_1 = $4_1;
          $0_1 = $4_1;
          break label$76;
         }
         $0_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
         HEAP32[($0_1 + 12 | 0) >> 2] = $4_1;
         HEAP32[($5_1 + 8 | 0) >> 2] = $4_1;
         HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
         $0_1 = 0;
         $7_1 = 24;
         $8_1 = 12;
        }
        HEAP32[($4_1 + $8_1 | 0) >> 2] = $5_1;
        HEAP32[($4_1 + $7_1 | 0) >> 2] = $0_1;
       }
       $0_1 = HEAP32[(0 + 69440 | 0) >> 2] | 0;
       if ($0_1 >>> 0 <= $3_1 >>> 0) {
        break label$5
       }
       $4_1 = $0_1 - $3_1 | 0;
       HEAP32[(0 + 69440 | 0) >> 2] = $4_1;
       $0_1 = HEAP32[(0 + 69452 | 0) >> 2] | 0;
       $5_1 = $0_1 + $3_1 | 0;
       HEAP32[(0 + 69452 | 0) >> 2] = $5_1;
       HEAP32[($5_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
       HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
       $0_1 = $0_1 + 8 | 0;
       break label$1;
      }
      (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = 48), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
      $0_1 = 0;
      break label$1;
     }
     HEAP32[$0_1 >> 2] = $7_1;
     HEAP32[($0_1 + 4 | 0) >> 2] = (HEAP32[($0_1 + 4 | 0) >> 2] | 0) + $2_1 | 0;
     $0_1 = $7($7_1 | 0, $5_1 | 0, $3_1 | 0) | 0;
     break label$1;
    }
    label$85 : {
     if (!$11_1) {
      break label$85
     }
     label$86 : {
      label$87 : {
       $7_1 = HEAP32[($8_1 + 28 | 0) >> 2] | 0;
       $5_1 = ($7_1 << 2 | 0) + 69732 | 0;
       if (($8_1 | 0) != (HEAP32[$5_1 >> 2] | 0 | 0)) {
        break label$87
       }
       HEAP32[$5_1 >> 2] = $0_1;
       if ($0_1) {
        break label$86
       }
       $10_1 = $10_1 & (__wasm_rotl_i32(-2 | 0, $7_1 | 0) | 0) | 0;
       HEAP32[(0 + 69432 | 0) >> 2] = $10_1;
       break label$85;
      }
      HEAP32[($11_1 + ((HEAP32[($11_1 + 16 | 0) >> 2] | 0 | 0) == ($8_1 | 0) ? 16 : 20) | 0) >> 2] = $0_1;
      if (!$0_1) {
       break label$85
      }
     }
     HEAP32[($0_1 + 24 | 0) >> 2] = $11_1;
     label$88 : {
      $5_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
      if (!$5_1) {
       break label$88
      }
      HEAP32[($0_1 + 16 | 0) >> 2] = $5_1;
      HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
     }
     $5_1 = HEAP32[($8_1 + 20 | 0) >> 2] | 0;
     if (!$5_1) {
      break label$85
     }
     HEAP32[($0_1 + 20 | 0) >> 2] = $5_1;
     HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
    }
    label$89 : {
     label$90 : {
      if ($4_1 >>> 0 > 15 >>> 0) {
       break label$90
      }
      $0_1 = $4_1 + $3_1 | 0;
      HEAP32[($8_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
      $0_1 = $8_1 + $0_1 | 0;
      HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
      break label$89;
     }
     HEAP32[($8_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
     $7_1 = $8_1 + $3_1 | 0;
     HEAP32[($7_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
     HEAP32[($7_1 + $4_1 | 0) >> 2] = $4_1;
     label$91 : {
      if ($4_1 >>> 0 > 255 >>> 0) {
       break label$91
      }
      $0_1 = ($4_1 & -8 | 0) + 69468 | 0;
      label$92 : {
       label$93 : {
        $3_1 = HEAP32[(0 + 69428 | 0) >> 2] | 0;
        $4_1 = 1 << ($4_1 >>> 3 | 0) | 0;
        if ($3_1 & $4_1 | 0) {
         break label$93
        }
        HEAP32[(0 + 69428 | 0) >> 2] = $3_1 | $4_1 | 0;
        $4_1 = $0_1;
        break label$92;
       }
       $4_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
      }
      HEAP32[($0_1 + 8 | 0) >> 2] = $7_1;
      HEAP32[($4_1 + 12 | 0) >> 2] = $7_1;
      HEAP32[($7_1 + 12 | 0) >> 2] = $0_1;
      HEAP32[($7_1 + 8 | 0) >> 2] = $4_1;
      break label$89;
     }
     $0_1 = 31;
     label$94 : {
      if ($4_1 >>> 0 > 16777215 >>> 0) {
       break label$94
      }
      $0_1 = Math_clz32($4_1 >>> 8 | 0);
      $0_1 = ((($4_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
     }
     HEAP32[($7_1 + 28 | 0) >> 2] = $0_1;
     i64toi32_i32$1 = $7_1;
     i64toi32_i32$0 = 0;
     HEAP32[($7_1 + 16 | 0) >> 2] = 0;
     HEAP32[($7_1 + 20 | 0) >> 2] = i64toi32_i32$0;
     $3_1 = ($0_1 << 2 | 0) + 69732 | 0;
     label$95 : {
      label$96 : {
       label$97 : {
        $5_1 = 1 << $0_1 | 0;
        if ($10_1 & $5_1 | 0) {
         break label$97
        }
        HEAP32[(0 + 69432 | 0) >> 2] = $10_1 | $5_1 | 0;
        HEAP32[$3_1 >> 2] = $7_1;
        HEAP32[($7_1 + 24 | 0) >> 2] = $3_1;
        break label$96;
       }
       $0_1 = $4_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
       $5_1 = HEAP32[$3_1 >> 2] | 0;
       label$98 : while (1) {
        $3_1 = $5_1;
        if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($4_1 | 0)) {
         break label$95
        }
        $5_1 = $0_1 >>> 29 | 0;
        $0_1 = $0_1 << 1 | 0;
        $2_1 = ($3_1 + ($5_1 & 4 | 0) | 0) + 16 | 0;
        $5_1 = HEAP32[$2_1 >> 2] | 0;
        if ($5_1) {
         continue label$98
        }
        break label$98;
       };
       HEAP32[$2_1 >> 2] = $7_1;
       HEAP32[($7_1 + 24 | 0) >> 2] = $3_1;
      }
      HEAP32[($7_1 + 12 | 0) >> 2] = $7_1;
      HEAP32[($7_1 + 8 | 0) >> 2] = $7_1;
      break label$89;
     }
     $0_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
     HEAP32[($0_1 + 12 | 0) >> 2] = $7_1;
     HEAP32[($3_1 + 8 | 0) >> 2] = $7_1;
     HEAP32[($7_1 + 24 | 0) >> 2] = 0;
     HEAP32[($7_1 + 12 | 0) >> 2] = $3_1;
     HEAP32[($7_1 + 8 | 0) >> 2] = $0_1;
    }
    $0_1 = $8_1 + 8 | 0;
    break label$1;
   }
   label$99 : {
    if (!$10_1) {
     break label$99
    }
    label$100 : {
     label$101 : {
      $8_1 = HEAP32[($7_1 + 28 | 0) >> 2] | 0;
      $5_1 = ($8_1 << 2 | 0) + 69732 | 0;
      if (($7_1 | 0) != (HEAP32[$5_1 >> 2] | 0 | 0)) {
       break label$101
      }
      HEAP32[$5_1 >> 2] = $0_1;
      if ($0_1) {
       break label$100
      }
      (wasm2js_i32$0 = 0, wasm2js_i32$1 = $9_1 & (__wasm_rotl_i32(-2 | 0, $8_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69432 | 0) >> 2] = wasm2js_i32$1;
      break label$99;
     }
     HEAP32[($10_1 + ((HEAP32[($10_1 + 16 | 0) >> 2] | 0 | 0) == ($7_1 | 0) ? 16 : 20) | 0) >> 2] = $0_1;
     if (!$0_1) {
      break label$99
     }
    }
    HEAP32[($0_1 + 24 | 0) >> 2] = $10_1;
    label$102 : {
     $5_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
     if (!$5_1) {
      break label$102
     }
     HEAP32[($0_1 + 16 | 0) >> 2] = $5_1;
     HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
    }
    $5_1 = HEAP32[($7_1 + 20 | 0) >> 2] | 0;
    if (!$5_1) {
     break label$99
    }
    HEAP32[($0_1 + 20 | 0) >> 2] = $5_1;
    HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
   }
   label$103 : {
    label$104 : {
     if ($4_1 >>> 0 > 15 >>> 0) {
      break label$104
     }
     $0_1 = $4_1 + $3_1 | 0;
     HEAP32[($7_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
     $0_1 = $7_1 + $0_1 | 0;
     HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
     break label$103;
    }
    HEAP32[($7_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
    $3_1 = $7_1 + $3_1 | 0;
    HEAP32[($3_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
    HEAP32[($3_1 + $4_1 | 0) >> 2] = $4_1;
    label$105 : {
     if (!$6_1) {
      break label$105
     }
     $5_1 = ($6_1 & -8 | 0) + 69468 | 0;
     $0_1 = HEAP32[(0 + 69448 | 0) >> 2] | 0;
     label$106 : {
      label$107 : {
       $8_1 = 1 << ($6_1 >>> 3 | 0) | 0;
       if ($8_1 & $2_1 | 0) {
        break label$107
       }
       HEAP32[(0 + 69428 | 0) >> 2] = $8_1 | $2_1 | 0;
       $8_1 = $5_1;
       break label$106;
      }
      $8_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
     }
     HEAP32[($5_1 + 8 | 0) >> 2] = $0_1;
     HEAP32[($8_1 + 12 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 12 | 0) >> 2] = $5_1;
     HEAP32[($0_1 + 8 | 0) >> 2] = $8_1;
    }
    HEAP32[(0 + 69448 | 0) >> 2] = $3_1;
    HEAP32[(0 + 69436 | 0) >> 2] = $4_1;
   }
   $0_1 = $7_1 + 8 | 0;
  }
  global$0 = $1_1 + 16 | 0;
  return $0_1 | 0;
 }
 
 function $7($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $5_1 = 0, $7_1 = 0, $8_1 = 0, $9_1 = 0, $3_1 = 0, $6_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = $0_1 + ((-8 - $0_1 | 0) & 7 | 0) | 0;
  HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 | 3 | 0;
  $4_1 = $1_1 + ((-8 - $1_1 | 0) & 7 | 0) | 0;
  $5_1 = $3_1 + $2_1 | 0;
  $0_1 = $4_1 - $5_1 | 0;
  label$1 : {
   label$2 : {
    if (($4_1 | 0) != (HEAP32[(0 + 69452 | 0) >> 2] | 0 | 0)) {
     break label$2
    }
    HEAP32[(0 + 69452 | 0) >> 2] = $5_1;
    $2_1 = (HEAP32[(0 + 69440 | 0) >> 2] | 0) + $0_1 | 0;
    HEAP32[(0 + 69440 | 0) >> 2] = $2_1;
    HEAP32[($5_1 + 4 | 0) >> 2] = $2_1 | 1 | 0;
    break label$1;
   }
   label$3 : {
    if (($4_1 | 0) != (HEAP32[(0 + 69448 | 0) >> 2] | 0 | 0)) {
     break label$3
    }
    HEAP32[(0 + 69448 | 0) >> 2] = $5_1;
    $2_1 = (HEAP32[(0 + 69436 | 0) >> 2] | 0) + $0_1 | 0;
    HEAP32[(0 + 69436 | 0) >> 2] = $2_1;
    HEAP32[($5_1 + 4 | 0) >> 2] = $2_1 | 1 | 0;
    HEAP32[($5_1 + $2_1 | 0) >> 2] = $2_1;
    break label$1;
   }
   label$4 : {
    $1_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
    if (($1_1 & 3 | 0 | 0) != (1 | 0)) {
     break label$4
    }
    $6_1 = $1_1 & -8 | 0;
    $2_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
    label$5 : {
     label$6 : {
      if ($1_1 >>> 0 > 255 >>> 0) {
       break label$6
      }
      $7_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
      $8_1 = $1_1 >>> 3 | 0;
      $1_1 = ($8_1 << 3 | 0) + 69468 | 0;
      label$7 : {
       if (($2_1 | 0) != ($7_1 | 0)) {
        break label$7
       }
       (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69428 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $8_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69428 | 0) >> 2] = wasm2js_i32$1;
       break label$5;
      }
      HEAP32[($7_1 + 12 | 0) >> 2] = $2_1;
      HEAP32[($2_1 + 8 | 0) >> 2] = $7_1;
      break label$5;
     }
     $9_1 = HEAP32[($4_1 + 24 | 0) >> 2] | 0;
     label$8 : {
      label$9 : {
       if (($2_1 | 0) == ($4_1 | 0)) {
        break label$9
       }
       $1_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
       HEAP32[(0 + 69444 | 0) >> 2] | 0;
       HEAP32[($1_1 + 12 | 0) >> 2] = $2_1;
       HEAP32[($2_1 + 8 | 0) >> 2] = $1_1;
       break label$8;
      }
      label$10 : {
       label$11 : {
        label$12 : {
         $1_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
         if (!$1_1) {
          break label$12
         }
         $7_1 = $4_1 + 20 | 0;
         break label$11;
        }
        $1_1 = HEAP32[($4_1 + 16 | 0) >> 2] | 0;
        if (!$1_1) {
         break label$10
        }
        $7_1 = $4_1 + 16 | 0;
       }
       label$13 : while (1) {
        $8_1 = $7_1;
        $2_1 = $1_1;
        $7_1 = $2_1 + 20 | 0;
        $1_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
        if ($1_1) {
         continue label$13
        }
        $7_1 = $2_1 + 16 | 0;
        $1_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
        if ($1_1) {
         continue label$13
        }
        break label$13;
       };
       HEAP32[$8_1 >> 2] = 0;
       break label$8;
      }
      $2_1 = 0;
     }
     if (!$9_1) {
      break label$5
     }
     label$14 : {
      label$15 : {
       $7_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
       $1_1 = ($7_1 << 2 | 0) + 69732 | 0;
       if (($4_1 | 0) != (HEAP32[$1_1 >> 2] | 0 | 0)) {
        break label$15
       }
       HEAP32[$1_1 >> 2] = $2_1;
       if ($2_1) {
        break label$14
       }
       (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69432 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $7_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69432 | 0) >> 2] = wasm2js_i32$1;
       break label$5;
      }
      HEAP32[($9_1 + ((HEAP32[($9_1 + 16 | 0) >> 2] | 0 | 0) == ($4_1 | 0) ? 16 : 20) | 0) >> 2] = $2_1;
      if (!$2_1) {
       break label$5
      }
     }
     HEAP32[($2_1 + 24 | 0) >> 2] = $9_1;
     label$16 : {
      $1_1 = HEAP32[($4_1 + 16 | 0) >> 2] | 0;
      if (!$1_1) {
       break label$16
      }
      HEAP32[($2_1 + 16 | 0) >> 2] = $1_1;
      HEAP32[($1_1 + 24 | 0) >> 2] = $2_1;
     }
     $1_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
     if (!$1_1) {
      break label$5
     }
     HEAP32[($2_1 + 20 | 0) >> 2] = $1_1;
     HEAP32[($1_1 + 24 | 0) >> 2] = $2_1;
    }
    $0_1 = $6_1 + $0_1 | 0;
    $4_1 = $4_1 + $6_1 | 0;
    $1_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
   }
   HEAP32[($4_1 + 4 | 0) >> 2] = $1_1 & -2 | 0;
   HEAP32[($5_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
   HEAP32[($5_1 + $0_1 | 0) >> 2] = $0_1;
   label$17 : {
    if ($0_1 >>> 0 > 255 >>> 0) {
     break label$17
    }
    $2_1 = ($0_1 & -8 | 0) + 69468 | 0;
    label$18 : {
     label$19 : {
      $1_1 = HEAP32[(0 + 69428 | 0) >> 2] | 0;
      $0_1 = 1 << ($0_1 >>> 3 | 0) | 0;
      if ($1_1 & $0_1 | 0) {
       break label$19
      }
      HEAP32[(0 + 69428 | 0) >> 2] = $1_1 | $0_1 | 0;
      $0_1 = $2_1;
      break label$18;
     }
     $0_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($2_1 + 8 | 0) >> 2] = $5_1;
    HEAP32[($0_1 + 12 | 0) >> 2] = $5_1;
    HEAP32[($5_1 + 12 | 0) >> 2] = $2_1;
    HEAP32[($5_1 + 8 | 0) >> 2] = $0_1;
    break label$1;
   }
   $2_1 = 31;
   label$20 : {
    if ($0_1 >>> 0 > 16777215 >>> 0) {
     break label$20
    }
    $2_1 = Math_clz32($0_1 >>> 8 | 0);
    $2_1 = ((($0_1 >>> (38 - $2_1 | 0) | 0) & 1 | 0) - ($2_1 << 1 | 0) | 0) + 62 | 0;
   }
   HEAP32[($5_1 + 28 | 0) >> 2] = $2_1;
   HEAP32[($5_1 + 16 | 0) >> 2] = 0;
   HEAP32[($5_1 + 20 | 0) >> 2] = 0;
   $1_1 = ($2_1 << 2 | 0) + 69732 | 0;
   label$21 : {
    label$22 : {
     label$23 : {
      $7_1 = HEAP32[(0 + 69432 | 0) >> 2] | 0;
      $4_1 = 1 << $2_1 | 0;
      if ($7_1 & $4_1 | 0) {
       break label$23
      }
      HEAP32[(0 + 69432 | 0) >> 2] = $7_1 | $4_1 | 0;
      HEAP32[$1_1 >> 2] = $5_1;
      HEAP32[($5_1 + 24 | 0) >> 2] = $1_1;
      break label$22;
     }
     $2_1 = $0_1 << (($2_1 | 0) == (31 | 0) ? 0 : 25 - ($2_1 >>> 1 | 0) | 0) | 0;
     $7_1 = HEAP32[$1_1 >> 2] | 0;
     label$24 : while (1) {
      $1_1 = $7_1;
      if (((HEAP32[($1_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
       break label$21
      }
      $7_1 = $2_1 >>> 29 | 0;
      $2_1 = $2_1 << 1 | 0;
      $4_1 = ($1_1 + ($7_1 & 4 | 0) | 0) + 16 | 0;
      $7_1 = HEAP32[$4_1 >> 2] | 0;
      if ($7_1) {
       continue label$24
      }
      break label$24;
     };
     HEAP32[$4_1 >> 2] = $5_1;
     HEAP32[($5_1 + 24 | 0) >> 2] = $1_1;
    }
    HEAP32[($5_1 + 12 | 0) >> 2] = $5_1;
    HEAP32[($5_1 + 8 | 0) >> 2] = $5_1;
    break label$1;
   }
   $2_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
   HEAP32[($2_1 + 12 | 0) >> 2] = $5_1;
   HEAP32[($1_1 + 8 | 0) >> 2] = $5_1;
   HEAP32[($5_1 + 24 | 0) >> 2] = 0;
   HEAP32[($5_1 + 12 | 0) >> 2] = $1_1;
   HEAP32[($5_1 + 8 | 0) >> 2] = $2_1;
  }
  return $3_1 + 8 | 0 | 0;
 }
 
 function $8($0_1) {
  $0_1 = $0_1 | 0;
  var $4_1 = 0, $2_1 = 0, $1_1 = 0, $5_1 = 0, $3_1 = 0, $6_1 = 0, $7_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   $1_1 = $0_1 + -8 | 0;
   $2_1 = HEAP32[($0_1 + -4 | 0) >> 2] | 0;
   $0_1 = $2_1 & -8 | 0;
   $3_1 = $1_1 + $0_1 | 0;
   label$2 : {
    if ($2_1 & 1 | 0) {
     break label$2
    }
    if (!($2_1 & 2 | 0)) {
     break label$1
    }
    $4_1 = HEAP32[$1_1 >> 2] | 0;
    $1_1 = $1_1 - $4_1 | 0;
    $5_1 = HEAP32[(0 + 69444 | 0) >> 2] | 0;
    if ($1_1 >>> 0 < $5_1 >>> 0) {
     break label$1
    }
    $0_1 = $4_1 + $0_1 | 0;
    label$3 : {
     label$4 : {
      label$5 : {
       if (($1_1 | 0) == (HEAP32[(0 + 69448 | 0) >> 2] | 0 | 0)) {
        break label$5
       }
       $2_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
       label$6 : {
        if ($4_1 >>> 0 > 255 >>> 0) {
         break label$6
        }
        $5_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
        $6_1 = $4_1 >>> 3 | 0;
        $4_1 = ($6_1 << 3 | 0) + 69468 | 0;
        label$7 : {
         if (($2_1 | 0) != ($5_1 | 0)) {
          break label$7
         }
         (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69428 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $6_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69428 | 0) >> 2] = wasm2js_i32$1;
         break label$2;
        }
        HEAP32[($5_1 + 12 | 0) >> 2] = $2_1;
        HEAP32[($2_1 + 8 | 0) >> 2] = $5_1;
        break label$2;
       }
       $7_1 = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
       label$8 : {
        if (($2_1 | 0) == ($1_1 | 0)) {
         break label$8
        }
        $4_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
        HEAP32[($4_1 + 12 | 0) >> 2] = $2_1;
        HEAP32[($2_1 + 8 | 0) >> 2] = $4_1;
        break label$3;
       }
       label$9 : {
        label$10 : {
         $4_1 = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
         if (!$4_1) {
          break label$10
         }
         $5_1 = $1_1 + 20 | 0;
         break label$9;
        }
        $4_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
        if (!$4_1) {
         break label$4
        }
        $5_1 = $1_1 + 16 | 0;
       }
       label$11 : while (1) {
        $6_1 = $5_1;
        $2_1 = $4_1;
        $5_1 = $2_1 + 20 | 0;
        $4_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
        if ($4_1) {
         continue label$11
        }
        $5_1 = $2_1 + 16 | 0;
        $4_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
        if ($4_1) {
         continue label$11
        }
        break label$11;
       };
       HEAP32[$6_1 >> 2] = 0;
       break label$3;
      }
      $2_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
      if (($2_1 & 3 | 0 | 0) != (3 | 0)) {
       break label$2
      }
      HEAP32[(0 + 69436 | 0) >> 2] = $0_1;
      HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 & -2 | 0;
      HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
      HEAP32[$3_1 >> 2] = $0_1;
      return;
     }
     $2_1 = 0;
    }
    if (!$7_1) {
     break label$2
    }
    label$12 : {
     label$13 : {
      $5_1 = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
      $4_1 = ($5_1 << 2 | 0) + 69732 | 0;
      if (($1_1 | 0) != (HEAP32[$4_1 >> 2] | 0 | 0)) {
       break label$13
      }
      HEAP32[$4_1 >> 2] = $2_1;
      if ($2_1) {
       break label$12
      }
      (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69432 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69432 | 0) >> 2] = wasm2js_i32$1;
      break label$2;
     }
     HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($1_1 | 0) ? 16 : 20) | 0) >> 2] = $2_1;
     if (!$2_1) {
      break label$2
     }
    }
    HEAP32[($2_1 + 24 | 0) >> 2] = $7_1;
    label$14 : {
     $4_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
     if (!$4_1) {
      break label$14
     }
     HEAP32[($2_1 + 16 | 0) >> 2] = $4_1;
     HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
    }
    $4_1 = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
    if (!$4_1) {
     break label$2
    }
    HEAP32[($2_1 + 20 | 0) >> 2] = $4_1;
    HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
   }
   if ($1_1 >>> 0 >= $3_1 >>> 0) {
    break label$1
   }
   $4_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
   if (!($4_1 & 1 | 0)) {
    break label$1
   }
   label$15 : {
    label$16 : {
     label$17 : {
      label$18 : {
       label$19 : {
        if ($4_1 & 2 | 0) {
         break label$19
        }
        label$20 : {
         if (($3_1 | 0) != (HEAP32[(0 + 69452 | 0) >> 2] | 0 | 0)) {
          break label$20
         }
         HEAP32[(0 + 69452 | 0) >> 2] = $1_1;
         $0_1 = (HEAP32[(0 + 69440 | 0) >> 2] | 0) + $0_1 | 0;
         HEAP32[(0 + 69440 | 0) >> 2] = $0_1;
         HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
         if (($1_1 | 0) != (HEAP32[(0 + 69448 | 0) >> 2] | 0 | 0)) {
          break label$1
         }
         HEAP32[(0 + 69436 | 0) >> 2] = 0;
         HEAP32[(0 + 69448 | 0) >> 2] = 0;
         return;
        }
        label$21 : {
         if (($3_1 | 0) != (HEAP32[(0 + 69448 | 0) >> 2] | 0 | 0)) {
          break label$21
         }
         HEAP32[(0 + 69448 | 0) >> 2] = $1_1;
         $0_1 = (HEAP32[(0 + 69436 | 0) >> 2] | 0) + $0_1 | 0;
         HEAP32[(0 + 69436 | 0) >> 2] = $0_1;
         HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
         HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
         return;
        }
        $0_1 = ($4_1 & -8 | 0) + $0_1 | 0;
        $2_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
        label$22 : {
         if ($4_1 >>> 0 > 255 >>> 0) {
          break label$22
         }
         $5_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         $3_1 = $4_1 >>> 3 | 0;
         $4_1 = ($3_1 << 3 | 0) + 69468 | 0;
         label$23 : {
          if (($2_1 | 0) != ($5_1 | 0)) {
           break label$23
          }
          (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69428 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $3_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69428 | 0) >> 2] = wasm2js_i32$1;
          break label$16;
         }
         HEAP32[($5_1 + 12 | 0) >> 2] = $2_1;
         HEAP32[($2_1 + 8 | 0) >> 2] = $5_1;
         break label$16;
        }
        $7_1 = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
        label$24 : {
         if (($2_1 | 0) == ($3_1 | 0)) {
          break label$24
         }
         $4_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         HEAP32[(0 + 69444 | 0) >> 2] | 0;
         HEAP32[($4_1 + 12 | 0) >> 2] = $2_1;
         HEAP32[($2_1 + 8 | 0) >> 2] = $4_1;
         break label$17;
        }
        label$25 : {
         label$26 : {
          $4_1 = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
          if (!$4_1) {
           break label$26
          }
          $5_1 = $3_1 + 20 | 0;
          break label$25;
         }
         $4_1 = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
         if (!$4_1) {
          break label$18
         }
         $5_1 = $3_1 + 16 | 0;
        }
        label$27 : while (1) {
         $6_1 = $5_1;
         $2_1 = $4_1;
         $5_1 = $2_1 + 20 | 0;
         $4_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
         if ($4_1) {
          continue label$27
         }
         $5_1 = $2_1 + 16 | 0;
         $4_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
         if ($4_1) {
          continue label$27
         }
         break label$27;
        };
        HEAP32[$6_1 >> 2] = 0;
        break label$17;
       }
       HEAP32[($3_1 + 4 | 0) >> 2] = $4_1 & -2 | 0;
       HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
       HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
       break label$15;
      }
      $2_1 = 0;
     }
     if (!$7_1) {
      break label$16
     }
     label$28 : {
      label$29 : {
       $5_1 = HEAP32[($3_1 + 28 | 0) >> 2] | 0;
       $4_1 = ($5_1 << 2 | 0) + 69732 | 0;
       if (($3_1 | 0) != (HEAP32[$4_1 >> 2] | 0 | 0)) {
        break label$29
       }
       HEAP32[$4_1 >> 2] = $2_1;
       if ($2_1) {
        break label$28
       }
       (wasm2js_i32$0 = 0, wasm2js_i32$1 = (HEAP32[(0 + 69432 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0), HEAP32[(wasm2js_i32$0 + 69432 | 0) >> 2] = wasm2js_i32$1;
       break label$16;
      }
      HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($3_1 | 0) ? 16 : 20) | 0) >> 2] = $2_1;
      if (!$2_1) {
       break label$16
      }
     }
     HEAP32[($2_1 + 24 | 0) >> 2] = $7_1;
     label$30 : {
      $4_1 = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
      if (!$4_1) {
       break label$30
      }
      HEAP32[($2_1 + 16 | 0) >> 2] = $4_1;
      HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
     }
     $4_1 = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
     if (!$4_1) {
      break label$16
     }
     HEAP32[($2_1 + 20 | 0) >> 2] = $4_1;
     HEAP32[($4_1 + 24 | 0) >> 2] = $2_1;
    }
    HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
    HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
    if (($1_1 | 0) != (HEAP32[(0 + 69448 | 0) >> 2] | 0 | 0)) {
     break label$15
    }
    HEAP32[(0 + 69436 | 0) >> 2] = $0_1;
    return;
   }
   label$31 : {
    if ($0_1 >>> 0 > 255 >>> 0) {
     break label$31
    }
    $2_1 = ($0_1 & -8 | 0) + 69468 | 0;
    label$32 : {
     label$33 : {
      $4_1 = HEAP32[(0 + 69428 | 0) >> 2] | 0;
      $0_1 = 1 << ($0_1 >>> 3 | 0) | 0;
      if ($4_1 & $0_1 | 0) {
       break label$33
      }
      HEAP32[(0 + 69428 | 0) >> 2] = $4_1 | $0_1 | 0;
      $0_1 = $2_1;
      break label$32;
     }
     $0_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($2_1 + 8 | 0) >> 2] = $1_1;
    HEAP32[($0_1 + 12 | 0) >> 2] = $1_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = $2_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $0_1;
    return;
   }
   $2_1 = 31;
   label$34 : {
    if ($0_1 >>> 0 > 16777215 >>> 0) {
     break label$34
    }
    $2_1 = Math_clz32($0_1 >>> 8 | 0);
    $2_1 = ((($0_1 >>> (38 - $2_1 | 0) | 0) & 1 | 0) - ($2_1 << 1 | 0) | 0) + 62 | 0;
   }
   HEAP32[($1_1 + 28 | 0) >> 2] = $2_1;
   HEAP32[($1_1 + 16 | 0) >> 2] = 0;
   HEAP32[($1_1 + 20 | 0) >> 2] = 0;
   $3_1 = ($2_1 << 2 | 0) + 69732 | 0;
   label$35 : {
    label$36 : {
     label$37 : {
      label$38 : {
       $4_1 = HEAP32[(0 + 69432 | 0) >> 2] | 0;
       $5_1 = 1 << $2_1 | 0;
       if ($4_1 & $5_1 | 0) {
        break label$38
       }
       HEAP32[(0 + 69432 | 0) >> 2] = $4_1 | $5_1 | 0;
       $0_1 = 8;
       $2_1 = 24;
       $5_1 = $3_1;
       break label$37;
      }
      $2_1 = $0_1 << (($2_1 | 0) == (31 | 0) ? 0 : 25 - ($2_1 >>> 1 | 0) | 0) | 0;
      $5_1 = HEAP32[$3_1 >> 2] | 0;
      label$39 : while (1) {
       $4_1 = $5_1;
       if (((HEAP32[($4_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
        break label$36
       }
       $5_1 = $2_1 >>> 29 | 0;
       $2_1 = $2_1 << 1 | 0;
       $3_1 = ($4_1 + ($5_1 & 4 | 0) | 0) + 16 | 0;
       $5_1 = HEAP32[$3_1 >> 2] | 0;
       if ($5_1) {
        continue label$39
       }
       break label$39;
      };
      $0_1 = 8;
      $2_1 = 24;
      $5_1 = $4_1;
     }
     $4_1 = $1_1;
     $6_1 = $4_1;
     break label$35;
    }
    $5_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
    HEAP32[($5_1 + 12 | 0) >> 2] = $1_1;
    $2_1 = 8;
    $3_1 = $4_1 + 8 | 0;
    $6_1 = 0;
    $0_1 = 24;
   }
   HEAP32[$3_1 >> 2] = $1_1;
   HEAP32[($1_1 + $2_1 | 0) >> 2] = $5_1;
   HEAP32[($1_1 + 12 | 0) >> 2] = $4_1;
   HEAP32[($1_1 + $0_1 | 0) >> 2] = $6_1;
   $1_1 = (HEAP32[(0 + 69460 | 0) >> 2] | 0) + -1 | 0;
   HEAP32[(0 + 69460 | 0) >> 2] = $1_1 ? $1_1 : -1;
  }
 }
 
 function $9($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $11_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $6(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
  label$1 : {
   if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0) == (0 | 0) & 1 | 0)) {
    break label$1
   }
   fimport$2();
   wasm2js_trap();
  }
  $11_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
  global$0 = $3_1 + 16 | 0;
  return $11_1 | 0;
 }
 
 function $10($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $8(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $11($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $9_1 = 0, $23_1 = 0, $39_1 = 0;
  $5_1 = global$0 - 32 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    if (!(HEAP32[($5_1 + 20 | 0) >> 2] | 0)) {
     break label$2
    }
    $9_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
    break label$1;
   }
   $9_1 = 1;
  }
  HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = $9_1;
  HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
  HEAP32[($5_1 + 8 | 0) >> 2] = Math_imul(HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0);
  $23_1 = $9(HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0) | 0;
  HEAP32[(HEAP32[($5_1 + 12 | 0) >> 2] | 0) >> 2] = $23_1;
  label$3 : {
   label$4 : {
    if ((HEAP32[(HEAP32[($5_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$4
    }
    HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] = 0;
    HEAP32[($5_1 + 28 | 0) >> 2] = 0;
    break label$3;
   }
   $5(HEAP32[(HEAP32[($5_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0, 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0) | 0;
   HEAP32[($5_1 + 28 | 0) >> 2] = 1;
  }
  $39_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
  global$0 = $5_1 + 32 | 0;
  return $39_1 | 0;
 }
 
 function $12($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $34_1 = 0, $39_1 = 0, $22_1 = 0, $46_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  label$1 : {
   if (!((HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) == (HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) & 1 | 0)) {
    break label$1
   }
   HEAP32[($3_1 + 4 | 0) >> 2] = HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0;
   HEAP32[$3_1 >> 2] = Math_imul(HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0);
   $22_1 = $9((HEAP32[$3_1 >> 2] | 0) << 1 | 0 | 0) | 0;
   HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] = $22_1;
   $5((HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0) + (HEAP32[$3_1 >> 2] | 0) | 0 | 0, 0 | 0, HEAP32[$3_1 >> 2] | 0 | 0) | 0;
   $4(HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 4 | 0) >> 2] | 0 | 0, HEAP32[$3_1 >> 2] | 0 | 0) | 0;
   $34_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
   HEAP32[($34_1 + 12 | 0) >> 2] = (HEAP32[($34_1 + 12 | 0) >> 2] | 0) << 1 | 0;
   $10(HEAP32[($3_1 + 4 | 0) >> 2] | 0 | 0);
  }
  $39_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
  HEAP32[($39_1 + 8 | 0) >> 2] = (HEAP32[($39_1 + 8 | 0) >> 2] | 0) + 1 | 0;
  $46_1 = (HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) - 1 | 0;
  global$0 = $3_1 + 16 | 0;
  return $46_1 | 0;
 }
 
 function $13($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $13_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $12(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
  HEAP32[($3_1 + 4 | 0) >> 2] = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  $13_1 = (HEAP32[(HEAP32[($3_1 + 4 | 0) >> 2] | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 8 | 0) >> 2] | 0, HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) | 0;
  global$0 = $3_1 + 16 | 0;
  return $13_1 | 0;
 }
 
 function $14($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $20_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  label$1 : {
   if (!((HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   $10(HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0 | 0);
   HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] = 0;
  }
  i64toi32_i32$0 = 0;
  $20_1 = 0;
  i64toi32_i32$1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $20_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = i64toi32_i32$1 + 8 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $20_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $15($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $33_1 = 0, $22_1 = 0, $24_1 = 0, $43_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$2
    }
    (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $9(HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) | 0), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
    label$3 : {
     if ((HEAP32[$4_1 >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$3
     }
     HEAP32[($4_1 + 12 | 0) >> 2] = 26;
     break label$1;
    }
    label$4 : {
     if (!(HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0)) {
      break label$4
     }
     if (!(HEAP32[($4_1 + 4 | 0) >> 2] | 0)) {
      break label$4
     }
     $22_1 = HEAP32[$4_1 >> 2] | 0;
     $24_1 = HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] | 0;
     label$5 : {
      label$6 : {
       if (!((HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 < (HEAP32[($4_1 + 4 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
        break label$6
       }
       $33_1 = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
       break label$5;
      }
      $33_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
     }
     $4($22_1 | 0, $24_1 | 0, $33_1 | 0) | 0;
    }
    $10(HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] | 0 | 0);
    HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] = HEAP32[$4_1 >> 2] | 0;
    HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  $43_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
  global$0 = $4_1 + 16 | 0;
  return $43_1 | 0;
 }
 
 function $16($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $18_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 32 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!(HEAP32[($5_1 + 16 | 0) >> 2] | 0)) {
      break label$3
     }
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $15(HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
     label$4 : {
      if (!(HEAP32[($5_1 + 12 | 0) >> 2] | 0)) {
       break label$4
      }
      HEAP32[($5_1 + 28 | 0) >> 2] = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
      break label$1;
     }
     $4(HEAP32[(HEAP32[($5_1 + 24 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0) | 0;
     break label$2;
    }
    $17(HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0);
   }
   HEAP32[($5_1 + 28 | 0) >> 2] = 0;
  }
  $18_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
  global$0 = $5_1 + 32 | 0;
  return $18_1 | 0;
 }
 
 function $17($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $10(HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0);
  HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = 0;
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $18($0_1) {
  $0_1 = $0_1 | 0;
  return 1 | 0;
 }
 
 function $19($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $20($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = HEAP32[($0_1 + 72 | 0) >> 2] | 0;
  HEAP32[($0_1 + 72 | 0) >> 2] = $1_1 + -1 | 0 | $1_1 | 0;
  label$1 : {
   $1_1 = HEAP32[$0_1 >> 2] | 0;
   if (!($1_1 & 8 | 0)) {
    break label$1
   }
   HEAP32[$0_1 >> 2] = $1_1 | 32 | 0;
   return -1 | 0;
  }
  HEAP32[($0_1 + 4 | 0) >> 2] = 0;
  HEAP32[($0_1 + 8 | 0) >> 2] = 0;
  $1_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
  HEAP32[($0_1 + 28 | 0) >> 2] = $1_1;
  HEAP32[($0_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($0_1 + 16 | 0) >> 2] = $1_1 + (HEAP32[($0_1 + 48 | 0) >> 2] | 0) | 0;
  return 0 | 0;
 }
 
 function $21($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0;
  $3_1 = ($2_1 | 0) != (0 | 0);
  label$1 : {
   label$2 : {
    label$3 : {
     if (!($0_1 & 3 | 0)) {
      break label$3
     }
     if (!$2_1) {
      break label$3
     }
     $4_1 = $1_1 & 255 | 0;
     label$4 : while (1) {
      if ((HEAPU8[$0_1 >> 0] | 0 | 0) == ($4_1 | 0)) {
       break label$2
      }
      $2_1 = $2_1 + -1 | 0;
      $3_1 = ($2_1 | 0) != (0 | 0);
      $0_1 = $0_1 + 1 | 0;
      if (!($0_1 & 3 | 0)) {
       break label$3
      }
      if ($2_1) {
       continue label$4
      }
      break label$4;
     };
    }
    if (!$3_1) {
     break label$1
    }
    label$5 : {
     if ((HEAPU8[$0_1 >> 0] | 0 | 0) == ($1_1 & 255 | 0 | 0)) {
      break label$5
     }
     if ($2_1 >>> 0 < 4 >>> 0) {
      break label$5
     }
     $4_1 = Math_imul($1_1 & 255 | 0, 16843009);
     label$6 : while (1) {
      $3_1 = (HEAP32[$0_1 >> 2] | 0) ^ $4_1 | 0;
      if ((($3_1 ^ -1 | 0) & ($3_1 + -16843009 | 0) | 0) & -2139062144 | 0) {
       break label$2
      }
      $0_1 = $0_1 + 4 | 0;
      $2_1 = $2_1 + -4 | 0;
      if ($2_1 >>> 0 > 3 >>> 0) {
       continue label$6
      }
      break label$6;
     };
    }
    if (!$2_1) {
     break label$1
    }
   }
   $3_1 = $1_1 & 255 | 0;
   label$7 : while (1) {
    label$8 : {
     if ((HEAPU8[$0_1 >> 0] | 0 | 0) != ($3_1 | 0)) {
      break label$8
     }
     return $0_1 | 0;
    }
    $0_1 = $0_1 + 1 | 0;
    $2_1 = $2_1 + -1 | 0;
    if ($2_1) {
     continue label$7
    }
    break label$7;
   };
  }
  return 0 | 0;
 }
 
 function $22($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0;
  $2_1 = $21($0_1 | 0, 0 | 0, $1_1 | 0) | 0;
  return ($2_1 ? $2_1 - $0_1 | 0 : $1_1) | 0;
 }
 
 function $23() {
  return 42 | 0;
 }
 
 function $24() {
  return $23() | 0 | 0;
 }
 
 function $25() {
  return 69980 | 0;
 }
 
 function $26() {
  var wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  HEAP32[(0 + 70076 | 0) >> 2] = 69956;
  (wasm2js_i32$0 = 0, wasm2js_i32$1 = $24() | 0), HEAP32[(wasm2js_i32$0 + 70004 | 0) >> 2] = wasm2js_i32$1;
 }
 
 function $27($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = 1;
  label$1 : {
   label$2 : {
    if (!$0_1) {
     break label$2
    }
    if ($1_1 >>> 0 <= 127 >>> 0) {
     break label$1
    }
    label$3 : {
     label$4 : {
      if (HEAP32[(HEAP32[(($25() | 0) + 96 | 0) >> 2] | 0) >> 2] | 0) {
       break label$4
      }
      if (($1_1 & -128 | 0 | 0) == (57216 | 0)) {
       break label$1
      }
      (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = 25), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
      break label$3;
     }
     label$5 : {
      if ($1_1 >>> 0 > 2047 >>> 0) {
       break label$5
      }
      HEAP8[($0_1 + 1 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 6 | 0 | 192 | 0;
      return 2 | 0;
     }
     label$6 : {
      label$7 : {
       if ($1_1 >>> 0 < 55296 >>> 0) {
        break label$7
       }
       if (($1_1 & -8192 | 0 | 0) != (57344 | 0)) {
        break label$6
       }
      }
      HEAP8[($0_1 + 2 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 12 | 0 | 224 | 0;
      HEAP8[($0_1 + 1 | 0) >> 0] = ($1_1 >>> 6 | 0) & 63 | 0 | 128 | 0;
      return 3 | 0;
     }
     label$8 : {
      if (($1_1 + -65536 | 0) >>> 0 > 1048575 >>> 0) {
       break label$8
      }
      HEAP8[($0_1 + 3 | 0) >> 0] = $1_1 & 63 | 0 | 128 | 0;
      HEAP8[$0_1 >> 0] = $1_1 >>> 18 | 0 | 240 | 0;
      HEAP8[($0_1 + 2 | 0) >> 0] = ($1_1 >>> 6 | 0) & 63 | 0 | 128 | 0;
      HEAP8[($0_1 + 1 | 0) >> 0] = ($1_1 >>> 12 | 0) & 63 | 0 | 128 | 0;
      return 4 | 0;
     }
     (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = 25), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
    }
    $3_1 = -1;
   }
   return $3_1 | 0;
  }
  HEAP8[$0_1 >> 0] = $1_1;
  return 1 | 0;
 }
 
 function $28($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  label$1 : {
   if ($0_1) {
    break label$1
   }
   return 0 | 0;
  }
  return $27($0_1 | 0, $1_1 | 0, 0 | 0) | 0 | 0;
 }
 
 function $29($0_1, $1_1) {
  $0_1 = +$0_1;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $3_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, $2_1 = 0, $10_1 = 0, $2$hi = 0;
  label$1 : {
   wasm2js_scratch_store_f64(+$0_1);
   i64toi32_i32$0 = wasm2js_scratch_load_i32(1 | 0) | 0;
   $2_1 = wasm2js_scratch_load_i32(0 | 0) | 0;
   $2$hi = i64toi32_i32$0;
   i64toi32_i32$2 = $2_1;
   i64toi32_i32$1 = 0;
   i64toi32_i32$3 = 52;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$1 = 0;
    $10_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   } else {
    i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
    $10_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
   }
   $3_1 = $10_1 & 2047 | 0;
   if (($3_1 | 0) == (2047 | 0)) {
    break label$1
   }
   label$2 : {
    if ($3_1) {
     break label$2
    }
    label$3 : {
     label$4 : {
      if ($0_1 != 0.0) {
       break label$4
      }
      $3_1 = 0;
      break label$3;
     }
     $0_1 = +$29(+($0_1 * 18446744073709551615.0), $1_1 | 0);
     $3_1 = (HEAP32[$1_1 >> 2] | 0) + -64 | 0;
    }
    HEAP32[$1_1 >> 2] = $3_1;
    return +$0_1;
   }
   HEAP32[$1_1 >> 2] = $3_1 + -1022 | 0;
   i64toi32_i32$1 = $2$hi;
   i64toi32_i32$0 = $2_1;
   i64toi32_i32$2 = -2146435073;
   i64toi32_i32$3 = -1;
   i64toi32_i32$2 = i64toi32_i32$1 & i64toi32_i32$2 | 0;
   i64toi32_i32$1 = i64toi32_i32$0 & i64toi32_i32$3 | 0;
   i64toi32_i32$0 = 1071644672;
   i64toi32_i32$3 = 0;
   i64toi32_i32$0 = i64toi32_i32$2 | i64toi32_i32$0 | 0;
   wasm2js_scratch_store_i32(0 | 0, i64toi32_i32$1 | i64toi32_i32$3 | 0 | 0);
   wasm2js_scratch_store_i32(1 | 0, i64toi32_i32$0 | 0);
   $0_1 = +wasm2js_scratch_load_f64();
  }
  return +$0_1;
 }
 
 function $30($0_1, $1_1, $1$hi, $2_1, $2$hi, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$1 = 0, i64toi32_i32$4 = 0, i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, i64toi32_i32$3 = 0, $4$hi = 0, $18_1 = 0, $20_1 = 0, $21_1 = 0, $22_1 = 0, $11$hi = 0, $18$hi = 0, $19_1 = 0, $19$hi = 0, $4_1 = 0, $24$hi = 0;
  label$1 : {
   label$2 : {
    if (!($3_1 & 64 | 0)) {
     break label$2
    }
    i64toi32_i32$0 = $1$hi;
    i64toi32_i32$0 = 0;
    $11$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $1$hi;
    i64toi32_i32$2 = $1_1;
    i64toi32_i32$1 = $11$hi;
    i64toi32_i32$3 = $3_1 + -64 | 0;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
     $18_1 = 0;
    } else {
     i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$4 | 0) | 0;
     $18_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
    }
    $2_1 = $18_1;
    $2$hi = i64toi32_i32$1;
    i64toi32_i32$1 = 0;
    $1_1 = 0;
    $1$hi = i64toi32_i32$1;
    break label$1;
   }
   if (!$3_1) {
    break label$1
   }
   i64toi32_i32$1 = $1$hi;
   i64toi32_i32$1 = 0;
   $18$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $1$hi;
   i64toi32_i32$0 = $1_1;
   i64toi32_i32$2 = $18$hi;
   i64toi32_i32$3 = 64 - $3_1 | 0;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$2 = 0;
    $20_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
   } else {
    i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
    $20_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
   }
   $19_1 = $20_1;
   $19$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $2$hi;
   i64toi32_i32$2 = 0;
   $4_1 = $3_1;
   $4$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $2$hi;
   i64toi32_i32$1 = $2_1;
   i64toi32_i32$0 = $4$hi;
   i64toi32_i32$3 = $3_1;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$0 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
    $21_1 = 0;
   } else {
    i64toi32_i32$0 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$1 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
    $21_1 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
   }
   $24$hi = i64toi32_i32$0;
   i64toi32_i32$0 = $19$hi;
   i64toi32_i32$2 = $19_1;
   i64toi32_i32$1 = $24$hi;
   i64toi32_i32$3 = $21_1;
   i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
   $2_1 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
   $2$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $1$hi;
   i64toi32_i32$1 = $4$hi;
   i64toi32_i32$1 = $1$hi;
   i64toi32_i32$0 = $1_1;
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$3 = $4_1;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$2 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
    $22_1 = 0;
   } else {
    i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
    $22_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
   }
   $1_1 = $22_1;
   $1$hi = i64toi32_i32$2;
  }
  i64toi32_i32$2 = $1$hi;
  i64toi32_i32$0 = $0_1;
  HEAP32[i64toi32_i32$0 >> 2] = $1_1;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$2;
  i64toi32_i32$2 = $2$hi;
  HEAP32[(i64toi32_i32$0 + 8 | 0) >> 2] = $2_1;
  HEAP32[(i64toi32_i32$0 + 12 | 0) >> 2] = i64toi32_i32$2;
 }
 
 function $31($0_1, $1_1, $1$hi, $2_1, $2$hi, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$4 = 0, i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $4$hi = 0, $18_1 = 0, $20_1 = 0, $21_1 = 0, $22_1 = 0, $11$hi = 0, $18$hi = 0, $19_1 = 0, $19$hi = 0, $4_1 = 0, $24$hi = 0;
  label$1 : {
   label$2 : {
    if (!($3_1 & 64 | 0)) {
     break label$2
    }
    i64toi32_i32$0 = $2$hi;
    i64toi32_i32$0 = 0;
    $11$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $2$hi;
    i64toi32_i32$2 = $2_1;
    i64toi32_i32$1 = $11$hi;
    i64toi32_i32$3 = $3_1 + -64 | 0;
    i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = 0;
     $18_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
     $18_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
    }
    $1_1 = $18_1;
    $1$hi = i64toi32_i32$1;
    i64toi32_i32$1 = 0;
    $2_1 = 0;
    $2$hi = i64toi32_i32$1;
    break label$1;
   }
   if (!$3_1) {
    break label$1
   }
   i64toi32_i32$1 = $2$hi;
   i64toi32_i32$1 = 0;
   $18$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $2$hi;
   i64toi32_i32$0 = $2_1;
   i64toi32_i32$2 = $18$hi;
   i64toi32_i32$3 = 64 - $3_1 | 0;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$2 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
    $20_1 = 0;
   } else {
    i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
    $20_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
   }
   $19_1 = $20_1;
   $19$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $1$hi;
   i64toi32_i32$2 = 0;
   $4_1 = $3_1;
   $4$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $1$hi;
   i64toi32_i32$1 = $1_1;
   i64toi32_i32$0 = $4$hi;
   i64toi32_i32$3 = $3_1;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$0 = 0;
    $21_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
   } else {
    i64toi32_i32$0 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
    $21_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$1 >>> i64toi32_i32$4 | 0) | 0;
   }
   $24$hi = i64toi32_i32$0;
   i64toi32_i32$0 = $19$hi;
   i64toi32_i32$2 = $19_1;
   i64toi32_i32$1 = $24$hi;
   i64toi32_i32$3 = $21_1;
   i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
   $1_1 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
   $1$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $2$hi;
   i64toi32_i32$1 = $4$hi;
   i64toi32_i32$1 = $2$hi;
   i64toi32_i32$0 = $2_1;
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$3 = $4_1;
   i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
    i64toi32_i32$2 = 0;
    $22_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
   } else {
    i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
    $22_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
   }
   $2_1 = $22_1;
   $2$hi = i64toi32_i32$2;
  }
  i64toi32_i32$2 = $1$hi;
  i64toi32_i32$0 = $0_1;
  HEAP32[i64toi32_i32$0 >> 2] = $1_1;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$2;
  i64toi32_i32$2 = $2$hi;
  HEAP32[(i64toi32_i32$0 + 8 | 0) >> 2] = $2_1;
  HEAP32[(i64toi32_i32$0 + 12 | 0) >> 2] = i64toi32_i32$2;
 }
 
 function $32($0_1, $0$hi, $1_1, $1$hi) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  $1$hi = $1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, i64toi32_i32$5 = 0, i64toi32_i32$3 = 0, i64toi32_i32$1 = 0, $4_1 = 0, $4$hi = 0, $5$hi = 0, $5_1 = 0, $2_1 = 0, $3_1 = 0, $44_1 = 0, $45_1 = 0, $46_1 = 0, $47_1 = 0, $48_1 = 0, $49_1 = 0, $50_1 = 0, $12_1 = 0, $12$hi = 0, $14$hi = 0, $17_1 = 0, $17$hi = 0, $19$hi = 0, $33_1 = 0, $33$hi = 0, $36_1 = 0, $38_1 = 0, $43_1 = 0, $43$hi = 0, $45$hi = 0, $73_1 = 0, $73$hi = 0, $77$hi = 0, $80_1 = 0, $80$hi = 0, $82_1 = 0, $82$hi = 0, $86_1 = 0, $86$hi = 0, $88_1 = 0, $89$hi = 0, $98$hi = 0, $105_1 = 0, $105$hi = 0;
  $2_1 = global$0 - 32 | 0;
  global$0 = $2_1;
  label$1 : {
   label$2 : {
    i64toi32_i32$0 = $1$hi;
    i64toi32_i32$2 = $1_1;
    i64toi32_i32$1 = 2147483647;
    i64toi32_i32$3 = -1;
    i64toi32_i32$1 = i64toi32_i32$0 & i64toi32_i32$1 | 0;
    $4_1 = i64toi32_i32$2 & i64toi32_i32$3 | 0;
    $4$hi = i64toi32_i32$1;
    i64toi32_i32$0 = $4_1;
    i64toi32_i32$2 = -1006698496;
    i64toi32_i32$3 = 0;
    i64toi32_i32$4 = i64toi32_i32$0 + i64toi32_i32$3 | 0;
    i64toi32_i32$5 = i64toi32_i32$1 + i64toi32_i32$2 | 0;
    if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
    }
    $12_1 = i64toi32_i32$4;
    $12$hi = i64toi32_i32$5;
    i64toi32_i32$5 = $4$hi;
    i64toi32_i32$1 = $4_1;
    i64toi32_i32$0 = -1140785152;
    i64toi32_i32$3 = 0;
    i64toi32_i32$2 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
    i64toi32_i32$4 = i64toi32_i32$5 + i64toi32_i32$0 | 0;
    if (i64toi32_i32$2 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$4 = i64toi32_i32$4 + 1 | 0
    }
    $14$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $12$hi;
    i64toi32_i32$5 = $12_1;
    i64toi32_i32$1 = $14$hi;
    i64toi32_i32$3 = i64toi32_i32$2;
    if (i64toi32_i32$4 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$5 >>> 0 >= i64toi32_i32$2 >>> 0 | 0) | 0) {
     break label$2
    }
    i64toi32_i32$5 = $0$hi;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$4 = 0;
    i64toi32_i32$1 = 60;
    i64toi32_i32$0 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$4 = 0;
     $44_1 = i64toi32_i32$5 >>> i64toi32_i32$0 | 0;
    } else {
     i64toi32_i32$4 = i64toi32_i32$5 >>> i64toi32_i32$0 | 0;
     $44_1 = (((1 << i64toi32_i32$0 | 0) - 1 | 0) & i64toi32_i32$5 | 0) << (32 - i64toi32_i32$0 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$0 | 0) | 0;
    }
    $17_1 = $44_1;
    $17$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $1$hi;
    i64toi32_i32$5 = $1_1;
    i64toi32_i32$3 = 0;
    i64toi32_i32$1 = 4;
    i64toi32_i32$0 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$3 = i64toi32_i32$5 << i64toi32_i32$0 | 0;
     $45_1 = 0;
    } else {
     i64toi32_i32$3 = ((1 << i64toi32_i32$0 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$0 | 0) | 0) | 0 | (i64toi32_i32$4 << i64toi32_i32$0 | 0) | 0;
     $45_1 = i64toi32_i32$5 << i64toi32_i32$0 | 0;
    }
    $19$hi = i64toi32_i32$3;
    i64toi32_i32$3 = $17$hi;
    i64toi32_i32$4 = $17_1;
    i64toi32_i32$5 = $19$hi;
    i64toi32_i32$1 = $45_1;
    i64toi32_i32$5 = i64toi32_i32$3 | i64toi32_i32$5 | 0;
    $4_1 = i64toi32_i32$4 | i64toi32_i32$1 | 0;
    $4$hi = i64toi32_i32$5;
    label$3 : {
     i64toi32_i32$5 = $0$hi;
     i64toi32_i32$3 = $0_1;
     i64toi32_i32$4 = 268435455;
     i64toi32_i32$1 = -1;
     i64toi32_i32$4 = i64toi32_i32$5 & i64toi32_i32$4 | 0;
     $0_1 = i64toi32_i32$3 & i64toi32_i32$1 | 0;
     $0$hi = i64toi32_i32$4;
     i64toi32_i32$5 = $0_1;
     i64toi32_i32$3 = 134217728;
     i64toi32_i32$1 = 1;
     if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$3 | 0) & i64toi32_i32$5 >>> 0 < i64toi32_i32$1 >>> 0 | 0) | 0) {
      break label$3
     }
     i64toi32_i32$5 = $4$hi;
     i64toi32_i32$1 = $4_1;
     i64toi32_i32$4 = 1073741824;
     i64toi32_i32$3 = 1;
     i64toi32_i32$0 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
     i64toi32_i32$2 = i64toi32_i32$5 + i64toi32_i32$4 | 0;
     if (i64toi32_i32$0 >>> 0 < i64toi32_i32$3 >>> 0) {
      i64toi32_i32$2 = i64toi32_i32$2 + 1 | 0
     }
     $5_1 = i64toi32_i32$0;
     $5$hi = i64toi32_i32$2;
     break label$1;
    }
    i64toi32_i32$2 = $4$hi;
    i64toi32_i32$5 = $4_1;
    i64toi32_i32$1 = 1073741824;
    i64toi32_i32$3 = 0;
    i64toi32_i32$4 = i64toi32_i32$5 + i64toi32_i32$3 | 0;
    i64toi32_i32$0 = i64toi32_i32$2 + i64toi32_i32$1 | 0;
    if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
     i64toi32_i32$0 = i64toi32_i32$0 + 1 | 0
    }
    $5_1 = i64toi32_i32$4;
    $5$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $0$hi;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$5 = 134217728;
    i64toi32_i32$3 = 0;
    if ((i64toi32_i32$2 | 0) != (i64toi32_i32$3 | 0) | (i64toi32_i32$0 | 0) != (i64toi32_i32$5 | 0) | 0) {
     break label$1
    }
    i64toi32_i32$2 = $5$hi;
    i64toi32_i32$2 = $4$hi;
    i64toi32_i32$3 = $4_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$5 = 1;
    i64toi32_i32$0 = i64toi32_i32$2 & i64toi32_i32$0 | 0;
    $33_1 = i64toi32_i32$3 & i64toi32_i32$5 | 0;
    $33$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $5$hi;
    i64toi32_i32$2 = i64toi32_i32$4;
    i64toi32_i32$3 = $33$hi;
    i64toi32_i32$5 = $33_1;
    i64toi32_i32$1 = i64toi32_i32$2 + i64toi32_i32$5 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 + i64toi32_i32$3 | 0;
    if (i64toi32_i32$1 >>> 0 < i64toi32_i32$5 >>> 0) {
     i64toi32_i32$4 = i64toi32_i32$4 + 1 | 0
    }
    $5_1 = i64toi32_i32$1;
    $5$hi = i64toi32_i32$4;
    break label$1;
   }
   label$4 : {
    i64toi32_i32$4 = $0$hi;
    $36_1 = !($0_1 | i64toi32_i32$4 | 0);
    i64toi32_i32$4 = $4$hi;
    i64toi32_i32$0 = $4_1;
    i64toi32_i32$2 = 2147418112;
    i64toi32_i32$5 = 0;
    $38_1 = i64toi32_i32$4 >>> 0 < i64toi32_i32$2 >>> 0 | ((i64toi32_i32$4 | 0) == (i64toi32_i32$2 | 0) & i64toi32_i32$0 >>> 0 < i64toi32_i32$5 >>> 0 | 0) | 0;
    i64toi32_i32$0 = i64toi32_i32$4;
    i64toi32_i32$0 = i64toi32_i32$4;
    i64toi32_i32$5 = $4_1;
    i64toi32_i32$4 = 2147418112;
    i64toi32_i32$2 = 0;
    if ((i64toi32_i32$5 | 0) == (i64toi32_i32$2 | 0) & (i64toi32_i32$0 | 0) == (i64toi32_i32$4 | 0) | 0 ? $36_1 : $38_1) {
     break label$4
    }
    i64toi32_i32$5 = $0$hi;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$4 = 60;
    i64toi32_i32$3 = i64toi32_i32$4 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$4 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = 0;
     $46_1 = i64toi32_i32$5 >>> i64toi32_i32$3 | 0;
    } else {
     i64toi32_i32$0 = i64toi32_i32$5 >>> i64toi32_i32$3 | 0;
     $46_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$5 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$3 | 0) | 0;
    }
    $43_1 = $46_1;
    $43$hi = i64toi32_i32$0;
    i64toi32_i32$0 = $1$hi;
    i64toi32_i32$5 = $1_1;
    i64toi32_i32$2 = 0;
    i64toi32_i32$4 = 4;
    i64toi32_i32$3 = i64toi32_i32$4 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$4 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$5 << i64toi32_i32$3 | 0;
     $47_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$3 | 0) | 0;
     $47_1 = i64toi32_i32$5 << i64toi32_i32$3 | 0;
    }
    $45$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $43$hi;
    i64toi32_i32$0 = $43_1;
    i64toi32_i32$5 = $45$hi;
    i64toi32_i32$4 = $47_1;
    i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
    i64toi32_i32$2 = i64toi32_i32$0 | i64toi32_i32$4 | 0;
    i64toi32_i32$0 = 524287;
    i64toi32_i32$4 = -1;
    i64toi32_i32$0 = i64toi32_i32$5 & i64toi32_i32$0 | 0;
    i64toi32_i32$5 = i64toi32_i32$2 & i64toi32_i32$4 | 0;
    i64toi32_i32$2 = 2146959360;
    i64toi32_i32$4 = 0;
    i64toi32_i32$2 = i64toi32_i32$0 | i64toi32_i32$2 | 0;
    $5_1 = i64toi32_i32$5 | i64toi32_i32$4 | 0;
    $5$hi = i64toi32_i32$2;
    break label$1;
   }
   i64toi32_i32$2 = 2146435072;
   $5_1 = 0;
   $5$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$0 = $4_1;
   i64toi32_i32$5 = 1140785151;
   i64toi32_i32$4 = -1;
   if (i64toi32_i32$2 >>> 0 > i64toi32_i32$5 >>> 0 | ((i64toi32_i32$2 | 0) == (i64toi32_i32$5 | 0) & i64toi32_i32$0 >>> 0 > i64toi32_i32$4 >>> 0 | 0) | 0) {
    break label$1
   }
   i64toi32_i32$0 = 0;
   $5_1 = 0;
   $5$hi = i64toi32_i32$0;
   i64toi32_i32$0 = i64toi32_i32$2;
   i64toi32_i32$0 = i64toi32_i32$2;
   i64toi32_i32$4 = $4_1;
   i64toi32_i32$2 = 0;
   i64toi32_i32$5 = 48;
   i64toi32_i32$3 = i64toi32_i32$5 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$5 & 63 | 0) >>> 0) {
    i64toi32_i32$2 = 0;
    $48_1 = i64toi32_i32$0 >>> i64toi32_i32$3 | 0;
   } else {
    i64toi32_i32$2 = i64toi32_i32$0 >>> i64toi32_i32$3 | 0;
    $48_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$4 >>> i64toi32_i32$3 | 0) | 0;
   }
   $3_1 = $48_1;
   if ($3_1 >>> 0 < 15249 >>> 0) {
    break label$1
   }
   i64toi32_i32$2 = $0$hi;
   i64toi32_i32$2 = $1$hi;
   i64toi32_i32$0 = $1_1;
   i64toi32_i32$4 = 65535;
   i64toi32_i32$5 = -1;
   i64toi32_i32$4 = i64toi32_i32$2 & i64toi32_i32$4 | 0;
   i64toi32_i32$2 = i64toi32_i32$0 & i64toi32_i32$5 | 0;
   i64toi32_i32$0 = 65536;
   i64toi32_i32$5 = 0;
   i64toi32_i32$0 = i64toi32_i32$4 | i64toi32_i32$0 | 0;
   $4_1 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
   $4$hi = i64toi32_i32$0;
   i64toi32_i32$0 = $0$hi;
   i64toi32_i32$2 = $4$hi;
   $30($2_1 + 16 | 0 | 0, $0_1 | 0, i64toi32_i32$0 | 0, $4_1 | 0, i64toi32_i32$2 | 0, $3_1 + -15233 | 0 | 0);
   i64toi32_i32$2 = i64toi32_i32$0;
   i64toi32_i32$2 = $4$hi;
   i64toi32_i32$2 = i64toi32_i32$0;
   i64toi32_i32$0 = $4$hi;
   $31($2_1 | 0, $0_1 | 0, i64toi32_i32$2 | 0, $4_1 | 0, i64toi32_i32$0 | 0, 15361 - $3_1 | 0 | 0);
   i64toi32_i32$4 = $2_1;
   i64toi32_i32$0 = HEAP32[i64toi32_i32$4 >> 2] | 0;
   i64toi32_i32$2 = HEAP32[(i64toi32_i32$4 + 4 | 0) >> 2] | 0;
   $4_1 = i64toi32_i32$0;
   $4$hi = i64toi32_i32$2;
   i64toi32_i32$4 = i64toi32_i32$0;
   i64toi32_i32$0 = 0;
   i64toi32_i32$5 = 60;
   i64toi32_i32$3 = i64toi32_i32$5 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$5 & 63 | 0) >>> 0) {
    i64toi32_i32$0 = 0;
    $49_1 = i64toi32_i32$2 >>> i64toi32_i32$3 | 0;
   } else {
    i64toi32_i32$0 = i64toi32_i32$2 >>> i64toi32_i32$3 | 0;
    $49_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$4 >>> i64toi32_i32$3 | 0) | 0;
   }
   $73_1 = $49_1;
   $73$hi = i64toi32_i32$0;
   i64toi32_i32$2 = $2_1 + 8 | 0;
   i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
   i64toi32_i32$4 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
   i64toi32_i32$2 = i64toi32_i32$0;
   i64toi32_i32$0 = 0;
   i64toi32_i32$5 = 4;
   i64toi32_i32$3 = i64toi32_i32$5 & 31 | 0;
   if (32 >>> 0 <= (i64toi32_i32$5 & 63 | 0) >>> 0) {
    i64toi32_i32$0 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
    $50_1 = 0;
   } else {
    i64toi32_i32$0 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$4 << i64toi32_i32$3 | 0) | 0;
    $50_1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
   }
   $77$hi = i64toi32_i32$0;
   i64toi32_i32$0 = $73$hi;
   i64toi32_i32$4 = $73_1;
   i64toi32_i32$2 = $77$hi;
   i64toi32_i32$5 = $50_1;
   i64toi32_i32$2 = i64toi32_i32$0 | i64toi32_i32$2 | 0;
   $5_1 = i64toi32_i32$4 | i64toi32_i32$5 | 0;
   $5$hi = i64toi32_i32$2;
   label$5 : {
    i64toi32_i32$2 = $4$hi;
    i64toi32_i32$0 = $4_1;
    i64toi32_i32$4 = 268435455;
    i64toi32_i32$5 = -1;
    i64toi32_i32$4 = i64toi32_i32$2 & i64toi32_i32$4 | 0;
    $80_1 = i64toi32_i32$0 & i64toi32_i32$5 | 0;
    $80$hi = i64toi32_i32$4;
    i64toi32_i32$2 = $2_1;
    i64toi32_i32$4 = HEAP32[(i64toi32_i32$2 + 16 | 0) >> 2] | 0;
    i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 20 | 0) >> 2] | 0;
    $82_1 = i64toi32_i32$4;
    $82$hi = i64toi32_i32$0;
    i64toi32_i32$2 = (i64toi32_i32$2 + 16 | 0) + 8 | 0;
    i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$4 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $86_1 = i64toi32_i32$0;
    $86$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $82$hi;
    i64toi32_i32$2 = $82_1;
    i64toi32_i32$0 = $86$hi;
    i64toi32_i32$5 = $86_1;
    i64toi32_i32$0 = i64toi32_i32$4 | i64toi32_i32$0 | 0;
    i64toi32_i32$4 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
    i64toi32_i32$2 = 0;
    i64toi32_i32$5 = 0;
    $88_1 = (i64toi32_i32$4 | 0) != (i64toi32_i32$5 | 0) | (i64toi32_i32$0 | 0) != (i64toi32_i32$2 | 0) | 0;
    i64toi32_i32$4 = 0;
    $89$hi = i64toi32_i32$4;
    i64toi32_i32$4 = $80$hi;
    i64toi32_i32$5 = $80_1;
    i64toi32_i32$0 = $89$hi;
    i64toi32_i32$2 = $88_1;
    i64toi32_i32$0 = i64toi32_i32$4 | i64toi32_i32$0 | 0;
    $4_1 = i64toi32_i32$5 | i64toi32_i32$2 | 0;
    $4$hi = i64toi32_i32$0;
    i64toi32_i32$4 = $4_1;
    i64toi32_i32$5 = 134217728;
    i64toi32_i32$2 = 1;
    if (i64toi32_i32$0 >>> 0 < i64toi32_i32$5 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$5 | 0) & i64toi32_i32$4 >>> 0 < i64toi32_i32$2 >>> 0 | 0) | 0) {
     break label$5
    }
    i64toi32_i32$4 = $5$hi;
    i64toi32_i32$2 = $5_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$5 = 1;
    i64toi32_i32$3 = i64toi32_i32$2 + i64toi32_i32$5 | 0;
    i64toi32_i32$1 = i64toi32_i32$4 + i64toi32_i32$0 | 0;
    if (i64toi32_i32$3 >>> 0 < i64toi32_i32$5 >>> 0) {
     i64toi32_i32$1 = i64toi32_i32$1 + 1 | 0
    }
    $5_1 = i64toi32_i32$3;
    $5$hi = i64toi32_i32$1;
    break label$1;
   }
   i64toi32_i32$1 = $4$hi;
   i64toi32_i32$4 = $4_1;
   i64toi32_i32$2 = 134217728;
   i64toi32_i32$5 = 0;
   if ((i64toi32_i32$4 | 0) != (i64toi32_i32$5 | 0) | (i64toi32_i32$1 | 0) != (i64toi32_i32$2 | 0) | 0) {
    break label$1
   }
   i64toi32_i32$4 = $5$hi;
   i64toi32_i32$5 = $5_1;
   i64toi32_i32$1 = 0;
   i64toi32_i32$2 = 1;
   i64toi32_i32$1 = i64toi32_i32$4 & i64toi32_i32$1 | 0;
   $98$hi = i64toi32_i32$1;
   i64toi32_i32$1 = i64toi32_i32$4;
   i64toi32_i32$1 = $98$hi;
   i64toi32_i32$4 = i64toi32_i32$5 & i64toi32_i32$2 | 0;
   i64toi32_i32$5 = $5$hi;
   i64toi32_i32$2 = $5_1;
   i64toi32_i32$0 = i64toi32_i32$4 + i64toi32_i32$2 | 0;
   i64toi32_i32$3 = i64toi32_i32$1 + i64toi32_i32$5 | 0;
   if (i64toi32_i32$0 >>> 0 < i64toi32_i32$2 >>> 0) {
    i64toi32_i32$3 = i64toi32_i32$3 + 1 | 0
   }
   $5_1 = i64toi32_i32$0;
   $5$hi = i64toi32_i32$3;
  }
  global$0 = $2_1 + 32 | 0;
  i64toi32_i32$3 = $5$hi;
  i64toi32_i32$3 = $1$hi;
  i64toi32_i32$1 = $1_1;
  i64toi32_i32$4 = -2147483648;
  i64toi32_i32$2 = 0;
  i64toi32_i32$4 = i64toi32_i32$3 & i64toi32_i32$4 | 0;
  $105_1 = i64toi32_i32$1 & i64toi32_i32$2 | 0;
  $105$hi = i64toi32_i32$4;
  i64toi32_i32$4 = $5$hi;
  i64toi32_i32$3 = $5_1;
  i64toi32_i32$1 = $105$hi;
  i64toi32_i32$2 = $105_1;
  i64toi32_i32$1 = i64toi32_i32$4 | i64toi32_i32$1 | 0;
  wasm2js_scratch_store_i32(0 | 0, i64toi32_i32$3 | i64toi32_i32$2 | 0 | 0);
  wasm2js_scratch_store_i32(1 | 0, i64toi32_i32$1 | 0);
  return +(+wasm2js_scratch_load_f64());
 }
 
 function $33($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $5_1 = 0;
  label$1 : {
   label$2 : {
    $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
    if ($3_1) {
     break label$2
    }
    $4_1 = 0;
    if ($20($2_1 | 0) | 0) {
     break label$1
    }
    $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
   }
   label$3 : {
    $4_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
    if (($3_1 - $4_1 | 0) >>> 0 >= $1_1 >>> 0) {
     break label$3
    }
    return FUNCTION_TABLE[HEAP32[($2_1 + 36 | 0) >> 2] | 0 | 0]($2_1, $0_1, $1_1) | 0 | 0;
   }
   label$4 : {
    label$5 : {
     if ((HEAP32[($2_1 + 80 | 0) >> 2] | 0 | 0) < (0 | 0)) {
      break label$5
     }
     if (!$1_1) {
      break label$5
     }
     $3_1 = $1_1;
     label$6 : {
      label$7 : while (1) {
       $5_1 = $0_1 + $3_1 | 0;
       if ((HEAPU8[($5_1 + -1 | 0) >> 0] | 0 | 0) == (10 | 0)) {
        break label$6
       }
       $3_1 = $3_1 + -1 | 0;
       if (!$3_1) {
        break label$5
       }
       continue label$7;
      };
     }
     $4_1 = FUNCTION_TABLE[HEAP32[($2_1 + 36 | 0) >> 2] | 0 | 0]($2_1, $0_1, $3_1) | 0;
     if ($4_1 >>> 0 < $3_1 >>> 0) {
      break label$1
     }
     $1_1 = $1_1 - $3_1 | 0;
     $4_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
     break label$4;
    }
    $5_1 = $0_1;
    $3_1 = 0;
   }
   $4($4_1 | 0, $5_1 | 0, $1_1 | 0) | 0;
   HEAP32[($2_1 + 20 | 0) >> 2] = (HEAP32[($2_1 + 20 | 0) >> 2] | 0) + $1_1 | 0;
   $4_1 = $3_1 + $1_1 | 0;
  }
  return $4_1 | 0;
 }
 
 function $34($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $5_1 = 0, i64toi32_i32$0 = 0, $8_1 = 0, $6_1 = 0, $7_1 = 0;
  $5_1 = global$0 - 208 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 204 | 0) >> 2] = $2_1;
  $5($5_1 + 160 | 0 | 0, 0 | 0, 40 | 0) | 0;
  HEAP32[($5_1 + 200 | 0) >> 2] = HEAP32[($5_1 + 204 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    if (($35(0 | 0, $1_1 | 0, $5_1 + 200 | 0 | 0, $5_1 + 80 | 0 | 0, $5_1 + 160 | 0 | 0, $3_1 | 0, $4_1 | 0) | 0 | 0) >= (0 | 0)) {
     break label$2
    }
    $4_1 = -1;
    break label$1;
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) >= (0 | 0)) {
      break label$4
     }
     $6_1 = 1;
     break label$3;
    }
    $6_1 = !($18($0_1 | 0) | 0);
   }
   $7_1 = HEAP32[$0_1 >> 2] | 0;
   HEAP32[$0_1 >> 2] = $7_1 & -33 | 0;
   label$5 : {
    label$6 : {
     label$7 : {
      label$8 : {
       if (HEAP32[($0_1 + 48 | 0) >> 2] | 0) {
        break label$8
       }
       HEAP32[($0_1 + 48 | 0) >> 2] = 80;
       HEAP32[($0_1 + 28 | 0) >> 2] = 0;
       i64toi32_i32$0 = 0;
       HEAP32[($0_1 + 16 | 0) >> 2] = 0;
       HEAP32[($0_1 + 20 | 0) >> 2] = i64toi32_i32$0;
       $8_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
       HEAP32[($0_1 + 44 | 0) >> 2] = $5_1;
       break label$7;
      }
      $8_1 = 0;
      if (HEAP32[($0_1 + 16 | 0) >> 2] | 0) {
       break label$6
      }
     }
     $2_1 = -1;
     if ($20($0_1 | 0) | 0) {
      break label$5
     }
    }
    $2_1 = $35($0_1 | 0, $1_1 | 0, $5_1 + 200 | 0 | 0, $5_1 + 80 | 0 | 0, $5_1 + 160 | 0 | 0, $3_1 | 0, $4_1 | 0) | 0;
   }
   $4_1 = $7_1 & 32 | 0;
   label$9 : {
    if (!$8_1) {
     break label$9
    }
    FUNCTION_TABLE[HEAP32[($0_1 + 36 | 0) >> 2] | 0 | 0]($0_1, 0, 0) | 0;
    HEAP32[($0_1 + 48 | 0) >> 2] = 0;
    HEAP32[($0_1 + 44 | 0) >> 2] = $8_1;
    HEAP32[($0_1 + 28 | 0) >> 2] = 0;
    $3_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
    i64toi32_i32$0 = 0;
    HEAP32[($0_1 + 16 | 0) >> 2] = 0;
    HEAP32[($0_1 + 20 | 0) >> 2] = i64toi32_i32$0;
    $2_1 = $3_1 ? $2_1 : -1;
   }
   $3_1 = HEAP32[$0_1 >> 2] | 0;
   HEAP32[$0_1 >> 2] = $3_1 | $4_1 | 0;
   $4_1 = $3_1 & 32 | 0 ? -1 : $2_1;
   if ($6_1) {
    break label$1
   }
   $19($0_1 | 0);
  }
  global$0 = $5_1 + 208 | 0;
  return $4_1 | 0;
 }
 
 function $35($0_1, $1_1, $2_1, $3_1, $4_1, $5_1, $6_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  $6_1 = $6_1 | 0;
  var $12_1 = 0, $7_1 = 0, $15_1 = 0, $20_1 = 0, i64toi32_i32$1 = 0, $17_1 = 0, $14_1 = 0, $13_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, $11_1 = 0, $16_1 = 0, $19_1 = 0, $22_1 = 0, i64toi32_i32$3 = 0, i64toi32_i32$5 = 0, $9_1 = 0, $18_1 = 0, $24_1 = 0, $10_1 = 0, $25_1 = 0, $25$hi = 0, $21_1 = 0, $23_1 = 0, $33_1 = 0, $34_1 = 0, $35_1 = 0, $8_1 = 0, $266 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $7_1 = global$0 - 80 | 0;
  global$0 = $7_1;
  HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
  $8_1 = $7_1 + 55 | 0;
  $9_1 = $7_1 + 56 | 0;
  $10_1 = 0;
  $11_1 = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : while (1) {
       $12_1 = 0;
       label$6 : while (1) {
        $13_1 = $1_1;
        if (($12_1 | 0) > ($11_1 ^ 2147483647 | 0 | 0)) {
         break label$4
        }
        $11_1 = $12_1 + $11_1 | 0;
        $12_1 = $1_1;
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             $14_1 = HEAPU8[$12_1 >> 0] | 0;
             if (!$14_1) {
              break label$11
             }
             label$12 : while (1) {
              label$13 : {
               label$14 : {
                label$15 : {
                 $14_1 = $14_1 & 255 | 0;
                 if ($14_1) {
                  break label$15
                 }
                 $1_1 = $12_1;
                 break label$14;
                }
                if (($14_1 | 0) != (37 | 0)) {
                 break label$13
                }
                $14_1 = $12_1;
                label$16 : while (1) {
                 label$17 : {
                  if ((HEAPU8[($14_1 + 1 | 0) >> 0] | 0 | 0) == (37 | 0)) {
                   break label$17
                  }
                  $1_1 = $14_1;
                  break label$14;
                 }
                 $12_1 = $12_1 + 1 | 0;
                 $15_1 = HEAPU8[($14_1 + 2 | 0) >> 0] | 0;
                 $1_1 = $14_1 + 2 | 0;
                 $14_1 = $1_1;
                 if (($15_1 | 0) == (37 | 0)) {
                  continue label$16
                 }
                 break label$16;
                };
               }
               $12_1 = $12_1 - $13_1 | 0;
               $14_1 = $11_1 ^ 2147483647 | 0;
               if (($12_1 | 0) > ($14_1 | 0)) {
                break label$4
               }
               label$18 : {
                if (!$0_1) {
                 break label$18
                }
                $36($0_1 | 0, $13_1 | 0, $12_1 | 0);
               }
               if ($12_1) {
                continue label$6
               }
               HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
               $12_1 = $1_1 + 1 | 0;
               $16_1 = -1;
               label$19 : {
                $15_1 = (HEAP8[($1_1 + 1 | 0) >> 0] | 0) + -48 | 0;
                if ($15_1 >>> 0 > 9 >>> 0) {
                 break label$19
                }
                if ((HEAPU8[($1_1 + 2 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                 break label$19
                }
                $12_1 = $1_1 + 3 | 0;
                $10_1 = 1;
                $16_1 = $15_1;
               }
               HEAP32[($7_1 + 76 | 0) >> 2] = $12_1;
               $17_1 = 0;
               label$20 : {
                label$21 : {
                 $18_1 = HEAP8[$12_1 >> 0] | 0;
                 $1_1 = $18_1 + -32 | 0;
                 if ($1_1 >>> 0 <= 31 >>> 0) {
                  break label$21
                 }
                 $15_1 = $12_1;
                 break label$20;
                }
                $17_1 = 0;
                $15_1 = $12_1;
                $1_1 = 1 << $1_1 | 0;
                if (!($1_1 & 75913 | 0)) {
                 break label$20
                }
                label$22 : while (1) {
                 $15_1 = $12_1 + 1 | 0;
                 HEAP32[($7_1 + 76 | 0) >> 2] = $15_1;
                 $17_1 = $1_1 | $17_1 | 0;
                 $18_1 = HEAP8[($12_1 + 1 | 0) >> 0] | 0;
                 $1_1 = $18_1 + -32 | 0;
                 if ($1_1 >>> 0 >= 32 >>> 0) {
                  break label$20
                 }
                 $12_1 = $15_1;
                 $1_1 = 1 << $1_1 | 0;
                 if ($1_1 & 75913 | 0) {
                  continue label$22
                 }
                 break label$22;
                };
               }
               label$23 : {
                label$24 : {
                 if (($18_1 | 0) != (42 | 0)) {
                  break label$24
                 }
                 label$25 : {
                  label$26 : {
                   $12_1 = (HEAP8[($15_1 + 1 | 0) >> 0] | 0) + -48 | 0;
                   if ($12_1 >>> 0 > 9 >>> 0) {
                    break label$26
                   }
                   if ((HEAPU8[($15_1 + 2 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                    break label$26
                   }
                   label$27 : {
                    label$28 : {
                     if ($0_1) {
                      break label$28
                     }
                     HEAP32[($4_1 + ($12_1 << 2 | 0) | 0) >> 2] = 10;
                     $19_1 = 0;
                     break label$27;
                    }
                    $19_1 = HEAP32[($3_1 + ($12_1 << 3 | 0) | 0) >> 2] | 0;
                   }
                   $1_1 = $15_1 + 3 | 0;
                   $10_1 = 1;
                   break label$25;
                  }
                  if ($10_1) {
                   break label$10
                  }
                  $1_1 = $15_1 + 1 | 0;
                  label$29 : {
                   if ($0_1) {
                    break label$29
                   }
                   HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                   $10_1 = 0;
                   $19_1 = 0;
                   break label$23;
                  }
                  $12_1 = HEAP32[$2_1 >> 2] | 0;
                  HEAP32[$2_1 >> 2] = $12_1 + 4 | 0;
                  $19_1 = HEAP32[$12_1 >> 2] | 0;
                  $10_1 = 0;
                 }
                 HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                 if (($19_1 | 0) > (-1 | 0)) {
                  break label$23
                 }
                 $19_1 = 0 - $19_1 | 0;
                 $17_1 = $17_1 | 8192 | 0;
                 break label$23;
                }
                $19_1 = $37($7_1 + 76 | 0 | 0) | 0;
                if (($19_1 | 0) < (0 | 0)) {
                 break label$4
                }
                $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
               }
               $12_1 = 0;
               $20_1 = -1;
               label$30 : {
                label$31 : {
                 if ((HEAPU8[$1_1 >> 0] | 0 | 0) == (46 | 0)) {
                  break label$31
                 }
                 $21_1 = 0;
                 break label$30;
                }
                label$32 : {
                 if ((HEAPU8[($1_1 + 1 | 0) >> 0] | 0 | 0) != (42 | 0)) {
                  break label$32
                 }
                 label$33 : {
                  label$34 : {
                   $15_1 = (HEAP8[($1_1 + 2 | 0) >> 0] | 0) + -48 | 0;
                   if ($15_1 >>> 0 > 9 >>> 0) {
                    break label$34
                   }
                   if ((HEAPU8[($1_1 + 3 | 0) >> 0] | 0 | 0) != (36 | 0)) {
                    break label$34
                   }
                   label$35 : {
                    label$36 : {
                     if ($0_1) {
                      break label$36
                     }
                     HEAP32[($4_1 + ($15_1 << 2 | 0) | 0) >> 2] = 10;
                     $20_1 = 0;
                     break label$35;
                    }
                    $20_1 = HEAP32[($3_1 + ($15_1 << 3 | 0) | 0) >> 2] | 0;
                   }
                   $1_1 = $1_1 + 4 | 0;
                   break label$33;
                  }
                  if ($10_1) {
                   break label$10
                  }
                  $1_1 = $1_1 + 2 | 0;
                  label$37 : {
                   if ($0_1) {
                    break label$37
                   }
                   $20_1 = 0;
                   break label$33;
                  }
                  $15_1 = HEAP32[$2_1 >> 2] | 0;
                  HEAP32[$2_1 >> 2] = $15_1 + 4 | 0;
                  $20_1 = HEAP32[$15_1 >> 2] | 0;
                 }
                 HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
                 $21_1 = ($20_1 | 0) > (-1 | 0);
                 break label$30;
                }
                HEAP32[($7_1 + 76 | 0) >> 2] = $1_1 + 1 | 0;
                $21_1 = 1;
                $20_1 = $37($7_1 + 76 | 0 | 0) | 0;
                $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
               }
               label$38 : while (1) {
                $15_1 = $12_1;
                $22_1 = 28;
                $18_1 = $1_1;
                $12_1 = HEAP8[$1_1 >> 0] | 0;
                if (($12_1 + -123 | 0) >>> 0 < -58 >>> 0) {
                 break label$3
                }
                $1_1 = $1_1 + 1 | 0;
                $12_1 = HEAPU8[(($12_1 + Math_imul($15_1, 58) | 0) + 68815 | 0) >> 0] | 0;
                if (($12_1 + -1 | 0) >>> 0 < 8 >>> 0) {
                 continue label$38
                }
                break label$38;
               };
               HEAP32[($7_1 + 76 | 0) >> 2] = $1_1;
               label$39 : {
                label$40 : {
                 if (($12_1 | 0) == (27 | 0)) {
                  break label$40
                 }
                 if (!$12_1) {
                  break label$3
                 }
                 label$41 : {
                  if (($16_1 | 0) < (0 | 0)) {
                   break label$41
                  }
                  label$42 : {
                   if ($0_1) {
                    break label$42
                   }
                   HEAP32[($4_1 + ($16_1 << 2 | 0) | 0) >> 2] = $12_1;
                   continue label$5;
                  }
                  i64toi32_i32$2 = $3_1 + ($16_1 << 3 | 0) | 0;
                  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
                  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
                  $266 = i64toi32_i32$0;
                  i64toi32_i32$0 = $7_1;
                  HEAP32[($7_1 + 64 | 0) >> 2] = $266;
                  HEAP32[($7_1 + 68 | 0) >> 2] = i64toi32_i32$1;
                  break label$39;
                 }
                 if (!$0_1) {
                  break label$7
                 }
                 $38($7_1 + 64 | 0 | 0, $12_1 | 0, $2_1 | 0, $6_1 | 0);
                 break label$39;
                }
                if (($16_1 | 0) > (-1 | 0)) {
                 break label$3
                }
                $12_1 = 0;
                if (!$0_1) {
                 continue label$6
                }
               }
               if ((HEAPU8[$0_1 >> 0] | 0) & 32 | 0) {
                break label$2
               }
               $23_1 = $17_1 & -65537 | 0;
               $17_1 = $17_1 & 8192 | 0 ? $23_1 : $17_1;
               $16_1 = 0;
               $24_1 = 65573;
               $22_1 = $9_1;
               label$43 : {
                label$44 : {
                 label$45 : {
                  label$46 : {
                   label$47 : {
                    label$48 : {
                     label$49 : {
                      label$50 : {
                       label$51 : {
                        label$52 : {
                         label$53 : {
                          label$54 : {
                           label$55 : {
                            label$56 : {
                             label$57 : {
                              label$58 : {
                               $12_1 = HEAP8[$18_1 >> 0] | 0;
                               $12_1 = $15_1 ? (($12_1 & 15 | 0 | 0) == (3 | 0) ? $12_1 & -45 | 0 : $12_1) : $12_1;
                               switch ($12_1 + -88 | 0 | 0) {
                               case 11:
                                break label$43;
                               case 9:
                               case 13:
                               case 14:
                               case 15:
                                break label$44;
                               case 27:
                                break label$49;
                               case 12:
                               case 17:
                                break label$52;
                               case 23:
                                break label$53;
                               case 0:
                               case 32:
                                break label$54;
                               case 24:
                                break label$55;
                               case 22:
                                break label$56;
                               case 29:
                                break label$57;
                               case 1:
                               case 2:
                               case 3:
                               case 4:
                               case 5:
                               case 6:
                               case 7:
                               case 8:
                               case 10:
                               case 16:
                               case 18:
                               case 19:
                               case 20:
                               case 21:
                               case 25:
                               case 26:
                               case 28:
                               case 30:
                               case 31:
                                break label$8;
                               default:
                                break label$58;
                               };
                              }
                              $22_1 = $9_1;
                              label$59 : {
                               switch ($12_1 + -65 | 0 | 0) {
                               case 0:
                               case 4:
                               case 5:
                               case 6:
                                break label$44;
                               case 2:
                                break label$47;
                               case 1:
                               case 3:
                                break label$8;
                               default:
                                break label$59;
                               };
                              }
                              if (($12_1 | 0) == (83 | 0)) {
                               break label$48
                              }
                              break label$9;
                             }
                             $16_1 = 0;
                             $24_1 = 65573;
                             i64toi32_i32$2 = $7_1;
                             i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                             i64toi32_i32$0 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                             $25_1 = i64toi32_i32$1;
                             $25$hi = i64toi32_i32$0;
                             break label$51;
                            }
                            $12_1 = 0;
                            label$60 : {
                             switch ($15_1 & 255 | 0 | 0) {
                             case 0:
                              HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
                              continue label$6;
                             case 1:
                              HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
                              continue label$6;
                             case 2:
                              i64toi32_i32$1 = $11_1;
                              i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
                              i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                              HEAP32[i64toi32_i32$1 >> 2] = $11_1;
                              HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
                              continue label$6;
                             case 3:
                              HEAP16[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 1] = $11_1;
                              continue label$6;
                             case 4:
                              HEAP8[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 0] = $11_1;
                              continue label$6;
                             case 6:
                              HEAP32[(HEAP32[($7_1 + 64 | 0) >> 2] | 0) >> 2] = $11_1;
                              continue label$6;
                             case 7:
                              break label$60;
                             default:
                              continue label$6;
                             };
                            }
                            i64toi32_i32$1 = $11_1;
                            i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
                            i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                            HEAP32[i64toi32_i32$1 >> 2] = $11_1;
                            HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
                            continue label$6;
                           }
                           $20_1 = $20_1 >>> 0 > 8 >>> 0 ? $20_1 : 8;
                           $17_1 = $17_1 | 8 | 0;
                           $12_1 = 120;
                          }
                          i64toi32_i32$2 = $7_1;
                          i64toi32_i32$0 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                          i64toi32_i32$1 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                          $13_1 = $39(i64toi32_i32$0 | 0, i64toi32_i32$1 | 0, $9_1 | 0, $12_1 & 32 | 0 | 0) | 0;
                          $16_1 = 0;
                          $24_1 = 65573;
                          i64toi32_i32$2 = $7_1;
                          i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                          i64toi32_i32$0 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                          if (!(i64toi32_i32$1 | i64toi32_i32$0 | 0)) {
                           break label$50
                          }
                          if (!($17_1 & 8 | 0)) {
                           break label$50
                          }
                          $24_1 = ($12_1 >>> 4 | 0) + 65573 | 0;
                          $16_1 = 2;
                          break label$50;
                         }
                         $16_1 = 0;
                         $24_1 = 65573;
                         i64toi32_i32$2 = $7_1;
                         i64toi32_i32$0 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                         i64toi32_i32$1 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                         $13_1 = $40(i64toi32_i32$0 | 0, i64toi32_i32$1 | 0, $9_1 | 0) | 0;
                         if (!($17_1 & 8 | 0)) {
                          break label$50
                         }
                         $12_1 = $9_1 - $13_1 | 0;
                         $20_1 = ($20_1 | 0) > ($12_1 | 0) ? $20_1 : $12_1 + 1 | 0;
                         break label$50;
                        }
                        label$67 : {
                         i64toi32_i32$2 = $7_1;
                         i64toi32_i32$1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                         i64toi32_i32$0 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                         $25_1 = i64toi32_i32$1;
                         $25$hi = i64toi32_i32$0;
                         i64toi32_i32$2 = i64toi32_i32$1;
                         i64toi32_i32$1 = -1;
                         i64toi32_i32$3 = -1;
                         if ((i64toi32_i32$0 | 0) > (i64toi32_i32$1 | 0)) {
                          $33_1 = 1
                         } else {
                          if ((i64toi32_i32$0 | 0) >= (i64toi32_i32$1 | 0)) {
                           if (i64toi32_i32$2 >>> 0 <= i64toi32_i32$3 >>> 0) {
                            $34_1 = 0
                           } else {
                            $34_1 = 1
                           }
                           $35_1 = $34_1;
                          } else {
                           $35_1 = 0
                          }
                          $33_1 = $35_1;
                         }
                         if ($33_1) {
                          break label$67
                         }
                         i64toi32_i32$2 = $25$hi;
                         i64toi32_i32$2 = 0;
                         i64toi32_i32$3 = 0;
                         i64toi32_i32$0 = $25$hi;
                         i64toi32_i32$1 = $25_1;
                         i64toi32_i32$5 = (i64toi32_i32$3 >>> 0 < i64toi32_i32$1 >>> 0) + i64toi32_i32$0 | 0;
                         i64toi32_i32$5 = i64toi32_i32$2 - i64toi32_i32$5 | 0;
                         $25_1 = i64toi32_i32$3 - i64toi32_i32$1 | 0;
                         $25$hi = i64toi32_i32$5;
                         i64toi32_i32$3 = $7_1;
                         HEAP32[($7_1 + 64 | 0) >> 2] = $25_1;
                         HEAP32[($7_1 + 68 | 0) >> 2] = i64toi32_i32$5;
                         $16_1 = 1;
                         $24_1 = 65573;
                         break label$51;
                        }
                        label$68 : {
                         if (!($17_1 & 2048 | 0)) {
                          break label$68
                         }
                         $16_1 = 1;
                         $24_1 = 65574;
                         break label$51;
                        }
                        $16_1 = $17_1 & 1 | 0;
                        $24_1 = $16_1 ? 65575 : 65573;
                       }
                       i64toi32_i32$5 = $25$hi;
                       $13_1 = $41($25_1 | 0, i64toi32_i32$5 | 0, $9_1 | 0) | 0;
                      }
                      if ($21_1 & ($20_1 | 0) < (0 | 0) | 0) {
                       break label$4
                      }
                      $17_1 = $21_1 ? $17_1 & -65537 | 0 : $17_1;
                      label$69 : {
                       i64toi32_i32$2 = $7_1;
                       i64toi32_i32$5 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                       i64toi32_i32$3 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                       $25_1 = i64toi32_i32$5;
                       $25$hi = i64toi32_i32$3;
                       i64toi32_i32$2 = i64toi32_i32$5;
                       i64toi32_i32$5 = 0;
                       i64toi32_i32$1 = 0;
                       if ((i64toi32_i32$2 | 0) != (i64toi32_i32$1 | 0) | (i64toi32_i32$3 | 0) != (i64toi32_i32$5 | 0) | 0) {
                        break label$69
                       }
                       if ($20_1) {
                        break label$69
                       }
                       $13_1 = $9_1;
                       $22_1 = $13_1;
                       $20_1 = 0;
                       break label$8;
                      }
                      i64toi32_i32$2 = $25$hi;
                      $12_1 = ($9_1 - $13_1 | 0) + !($25_1 | i64toi32_i32$2 | 0) | 0;
                      $20_1 = ($20_1 | 0) > ($12_1 | 0) ? $20_1 : $12_1;
                      break label$9;
                     }
                     $12_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                     $13_1 = $12_1 ? $12_1 : 68472;
                     $12_1 = $22($13_1 | 0, ($20_1 >>> 0 < 2147483647 >>> 0 ? $20_1 : 2147483647) | 0) | 0;
                     $22_1 = $13_1 + $12_1 | 0;
                     label$70 : {
                      if (($20_1 | 0) <= (-1 | 0)) {
                       break label$70
                      }
                      $17_1 = $23_1;
                      $20_1 = $12_1;
                      break label$8;
                     }
                     $17_1 = $23_1;
                     $20_1 = $12_1;
                     if (HEAPU8[$22_1 >> 0] | 0) {
                      break label$4
                     }
                     break label$8;
                    }
                    label$71 : {
                     if (!$20_1) {
                      break label$71
                     }
                     $14_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                     break label$46;
                    }
                    $12_1 = 0;
                    $42($0_1 | 0, 32 | 0, $19_1 | 0, 0 | 0, $17_1 | 0);
                    break label$45;
                   }
                   HEAP32[($7_1 + 12 | 0) >> 2] = 0;
                   i64toi32_i32$1 = $7_1;
                   i64toi32_i32$2 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                   i64toi32_i32$3 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
                   HEAP32[($7_1 + 8 | 0) >> 2] = i64toi32_i32$2;
                   HEAP32[($7_1 + 64 | 0) >> 2] = $7_1 + 8 | 0;
                   $14_1 = $7_1 + 8 | 0;
                   $20_1 = -1;
                  }
                  $12_1 = 0;
                  label$72 : {
                   label$73 : while (1) {
                    $15_1 = HEAP32[$14_1 >> 2] | 0;
                    if (!$15_1) {
                     break label$72
                    }
                    $15_1 = $28($7_1 + 4 | 0 | 0, $15_1 | 0) | 0;
                    if (($15_1 | 0) < (0 | 0)) {
                     break label$2
                    }
                    if ($15_1 >>> 0 > ($20_1 - $12_1 | 0) >>> 0) {
                     break label$72
                    }
                    $14_1 = $14_1 + 4 | 0;
                    $12_1 = $15_1 + $12_1 | 0;
                    if ($12_1 >>> 0 < $20_1 >>> 0) {
                     continue label$73
                    }
                    break label$73;
                   };
                  }
                  $22_1 = 61;
                  if (($12_1 | 0) < (0 | 0)) {
                   break label$3
                  }
                  $42($0_1 | 0, 32 | 0, $19_1 | 0, $12_1 | 0, $17_1 | 0);
                  label$74 : {
                   if ($12_1) {
                    break label$74
                   }
                   $12_1 = 0;
                   break label$45;
                  }
                  $15_1 = 0;
                  $14_1 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
                  label$75 : while (1) {
                   $13_1 = HEAP32[$14_1 >> 2] | 0;
                   if (!$13_1) {
                    break label$45
                   }
                   $13_1 = $28($7_1 + 4 | 0 | 0, $13_1 | 0) | 0;
                   $15_1 = $13_1 + $15_1 | 0;
                   if ($15_1 >>> 0 > $12_1 >>> 0) {
                    break label$45
                   }
                   $36($0_1 | 0, $7_1 + 4 | 0 | 0, $13_1 | 0);
                   $14_1 = $14_1 + 4 | 0;
                   if ($15_1 >>> 0 < $12_1 >>> 0) {
                    continue label$75
                   }
                   break label$75;
                  };
                 }
                 $42($0_1 | 0, 32 | 0, $19_1 | 0, $12_1 | 0, $17_1 ^ 8192 | 0 | 0);
                 $12_1 = ($19_1 | 0) > ($12_1 | 0) ? $19_1 : $12_1;
                 continue label$6;
                }
                if ($21_1 & ($20_1 | 0) < (0 | 0) | 0) {
                 break label$4
                }
                $22_1 = 61;
                $12_1 = FUNCTION_TABLE[$5_1 | 0]($0_1, +HEAPF64[($7_1 + 64 | 0) >> 3], $19_1, $20_1, $17_1, $12_1) | 0;
                if (($12_1 | 0) >= (0 | 0)) {
                 continue label$6
                }
                break label$3;
               }
               i64toi32_i32$1 = $7_1;
               i64toi32_i32$3 = HEAP32[($7_1 + 64 | 0) >> 2] | 0;
               i64toi32_i32$2 = HEAP32[($7_1 + 68 | 0) >> 2] | 0;
               HEAP8[($7_1 + 55 | 0) >> 0] = i64toi32_i32$3;
               $20_1 = 1;
               $13_1 = $8_1;
               $22_1 = $9_1;
               $17_1 = $23_1;
               break label$8;
              }
              $14_1 = HEAPU8[($12_1 + 1 | 0) >> 0] | 0;
              $12_1 = $12_1 + 1 | 0;
              continue label$12;
             };
            }
            if ($0_1) {
             break label$1
            }
            if (!$10_1) {
             break label$7
            }
            $12_1 = 1;
            label$76 : {
             label$77 : while (1) {
              $14_1 = HEAP32[($4_1 + ($12_1 << 2 | 0) | 0) >> 2] | 0;
              if (!$14_1) {
               break label$76
              }
              $38($3_1 + ($12_1 << 3 | 0) | 0 | 0, $14_1 | 0, $2_1 | 0, $6_1 | 0);
              $11_1 = 1;
              $12_1 = $12_1 + 1 | 0;
              if (($12_1 | 0) != (10 | 0)) {
               continue label$77
              }
              break label$1;
             };
            }
            $11_1 = 1;
            if ($12_1 >>> 0 >= 10 >>> 0) {
             break label$1
            }
            label$78 : while (1) {
             if (HEAP32[($4_1 + ($12_1 << 2 | 0) | 0) >> 2] | 0) {
              break label$10
             }
             $11_1 = 1;
             $12_1 = $12_1 + 1 | 0;
             if (($12_1 | 0) == (10 | 0)) {
              break label$1
             }
             continue label$78;
            };
           }
           $22_1 = 28;
           break label$3;
          }
          $22_1 = $9_1;
         }
         $1_1 = $22_1 - $13_1 | 0;
         $18_1 = ($20_1 | 0) > ($1_1 | 0) ? $20_1 : $1_1;
         if (($18_1 | 0) > ($16_1 ^ 2147483647 | 0 | 0)) {
          break label$4
         }
         $22_1 = 61;
         $15_1 = $16_1 + $18_1 | 0;
         $12_1 = ($19_1 | 0) > ($15_1 | 0) ? $19_1 : $15_1;
         if (($12_1 | 0) > ($14_1 | 0)) {
          break label$3
         }
         $42($0_1 | 0, 32 | 0, $12_1 | 0, $15_1 | 0, $17_1 | 0);
         $36($0_1 | 0, $24_1 | 0, $16_1 | 0);
         $42($0_1 | 0, 48 | 0, $12_1 | 0, $15_1 | 0, $17_1 ^ 65536 | 0 | 0);
         $42($0_1 | 0, 48 | 0, $18_1 | 0, $1_1 | 0, 0 | 0);
         $36($0_1 | 0, $13_1 | 0, $1_1 | 0);
         $42($0_1 | 0, 32 | 0, $12_1 | 0, $15_1 | 0, $17_1 ^ 8192 | 0 | 0);
         $1_1 = HEAP32[($7_1 + 76 | 0) >> 2] | 0;
         continue label$6;
        }
        break label$6;
       };
       break label$5;
      };
      $11_1 = 0;
      break label$1;
     }
     $22_1 = 61;
    }
    (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = $22_1), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
   }
   $11_1 = -1;
  }
  global$0 = $7_1 + 80 | 0;
  return $11_1 | 0;
 }
 
 function $36($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  label$1 : {
   if ((HEAPU8[$0_1 >> 0] | 0) & 32 | 0) {
    break label$1
   }
   $33($1_1 | 0, $2_1 | 0, $0_1 | 0) | 0;
  }
 }
 
 function $37($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $1_1 = 0, $2_1 = 0, $4_1 = 0, $5_1 = 0;
  $1_1 = 0;
  label$1 : {
   $2_1 = HEAP32[$0_1 >> 2] | 0;
   $3_1 = (HEAP8[$2_1 >> 0] | 0) + -48 | 0;
   if ($3_1 >>> 0 <= 9 >>> 0) {
    break label$1
   }
   return 0 | 0;
  }
  label$2 : while (1) {
   $4_1 = -1;
   label$3 : {
    if ($1_1 >>> 0 > 214748364 >>> 0) {
     break label$3
    }
    $1_1 = Math_imul($1_1, 10);
    $4_1 = $3_1 >>> 0 > ($1_1 ^ 2147483647 | 0) >>> 0 ? -1 : $3_1 + $1_1 | 0;
   }
   $3_1 = $2_1 + 1 | 0;
   HEAP32[$0_1 >> 2] = $3_1;
   $5_1 = HEAP8[($2_1 + 1 | 0) >> 0] | 0;
   $1_1 = $4_1;
   $2_1 = $3_1;
   $3_1 = $5_1 + -48 | 0;
   if ($3_1 >>> 0 < 10 >>> 0) {
    continue label$2
   }
   break label$2;
  };
  return $1_1 | 0;
 }
 
 function $38($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $21_1 = 0, $29_1 = 0, $37_1 = 0, $45_1 = 0, $55_1 = 0, $63_1 = 0, $71_1 = 0, $79_1 = 0, $87_1 = 0, $97_1 = 0, $105_1 = 0, $115_1 = 0, $125 = 0, $133 = 0, $141 = 0;
  label$1 : {
   switch ($1_1 + -9 | 0 | 0) {
   case 0:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    HEAP32[$0_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
    return;
   case 1:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = i64toi32_i32$0 >> 31 | 0;
    $21_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $21_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 2:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$0 = 0;
    $29_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $29_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 4:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = i64toi32_i32$0 >> 31 | 0;
    $37_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $37_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 5:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$0 = 0;
    $45_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $45_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 3:
    $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
    $55_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $55_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 6:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$1 = HEAP16[$1_1 >> 1] | 0;
    i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
    $63_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $63_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 7:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAPU16[$1_1 >> 1] | 0;
    i64toi32_i32$1 = 0;
    $71_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $71_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 8:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$1 = HEAP8[$1_1 >> 0] | 0;
    i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
    $79_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $79_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 9:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAPU8[$1_1 >> 0] | 0;
    i64toi32_i32$1 = 0;
    $87_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $87_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 10:
    $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
    i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$0 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
    $97_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $97_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 11:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = 0;
    $105_1 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $105_1;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 12:
    $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
    i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$0 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
    $115_1 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $115_1;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 13:
    $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
    $125 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $125;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 14:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$1 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
    $133 = i64toi32_i32$1;
    i64toi32_i32$1 = $0_1;
    HEAP32[i64toi32_i32$1 >> 2] = $133;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    return;
   case 15:
    $1_1 = HEAP32[$2_1 >> 2] | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 4 | 0;
    i64toi32_i32$0 = HEAP32[$1_1 >> 2] | 0;
    i64toi32_i32$1 = 0;
    $141 = i64toi32_i32$0;
    i64toi32_i32$0 = $0_1;
    HEAP32[i64toi32_i32$0 >> 2] = $141;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    return;
   case 16:
    $1_1 = ((HEAP32[$2_1 >> 2] | 0) + 7 | 0) & -8 | 0;
    HEAP32[$2_1 >> 2] = $1_1 + 8 | 0;
    HEAPF64[$0_1 >> 3] = +HEAPF64[$1_1 >> 3];
    return;
   case 17:
    FUNCTION_TABLE[$3_1 | 0]($0_1, $2_1);
    break;
   default:
    break label$1;
   };
  }
 }
 
 function $39($0_1, $0$hi, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, i64toi32_i32$4 = 0, i64toi32_i32$3 = 0, $10_1 = 0, $3_1 = 0;
  label$1 : {
   i64toi32_i32$0 = $0$hi;
   if (!($0_1 | i64toi32_i32$0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$0 = $0$hi;
    HEAP8[$1_1 >> 0] = HEAPU8[(($0_1 & 15 | 0) + 69344 | 0) >> 0] | 0 | $2_1 | 0;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 0;
    i64toi32_i32$3 = 15;
    $3_1 = i64toi32_i32$0 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$1 = 4;
    i64toi32_i32$4 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = 0;
     $10_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$0 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
     $10_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
    }
    $0_1 = $10_1;
    $0$hi = i64toi32_i32$0;
    if ($3_1) {
     continue label$2
    }
    break label$2;
   };
  }
  return $1_1 | 0;
 }
 
 function $40($0_1, $0$hi, $1_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, i64toi32_i32$4 = 0, i64toi32_i32$3 = 0, $9_1 = 0, $2_1 = 0;
  label$1 : {
   i64toi32_i32$0 = $0$hi;
   if (!($0_1 | i64toi32_i32$0 | 0)) {
    break label$1
   }
   label$2 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$0 = $0$hi;
    HEAP8[$1_1 >> 0] = $0_1 & 7 | 0 | 48 | 0;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 0;
    i64toi32_i32$3 = 7;
    $2_1 = i64toi32_i32$0 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$0 = 0;
    i64toi32_i32$1 = 3;
    i64toi32_i32$4 = i64toi32_i32$1 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$1 & 63 | 0) >>> 0) {
     i64toi32_i32$0 = 0;
     $9_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$0 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
     $9_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
    }
    $0_1 = $9_1;
    $0$hi = i64toi32_i32$0;
    if ($2_1) {
     continue label$2
    }
    break label$2;
   };
  }
  return $1_1 | 0;
 }
 
 function $41($0_1, $0$hi, $1_1) {
  $0_1 = $0_1 | 0;
  $0$hi = $0$hi | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $3_1 = 0, i64toi32_i32$5 = 0, i64toi32_i32$3 = 0, $2_1 = 0, $2$hi = 0, $4_1 = 0, $16_1 = 0, $16$hi = 0, $5_1 = 0;
  label$1 : {
   label$2 : {
    i64toi32_i32$0 = $0$hi;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$1 = 1;
    i64toi32_i32$3 = 0;
    if (i64toi32_i32$0 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$2 >>> 0 >= i64toi32_i32$3 >>> 0 | 0) | 0) {
     break label$2
    }
    i64toi32_i32$2 = i64toi32_i32$0;
    $2_1 = $0_1;
    $2$hi = i64toi32_i32$2;
    break label$1;
   }
   label$3 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    i64toi32_i32$2 = $0$hi;
    i64toi32_i32$0 = 0;
    i64toi32_i32$0 = __wasm_i64_udiv($0_1 | 0, i64toi32_i32$2 | 0, 10 | 0, i64toi32_i32$0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$HIGH_BITS;
    $2_1 = i64toi32_i32$0;
    $2$hi = i64toi32_i32$2;
    i64toi32_i32$0 = 0;
    i64toi32_i32$0 = __wasm_i64_mul($2_1 | 0, i64toi32_i32$2 | 0, 10 | 0, i64toi32_i32$0 | 0) | 0;
    i64toi32_i32$2 = i64toi32_i32$HIGH_BITS;
    $16_1 = i64toi32_i32$0;
    $16$hi = i64toi32_i32$2;
    i64toi32_i32$2 = $0$hi;
    i64toi32_i32$3 = $0_1;
    i64toi32_i32$0 = $16$hi;
    i64toi32_i32$1 = $16_1;
    i64toi32_i32$5 = ($0_1 >>> 0 < i64toi32_i32$1 >>> 0) + i64toi32_i32$0 | 0;
    i64toi32_i32$5 = i64toi32_i32$2 - i64toi32_i32$5 | 0;
    HEAP8[$1_1 >> 0] = $0_1 - i64toi32_i32$1 | 0 | 48 | 0;
    i64toi32_i32$5 = i64toi32_i32$2;
    i64toi32_i32$5 = i64toi32_i32$2;
    i64toi32_i32$2 = $0_1;
    i64toi32_i32$3 = 9;
    i64toi32_i32$1 = -1;
    $3_1 = i64toi32_i32$5 >>> 0 > i64toi32_i32$3 >>> 0 | ((i64toi32_i32$5 | 0) == (i64toi32_i32$3 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$1 >>> 0 | 0) | 0;
    i64toi32_i32$2 = $2$hi;
    $0_1 = $2_1;
    $0$hi = i64toi32_i32$2;
    if ($3_1) {
     continue label$3
    }
    break label$3;
   };
  }
  label$4 : {
   i64toi32_i32$2 = $2$hi;
   $3_1 = $2_1;
   if (!$3_1) {
    break label$4
   }
   label$5 : while (1) {
    $1_1 = $1_1 + -1 | 0;
    $4_1 = ($3_1 >>> 0) / (10 >>> 0) | 0;
    HEAP8[$1_1 >> 0] = $3_1 - Math_imul($4_1, 10) | 0 | 48 | 0;
    $5_1 = $3_1 >>> 0 > 9 >>> 0;
    $3_1 = $4_1;
    if ($5_1) {
     continue label$5
    }
    break label$5;
   };
  }
  return $1_1 | 0;
 }
 
 function $42($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 256 | 0;
  global$0 = $5_1;
  label$1 : {
   if (($2_1 | 0) <= ($3_1 | 0)) {
    break label$1
   }
   if ($4_1 & 73728 | 0) {
    break label$1
   }
   $3_1 = $2_1 - $3_1 | 0;
   $2_1 = $3_1 >>> 0 < 256 >>> 0;
   $5($5_1 | 0, $1_1 | 0, ($2_1 ? $3_1 : 256) | 0) | 0;
   label$2 : {
    if ($2_1) {
     break label$2
    }
    label$3 : while (1) {
     $36($0_1 | 0, $5_1 | 0, 256 | 0);
     $3_1 = $3_1 + -256 | 0;
     if ($3_1 >>> 0 > 255 >>> 0) {
      continue label$3
     }
     break label$3;
    };
   }
   $36($0_1 | 0, $5_1 | 0, $3_1 | 0);
  }
  global$0 = $5_1 + 256 | 0;
 }
 
 function $43($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $34($0_1 | 0, $1_1 | 0, $2_1 | 0, 1 | 0, 2 | 0) | 0 | 0;
 }
 
 function $44($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = +$1_1;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $10_1 = 0, $11_1 = 0, $12_1 = 0, $18_1 = 0, $6_1 = 0, $21_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $15_1 = 0, i64toi32_i32$4 = 0, $22_1 = 0, $23_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$5 = 0, $19_1 = 0, $17_1 = 0, $8_1 = 0, $26_1 = 0.0, $24_1 = 0, $13_1 = 0, $24$hi = 0, $14_1 = 0, $16_1 = 0, $20_1 = 0, $9_1 = 0, $7_1 = 0, $45_1 = 0, $46_1 = 0, $47_1 = 0, $25$hi = 0, $48_1 = 0, $25_1 = 0, $167 = 0, $169$hi = 0, $171$hi = 0, $173 = 0, $173$hi = 0, $175$hi = 0, $179 = 0, $179$hi = 0, $391 = 0.0, $855 = 0;
  $6_1 = global$0 - 560 | 0;
  global$0 = $6_1;
  $7_1 = 0;
  HEAP32[($6_1 + 44 | 0) >> 2] = 0;
  label$1 : {
   label$2 : {
    i64toi32_i32$0 = $46(+$1_1) | 0;
    i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    $24_1 = i64toi32_i32$0;
    $24$hi = i64toi32_i32$1;
    i64toi32_i32$2 = i64toi32_i32$0;
    i64toi32_i32$0 = -1;
    i64toi32_i32$3 = -1;
    if ((i64toi32_i32$1 | 0) > (i64toi32_i32$0 | 0)) {
     $45_1 = 1
    } else {
     if ((i64toi32_i32$1 | 0) >= (i64toi32_i32$0 | 0)) {
      if (i64toi32_i32$2 >>> 0 <= i64toi32_i32$3 >>> 0) {
       $46_1 = 0
      } else {
       $46_1 = 1
      }
      $47_1 = $46_1;
     } else {
      $47_1 = 0
     }
     $45_1 = $47_1;
    }
    if ($45_1) {
     break label$2
    }
    $8_1 = 1;
    $9_1 = 65583;
    $1_1 = -$1_1;
    i64toi32_i32$2 = $46(+$1_1) | 0;
    i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    $24_1 = i64toi32_i32$2;
    $24$hi = i64toi32_i32$1;
    break label$1;
   }
   label$3 : {
    if (!($4_1 & 2048 | 0)) {
     break label$3
    }
    $8_1 = 1;
    $9_1 = 65586;
    break label$1;
   }
   $8_1 = $4_1 & 1 | 0;
   $9_1 = $8_1 ? 65589 : 65584;
   $7_1 = !$8_1;
  }
  label$4 : {
   label$5 : {
    i64toi32_i32$1 = $24$hi;
    i64toi32_i32$3 = $24_1;
    i64toi32_i32$2 = 2146435072;
    i64toi32_i32$0 = 0;
    i64toi32_i32$2 = i64toi32_i32$1 & i64toi32_i32$2 | 0;
    i64toi32_i32$1 = i64toi32_i32$3 & i64toi32_i32$0 | 0;
    i64toi32_i32$3 = 2146435072;
    i64toi32_i32$0 = 0;
    if ((i64toi32_i32$1 | 0) != (i64toi32_i32$0 | 0) | (i64toi32_i32$2 | 0) != (i64toi32_i32$3 | 0) | 0) {
     break label$5
    }
    $10_1 = $8_1 + 3 | 0;
    $42($0_1 | 0, 32 | 0, $2_1 | 0, $10_1 | 0, $4_1 & -65537 | 0 | 0);
    $36($0_1 | 0, $9_1 | 0, $8_1 | 0);
    $11_1 = $5_1 & 32 | 0;
    $36($0_1 | 0, ($1_1 != $1_1 ? ($11_1 ? 66428 : 67639) : $11_1 ? 66727 : 67646) | 0, 3 | 0);
    $42($0_1 | 0, 32 | 0, $2_1 | 0, $10_1 | 0, $4_1 ^ 8192 | 0 | 0);
    $12_1 = ($10_1 | 0) > ($2_1 | 0) ? $10_1 : $2_1;
    break label$4;
   }
   $13_1 = $6_1 + 16 | 0;
   label$6 : {
    label$7 : {
     label$8 : {
      label$9 : {
       $1_1 = +$29(+$1_1, $6_1 + 44 | 0 | 0);
       $1_1 = $1_1 + $1_1;
       if ($1_1 == 0.0) {
        break label$9
       }
       $10_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
       HEAP32[($6_1 + 44 | 0) >> 2] = $10_1 + -1 | 0;
       $14_1 = $5_1 | 32 | 0;
       if (($14_1 | 0) != (97 | 0)) {
        break label$8
       }
       break label$6;
      }
      $14_1 = $5_1 | 32 | 0;
      if (($14_1 | 0) == (97 | 0)) {
       break label$6
      }
      $15_1 = ($3_1 | 0) < (0 | 0) ? 6 : $3_1;
      $16_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
      break label$7;
     }
     $16_1 = $10_1 + -29 | 0;
     HEAP32[($6_1 + 44 | 0) >> 2] = $16_1;
     $15_1 = ($3_1 | 0) < (0 | 0) ? 6 : $3_1;
     $1_1 = $1_1 * 268435456.0;
    }
    $17_1 = ($6_1 + 48 | 0) + (($16_1 | 0) < (0 | 0) ? 0 : 288) | 0;
    $11_1 = $17_1;
    label$10 : while (1) {
     label$11 : {
      label$12 : {
       if (!($1_1 < 4294967296.0 & $1_1 >= 0.0 | 0)) {
        break label$12
       }
       $10_1 = ~~$1_1 >>> 0;
       break label$11;
      }
      $10_1 = 0;
     }
     HEAP32[$11_1 >> 2] = $10_1;
     $11_1 = $11_1 + 4 | 0;
     $1_1 = ($1_1 - +($10_1 >>> 0)) * 1.0e9;
     if ($1_1 != 0.0) {
      continue label$10
     }
     break label$10;
    };
    label$13 : {
     label$14 : {
      if (($16_1 | 0) >= (1 | 0)) {
       break label$14
      }
      $3_1 = $16_1;
      $10_1 = $11_1;
      $18_1 = $17_1;
      break label$13;
     }
     $18_1 = $17_1;
     $3_1 = $16_1;
     label$15 : while (1) {
      $3_1 = $3_1 >>> 0 < 29 >>> 0 ? $3_1 : 29;
      label$16 : {
       $10_1 = $11_1 + -4 | 0;
       if ($10_1 >>> 0 < $18_1 >>> 0) {
        break label$16
       }
       i64toi32_i32$1 = 0;
       $25_1 = $3_1;
       $25$hi = i64toi32_i32$1;
       i64toi32_i32$1 = 0;
       $24_1 = 0;
       $24$hi = i64toi32_i32$1;
       label$17 : while (1) {
        $167 = $10_1;
        i64toi32_i32$0 = $10_1;
        i64toi32_i32$1 = HEAP32[$10_1 >> 2] | 0;
        i64toi32_i32$2 = 0;
        $169$hi = i64toi32_i32$2;
        i64toi32_i32$2 = $25$hi;
        i64toi32_i32$2 = $169$hi;
        i64toi32_i32$0 = i64toi32_i32$1;
        i64toi32_i32$1 = $25$hi;
        i64toi32_i32$3 = $25_1;
        i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
         i64toi32_i32$1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
         $48_1 = 0;
        } else {
         i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$0 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
         $48_1 = i64toi32_i32$0 << i64toi32_i32$4 | 0;
        }
        $171$hi = i64toi32_i32$1;
        i64toi32_i32$1 = $24$hi;
        i64toi32_i32$2 = $24_1;
        i64toi32_i32$0 = 0;
        i64toi32_i32$3 = -1;
        i64toi32_i32$0 = i64toi32_i32$1 & i64toi32_i32$0 | 0;
        $173 = i64toi32_i32$2 & i64toi32_i32$3 | 0;
        $173$hi = i64toi32_i32$0;
        i64toi32_i32$0 = $171$hi;
        i64toi32_i32$1 = $48_1;
        i64toi32_i32$2 = $173$hi;
        i64toi32_i32$3 = $173;
        i64toi32_i32$4 = i64toi32_i32$1 + i64toi32_i32$3 | 0;
        i64toi32_i32$5 = i64toi32_i32$0 + i64toi32_i32$2 | 0;
        if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
         i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
        }
        $24_1 = i64toi32_i32$4;
        $24$hi = i64toi32_i32$5;
        $175$hi = i64toi32_i32$5;
        i64toi32_i32$1 = 0;
        i64toi32_i32$1 = __wasm_i64_udiv(i64toi32_i32$4 | 0, i64toi32_i32$5 | 0, 1e9 | 0, i64toi32_i32$1 | 0) | 0;
        i64toi32_i32$5 = i64toi32_i32$HIGH_BITS;
        $24_1 = i64toi32_i32$1;
        $24$hi = i64toi32_i32$5;
        i64toi32_i32$1 = 0;
        i64toi32_i32$1 = __wasm_i64_mul($24_1 | 0, i64toi32_i32$5 | 0, 1e9 | 0, i64toi32_i32$1 | 0) | 0;
        i64toi32_i32$5 = i64toi32_i32$HIGH_BITS;
        $179 = i64toi32_i32$1;
        $179$hi = i64toi32_i32$5;
        i64toi32_i32$5 = $175$hi;
        i64toi32_i32$0 = i64toi32_i32$4;
        i64toi32_i32$1 = $179$hi;
        i64toi32_i32$3 = $179;
        i64toi32_i32$2 = i64toi32_i32$0 - i64toi32_i32$3 | 0;
        i64toi32_i32$4 = (i64toi32_i32$0 >>> 0 < i64toi32_i32$3 >>> 0) + i64toi32_i32$1 | 0;
        i64toi32_i32$4 = i64toi32_i32$5 - i64toi32_i32$4 | 0;
        HEAP32[$167 >> 2] = i64toi32_i32$2;
        $10_1 = $10_1 + -4 | 0;
        if ($10_1 >>> 0 >= $18_1 >>> 0) {
         continue label$17
        }
        break label$17;
       };
       i64toi32_i32$4 = $24$hi;
       $10_1 = $24_1;
       if (!$10_1) {
        break label$16
       }
       $18_1 = $18_1 + -4 | 0;
       HEAP32[$18_1 >> 2] = $10_1;
      }
      label$18 : {
       label$19 : while (1) {
        $10_1 = $11_1;
        if ($10_1 >>> 0 <= $18_1 >>> 0) {
         break label$18
        }
        $11_1 = $10_1 + -4 | 0;
        if (!(HEAP32[$11_1 >> 2] | 0)) {
         continue label$19
        }
        break label$19;
       };
      }
      $3_1 = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) - $3_1 | 0;
      HEAP32[($6_1 + 44 | 0) >> 2] = $3_1;
      $11_1 = $10_1;
      if (($3_1 | 0) > (0 | 0)) {
       continue label$15
      }
      break label$15;
     };
    }
    label$20 : {
     if (($3_1 | 0) > (-1 | 0)) {
      break label$20
     }
     $19_1 = ((($15_1 + 25 | 0) >>> 0) / (9 >>> 0) | 0) + 1 | 0;
     $20_1 = ($14_1 | 0) == (102 | 0);
     label$21 : while (1) {
      $11_1 = 0 - $3_1 | 0;
      $21_1 = $11_1 >>> 0 < 9 >>> 0 ? $11_1 : 9;
      label$22 : {
       label$23 : {
        if ($18_1 >>> 0 < $10_1 >>> 0) {
         break label$23
        }
        $11_1 = !(HEAP32[$18_1 >> 2] | 0) << 2 | 0;
        break label$22;
       }
       $22_1 = 1e9 >>> $21_1 | 0;
       $23_1 = (-1 << $21_1 | 0) ^ -1 | 0;
       $3_1 = 0;
       $11_1 = $18_1;
       label$24 : while (1) {
        $12_1 = HEAP32[$11_1 >> 2] | 0;
        HEAP32[$11_1 >> 2] = ($12_1 >>> $21_1 | 0) + $3_1 | 0;
        $3_1 = Math_imul($12_1 & $23_1 | 0, $22_1);
        $11_1 = $11_1 + 4 | 0;
        if ($11_1 >>> 0 < $10_1 >>> 0) {
         continue label$24
        }
        break label$24;
       };
       $11_1 = !(HEAP32[$18_1 >> 2] | 0) << 2 | 0;
       if (!$3_1) {
        break label$22
       }
       HEAP32[$10_1 >> 2] = $3_1;
       $10_1 = $10_1 + 4 | 0;
      }
      $3_1 = (HEAP32[($6_1 + 44 | 0) >> 2] | 0) + $21_1 | 0;
      HEAP32[($6_1 + 44 | 0) >> 2] = $3_1;
      $18_1 = $18_1 + $11_1 | 0;
      $11_1 = $20_1 ? $17_1 : $18_1;
      $10_1 = (($10_1 - $11_1 | 0) >> 2 | 0 | 0) > ($19_1 | 0) ? $11_1 + ($19_1 << 2 | 0) | 0 : $10_1;
      if (($3_1 | 0) < (0 | 0)) {
       continue label$21
      }
      break label$21;
     };
    }
    $3_1 = 0;
    label$25 : {
     if ($18_1 >>> 0 >= $10_1 >>> 0) {
      break label$25
     }
     $3_1 = Math_imul(($17_1 - $18_1 | 0) >> 2 | 0, 9);
     $11_1 = 10;
     $12_1 = HEAP32[$18_1 >> 2] | 0;
     if ($12_1 >>> 0 < 10 >>> 0) {
      break label$25
     }
     label$26 : while (1) {
      $3_1 = $3_1 + 1 | 0;
      $11_1 = Math_imul($11_1, 10);
      if ($12_1 >>> 0 >= $11_1 >>> 0) {
       continue label$26
      }
      break label$26;
     };
    }
    label$27 : {
     $11_1 = ($15_1 - (($14_1 | 0) == (102 | 0) ? 0 : $3_1) | 0) - (($15_1 | 0) != (0 | 0) & ($14_1 | 0) == (103 | 0) | 0) | 0;
     if (($11_1 | 0) >= (Math_imul(($10_1 - $17_1 | 0) >> 2 | 0, 9) + -9 | 0 | 0)) {
      break label$27
     }
     $12_1 = $11_1 + 9216 | 0;
     $22_1 = ($12_1 | 0) / (9 | 0) | 0;
     $19_1 = (($6_1 + 48 | 0) + (($16_1 | 0) < (0 | 0) ? 4 : 292) | 0) + ($22_1 << 2 | 0) | 0;
     $21_1 = $19_1 + -4096 | 0;
     $11_1 = 10;
     label$28 : {
      $12_1 = $12_1 - Math_imul($22_1, 9) | 0;
      if (($12_1 | 0) > (7 | 0)) {
       break label$28
      }
      label$29 : while (1) {
       $11_1 = Math_imul($11_1, 10);
       $12_1 = $12_1 + 1 | 0;
       if (($12_1 | 0) != (8 | 0)) {
        continue label$29
       }
       break label$29;
      };
     }
     $23_1 = $19_1 + -4092 | 0;
     label$30 : {
      label$31 : {
       $12_1 = HEAP32[$21_1 >> 2] | 0;
       $20_1 = ($12_1 >>> 0) / ($11_1 >>> 0) | 0;
       $22_1 = $12_1 - Math_imul($20_1, $11_1) | 0;
       if ($22_1) {
        break label$31
       }
       if (($23_1 | 0) == ($10_1 | 0)) {
        break label$30
       }
      }
      label$32 : {
       label$33 : {
        if ($20_1 & 1 | 0) {
         break label$33
        }
        $1_1 = 9007199254740992.0;
        if (($11_1 | 0) != (1e9 | 0)) {
         break label$32
        }
        if ($21_1 >>> 0 <= $18_1 >>> 0) {
         break label$32
        }
        if (!((HEAPU8[($19_1 + -4100 | 0) >> 0] | 0) & 1 | 0)) {
         break label$32
        }
       }
       $1_1 = 9007199254740994.0;
      }
      $391 = ($23_1 | 0) == ($10_1 | 0) ? 1.0 : 1.5;
      $23_1 = $11_1 >>> 1 | 0;
      $26_1 = $22_1 >>> 0 < $23_1 >>> 0 ? .5 : ($22_1 | 0) == ($23_1 | 0) ? $391 : 1.5;
      label$34 : {
       if ($7_1) {
        break label$34
       }
       if ((HEAPU8[$9_1 >> 0] | 0 | 0) != (45 | 0)) {
        break label$34
       }
       $26_1 = -$26_1;
       $1_1 = -$1_1;
      }
      $12_1 = $12_1 - $22_1 | 0;
      HEAP32[$21_1 >> 2] = $12_1;
      if ($1_1 + $26_1 == $1_1) {
       break label$30
      }
      $11_1 = $12_1 + $11_1 | 0;
      HEAP32[$21_1 >> 2] = $11_1;
      label$35 : {
       if ($11_1 >>> 0 < 1e9 >>> 0) {
        break label$35
       }
       label$36 : while (1) {
        HEAP32[$21_1 >> 2] = 0;
        label$37 : {
         $21_1 = $21_1 + -4 | 0;
         if ($21_1 >>> 0 >= $18_1 >>> 0) {
          break label$37
         }
         $18_1 = $18_1 + -4 | 0;
         HEAP32[$18_1 >> 2] = 0;
        }
        $11_1 = (HEAP32[$21_1 >> 2] | 0) + 1 | 0;
        HEAP32[$21_1 >> 2] = $11_1;
        if ($11_1 >>> 0 > 999999999 >>> 0) {
         continue label$36
        }
        break label$36;
       };
      }
      $3_1 = Math_imul(($17_1 - $18_1 | 0) >> 2 | 0, 9);
      $11_1 = 10;
      $12_1 = HEAP32[$18_1 >> 2] | 0;
      if ($12_1 >>> 0 < 10 >>> 0) {
       break label$30
      }
      label$38 : while (1) {
       $3_1 = $3_1 + 1 | 0;
       $11_1 = Math_imul($11_1, 10);
       if ($12_1 >>> 0 >= $11_1 >>> 0) {
        continue label$38
       }
       break label$38;
      };
     }
     $11_1 = $21_1 + 4 | 0;
     $10_1 = $10_1 >>> 0 > $11_1 >>> 0 ? $11_1 : $10_1;
    }
    label$39 : {
     label$40 : while (1) {
      $11_1 = $10_1;
      $12_1 = $10_1 >>> 0 <= $18_1 >>> 0;
      if ($12_1) {
       break label$39
      }
      $10_1 = $10_1 + -4 | 0;
      if (!(HEAP32[$10_1 >> 2] | 0)) {
       continue label$40
      }
      break label$40;
     };
    }
    label$41 : {
     label$42 : {
      if (($14_1 | 0) == (103 | 0)) {
       break label$42
      }
      $21_1 = $4_1 & 8 | 0;
      break label$41;
     }
     $10_1 = $15_1 ? $15_1 : 1;
     $21_1 = ($10_1 | 0) > ($3_1 | 0) & ($3_1 | 0) > (-5 | 0) | 0;
     $15_1 = ($21_1 ? $3_1 ^ -1 | 0 : -1) + $10_1 | 0;
     $5_1 = ($21_1 ? -1 : -2) + $5_1 | 0;
     $21_1 = $4_1 & 8 | 0;
     if ($21_1) {
      break label$41
     }
     $10_1 = -9;
     label$43 : {
      if ($12_1) {
       break label$43
      }
      $21_1 = HEAP32[($11_1 + -4 | 0) >> 2] | 0;
      if (!$21_1) {
       break label$43
      }
      $12_1 = 10;
      $10_1 = 0;
      if (($21_1 >>> 0) % (10 >>> 0) | 0) {
       break label$43
      }
      label$44 : while (1) {
       $22_1 = $10_1;
       $10_1 = $10_1 + 1 | 0;
       $12_1 = Math_imul($12_1, 10);
       if (!(($21_1 >>> 0) % ($12_1 >>> 0) | 0)) {
        continue label$44
       }
       break label$44;
      };
      $10_1 = $22_1 ^ -1 | 0;
     }
     $12_1 = Math_imul(($11_1 - $17_1 | 0) >> 2 | 0, 9);
     label$45 : {
      if (($5_1 & -33 | 0 | 0) != (70 | 0)) {
       break label$45
      }
      $21_1 = 0;
      $10_1 = ($12_1 + $10_1 | 0) + -9 | 0;
      $10_1 = ($10_1 | 0) > (0 | 0) ? $10_1 : 0;
      $15_1 = ($15_1 | 0) < ($10_1 | 0) ? $15_1 : $10_1;
      break label$41;
     }
     $21_1 = 0;
     $10_1 = (($3_1 + $12_1 | 0) + $10_1 | 0) + -9 | 0;
     $10_1 = ($10_1 | 0) > (0 | 0) ? $10_1 : 0;
     $15_1 = ($15_1 | 0) < ($10_1 | 0) ? $15_1 : $10_1;
    }
    $12_1 = -1;
    $22_1 = $15_1 | $21_1 | 0;
    if (($15_1 | 0) > (($22_1 ? 2147483645 : 2147483646) | 0)) {
     break label$4
    }
    $23_1 = ($15_1 + (($22_1 | 0) != (0 | 0)) | 0) + 1 | 0;
    label$46 : {
     label$47 : {
      $20_1 = $5_1 & -33 | 0;
      if (($20_1 | 0) != (70 | 0)) {
       break label$47
      }
      if (($3_1 | 0) > ($23_1 ^ 2147483647 | 0 | 0)) {
       break label$4
      }
      $10_1 = ($3_1 | 0) > (0 | 0) ? $3_1 : 0;
      break label$46;
     }
     label$48 : {
      $10_1 = $3_1 >> 31 | 0;
      i64toi32_i32$4 = 0;
      $10_1 = $41(($3_1 ^ $10_1 | 0) - $10_1 | 0 | 0, i64toi32_i32$4 | 0, $13_1 | 0) | 0;
      if (($13_1 - $10_1 | 0 | 0) > (1 | 0)) {
       break label$48
      }
      label$49 : while (1) {
       $10_1 = $10_1 + -1 | 0;
       HEAP8[$10_1 >> 0] = 48;
       if (($13_1 - $10_1 | 0 | 0) < (2 | 0)) {
        continue label$49
       }
       break label$49;
      };
     }
     $19_1 = $10_1 + -2 | 0;
     HEAP8[$19_1 >> 0] = $5_1;
     $12_1 = -1;
     HEAP8[($10_1 + -1 | 0) >> 0] = ($3_1 | 0) < (0 | 0) ? 45 : 43;
     $10_1 = $13_1 - $19_1 | 0;
     if (($10_1 | 0) > ($23_1 ^ 2147483647 | 0 | 0)) {
      break label$4
     }
    }
    $12_1 = -1;
    $10_1 = $10_1 + $23_1 | 0;
    if (($10_1 | 0) > ($8_1 ^ 2147483647 | 0 | 0)) {
     break label$4
    }
    $23_1 = $10_1 + $8_1 | 0;
    $42($0_1 | 0, 32 | 0, $2_1 | 0, $23_1 | 0, $4_1 | 0);
    $36($0_1 | 0, $9_1 | 0, $8_1 | 0);
    $42($0_1 | 0, 48 | 0, $2_1 | 0, $23_1 | 0, $4_1 ^ 65536 | 0 | 0);
    label$50 : {
     label$51 : {
      label$52 : {
       label$53 : {
        if (($20_1 | 0) != (70 | 0)) {
         break label$53
        }
        $21_1 = $6_1 + 16 | 0 | 8 | 0;
        $3_1 = $6_1 + 16 | 0 | 9 | 0;
        $12_1 = $18_1 >>> 0 > $17_1 >>> 0 ? $17_1 : $18_1;
        $18_1 = $12_1;
        label$54 : while (1) {
         i64toi32_i32$5 = $18_1;
         i64toi32_i32$4 = HEAP32[$18_1 >> 2] | 0;
         i64toi32_i32$0 = 0;
         $10_1 = $41(i64toi32_i32$4 | 0, i64toi32_i32$0 | 0, $3_1 | 0) | 0;
         label$55 : {
          label$56 : {
           if (($18_1 | 0) == ($12_1 | 0)) {
            break label$56
           }
           if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
            break label$55
           }
           label$57 : while (1) {
            $10_1 = $10_1 + -1 | 0;
            HEAP8[$10_1 >> 0] = 48;
            if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
             continue label$57
            }
            break label$55;
           };
          }
          if (($10_1 | 0) != ($3_1 | 0)) {
           break label$55
          }
          HEAP8[($6_1 + 24 | 0) >> 0] = 48;
          $10_1 = $21_1;
         }
         $36($0_1 | 0, $10_1 | 0, $3_1 - $10_1 | 0 | 0);
         $18_1 = $18_1 + 4 | 0;
         if ($18_1 >>> 0 <= $17_1 >>> 0) {
          continue label$54
         }
         break label$54;
        };
        label$58 : {
         if (!$22_1) {
          break label$58
         }
         $36($0_1 | 0, 68374 | 0, 1 | 0);
        }
        if ($18_1 >>> 0 >= $11_1 >>> 0) {
         break label$52
        }
        if (($15_1 | 0) < (1 | 0)) {
         break label$52
        }
        label$59 : while (1) {
         label$60 : {
          i64toi32_i32$5 = $18_1;
          i64toi32_i32$0 = HEAP32[$18_1 >> 2] | 0;
          i64toi32_i32$4 = 0;
          $10_1 = $41(i64toi32_i32$0 | 0, i64toi32_i32$4 | 0, $3_1 | 0) | 0;
          if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
           break label$60
          }
          label$61 : while (1) {
           $10_1 = $10_1 + -1 | 0;
           HEAP8[$10_1 >> 0] = 48;
           if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
            continue label$61
           }
           break label$61;
          };
         }
         $36($0_1 | 0, $10_1 | 0, (($15_1 | 0) < (9 | 0) ? $15_1 : 9) | 0);
         $10_1 = $15_1 + -9 | 0;
         $18_1 = $18_1 + 4 | 0;
         if ($18_1 >>> 0 >= $11_1 >>> 0) {
          break label$51
         }
         $12_1 = ($15_1 | 0) > (9 | 0);
         $15_1 = $10_1;
         if ($12_1) {
          continue label$59
         }
         break label$51;
        };
       }
       label$62 : {
        if (($15_1 | 0) < (0 | 0)) {
         break label$62
        }
        $22_1 = $11_1 >>> 0 > $18_1 >>> 0 ? $11_1 : $18_1 + 4 | 0;
        $17_1 = $6_1 + 16 | 0 | 8 | 0;
        $3_1 = $6_1 + 16 | 0 | 9 | 0;
        $11_1 = $18_1;
        label$63 : while (1) {
         label$64 : {
          i64toi32_i32$5 = $11_1;
          i64toi32_i32$4 = HEAP32[$11_1 >> 2] | 0;
          i64toi32_i32$0 = 0;
          $10_1 = $41(i64toi32_i32$4 | 0, i64toi32_i32$0 | 0, $3_1 | 0) | 0;
          if (($10_1 | 0) != ($3_1 | 0)) {
           break label$64
          }
          HEAP8[($6_1 + 24 | 0) >> 0] = 48;
          $10_1 = $17_1;
         }
         label$65 : {
          label$66 : {
           if (($11_1 | 0) == ($18_1 | 0)) {
            break label$66
           }
           if ($10_1 >>> 0 <= ($6_1 + 16 | 0) >>> 0) {
            break label$65
           }
           label$67 : while (1) {
            $10_1 = $10_1 + -1 | 0;
            HEAP8[$10_1 >> 0] = 48;
            if ($10_1 >>> 0 > ($6_1 + 16 | 0) >>> 0) {
             continue label$67
            }
            break label$65;
           };
          }
          $36($0_1 | 0, $10_1 | 0, 1 | 0);
          $10_1 = $10_1 + 1 | 0;
          if (!($15_1 | $21_1 | 0)) {
           break label$65
          }
          $36($0_1 | 0, 68374 | 0, 1 | 0);
         }
         $12_1 = $3_1 - $10_1 | 0;
         $36($0_1 | 0, $10_1 | 0, (($15_1 | 0) > ($12_1 | 0) ? $12_1 : $15_1) | 0);
         $15_1 = $15_1 - $12_1 | 0;
         $11_1 = $11_1 + 4 | 0;
         if ($11_1 >>> 0 >= $22_1 >>> 0) {
          break label$62
         }
         if (($15_1 | 0) > (-1 | 0)) {
          continue label$63
         }
         break label$63;
        };
       }
       $42($0_1 | 0, 48 | 0, $15_1 + 18 | 0 | 0, 18 | 0, 0 | 0);
       $36($0_1 | 0, $19_1 | 0, $13_1 - $19_1 | 0 | 0);
       break label$50;
      }
      $10_1 = $15_1;
     }
     $42($0_1 | 0, 48 | 0, $10_1 + 9 | 0 | 0, 9 | 0, 0 | 0);
    }
    $42($0_1 | 0, 32 | 0, $2_1 | 0, $23_1 | 0, $4_1 ^ 8192 | 0 | 0);
    $12_1 = ($23_1 | 0) > ($2_1 | 0) ? $23_1 : $2_1;
    break label$4;
   }
   $23_1 = $9_1 + ((($5_1 << 26 | 0) >> 31 | 0) & 9 | 0) | 0;
   label$68 : {
    if ($3_1 >>> 0 > 11 >>> 0) {
     break label$68
    }
    $10_1 = 12 - $3_1 | 0;
    $26_1 = 16.0;
    label$69 : while (1) {
     $26_1 = $26_1 * 16.0;
     $10_1 = $10_1 + -1 | 0;
     if ($10_1) {
      continue label$69
     }
     break label$69;
    };
    label$70 : {
     if ((HEAPU8[$23_1 >> 0] | 0 | 0) != (45 | 0)) {
      break label$70
     }
     $1_1 = -($26_1 + (-$1_1 - $26_1));
     break label$68;
    }
    $1_1 = $1_1 + $26_1 - $26_1;
   }
   label$71 : {
    $10_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
    $855 = $10_1;
    $10_1 = $10_1 >> 31 | 0;
    i64toi32_i32$0 = 0;
    $10_1 = $41(($855 ^ $10_1 | 0) - $10_1 | 0 | 0, i64toi32_i32$0 | 0, $13_1 | 0) | 0;
    if (($10_1 | 0) != ($13_1 | 0)) {
     break label$71
    }
    HEAP8[($6_1 + 15 | 0) >> 0] = 48;
    $10_1 = $6_1 + 15 | 0;
   }
   $21_1 = $8_1 | 2 | 0;
   $18_1 = $5_1 & 32 | 0;
   $11_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
   $22_1 = $10_1 + -2 | 0;
   HEAP8[$22_1 >> 0] = $5_1 + 15 | 0;
   HEAP8[($10_1 + -1 | 0) >> 0] = ($11_1 | 0) < (0 | 0) ? 45 : 43;
   $12_1 = $4_1 & 8 | 0;
   $11_1 = $6_1 + 16 | 0;
   label$72 : while (1) {
    $10_1 = $11_1;
    label$73 : {
     label$74 : {
      if (!(Math_abs($1_1) < 2147483648.0)) {
       break label$74
      }
      $11_1 = ~~$1_1;
      break label$73;
     }
     $11_1 = -2147483648;
    }
    HEAP8[$10_1 >> 0] = HEAPU8[($11_1 + 69344 | 0) >> 0] | 0 | $18_1 | 0;
    $1_1 = ($1_1 - +($11_1 | 0)) * 16.0;
    label$75 : {
     $11_1 = $10_1 + 1 | 0;
     if (($11_1 - ($6_1 + 16 | 0) | 0 | 0) != (1 | 0)) {
      break label$75
     }
     label$76 : {
      if ($12_1) {
       break label$76
      }
      if (($3_1 | 0) > (0 | 0)) {
       break label$76
      }
      if ($1_1 == 0.0) {
       break label$75
      }
     }
     HEAP8[($10_1 + 1 | 0) >> 0] = 46;
     $11_1 = $10_1 + 2 | 0;
    }
    if ($1_1 != 0.0) {
     continue label$72
    }
    break label$72;
   };
   $12_1 = -1;
   $18_1 = $13_1 - $22_1 | 0;
   $19_1 = $21_1 + $18_1 | 0;
   if ((2147483645 - $19_1 | 0 | 0) < ($3_1 | 0)) {
    break label$4
   }
   $10_1 = $11_1 - ($6_1 + 16 | 0) | 0;
   $3_1 = $3_1 ? (($10_1 + -2 | 0 | 0) < ($3_1 | 0) ? $3_1 + 2 | 0 : $10_1) : $10_1;
   $11_1 = $19_1 + $3_1 | 0;
   $42($0_1 | 0, 32 | 0, $2_1 | 0, $11_1 | 0, $4_1 | 0);
   $36($0_1 | 0, $23_1 | 0, $21_1 | 0);
   $42($0_1 | 0, 48 | 0, $2_1 | 0, $11_1 | 0, $4_1 ^ 65536 | 0 | 0);
   $36($0_1 | 0, $6_1 + 16 | 0 | 0, $10_1 | 0);
   $42($0_1 | 0, 48 | 0, $3_1 - $10_1 | 0 | 0, 0 | 0, 0 | 0);
   $36($0_1 | 0, $22_1 | 0, $18_1 | 0);
   $42($0_1 | 0, 32 | 0, $2_1 | 0, $11_1 | 0, $4_1 ^ 8192 | 0 | 0);
   $12_1 = ($11_1 | 0) > ($2_1 | 0) ? $11_1 : $2_1;
  }
  global$0 = $6_1 + 560 | 0;
  return $12_1 | 0;
 }
 
 function $45($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $2_1 = 0, $12_1 = 0, $12$hi = 0, $15_1 = 0, $15$hi = 0, wasm2js_i32$0 = 0, wasm2js_f64$0 = 0.0;
  $2_1 = ((HEAP32[$1_1 >> 2] | 0) + 7 | 0) & -8 | 0;
  HEAP32[$1_1 >> 2] = $2_1 + 16 | 0;
  i64toi32_i32$2 = $2_1;
  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $12_1 = i64toi32_i32$0;
  $12$hi = i64toi32_i32$1;
  i64toi32_i32$2 = i64toi32_i32$2 + 8 | 0;
  i64toi32_i32$1 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $15_1 = i64toi32_i32$1;
  $15$hi = i64toi32_i32$0;
  i64toi32_i32$0 = $12$hi;
  i64toi32_i32$1 = $15$hi;
  (wasm2js_i32$0 = $0_1, wasm2js_f64$0 = +$32($12_1 | 0, i64toi32_i32$0 | 0, $15_1 | 0, i64toi32_i32$1 | 0)), HEAPF64[wasm2js_i32$0 >> 3] = wasm2js_f64$0;
 }
 
 function $46($0_1) {
  $0_1 = +$0_1;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  wasm2js_scratch_store_f64(+$0_1);
  i64toi32_i32$0 = wasm2js_scratch_load_i32(1 | 0) | 0;
  i64toi32_i32$1 = wasm2js_scratch_load_i32(0 | 0) | 0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function $47($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $4_1 = 0, $5_1 = 0, $6_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 160 | 0;
  global$0 = $4_1;
  $5_1 = $1_1 ? $0_1 : $4_1 + 158 | 0;
  HEAP32[($4_1 + 148 | 0) >> 2] = $5_1;
  $0_1 = -1;
  $6_1 = $1_1 + -1 | 0;
  HEAP32[($4_1 + 152 | 0) >> 2] = $6_1 >>> 0 > $1_1 >>> 0 ? 0 : $6_1;
  $4_1 = $5($4_1 | 0, 0 | 0, 144 | 0) | 0;
  HEAP32[($4_1 + 76 | 0) >> 2] = -1;
  HEAP32[($4_1 + 36 | 0) >> 2] = 3;
  HEAP32[($4_1 + 80 | 0) >> 2] = -1;
  HEAP32[($4_1 + 44 | 0) >> 2] = $4_1 + 159 | 0;
  HEAP32[($4_1 + 84 | 0) >> 2] = $4_1 + 148 | 0;
  label$1 : {
   label$2 : {
    if (($1_1 | 0) > (-1 | 0)) {
     break label$2
    }
    (wasm2js_i32$0 = $2() | 0, wasm2js_i32$1 = 61), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
    break label$1;
   }
   HEAP8[$5_1 >> 0] = 0;
   $0_1 = $43($4_1 | 0, $2_1 | 0, $3_1 | 0) | 0;
  }
  global$0 = $4_1 + 160 | 0;
  return $0_1 | 0;
 }
 
 function $48($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $5_1 = 0, $4_1 = 0, $7_1 = 0, $6_1 = 0;
  $3_1 = HEAP32[($0_1 + 84 | 0) >> 2] | 0;
  $4_1 = HEAP32[$3_1 >> 2] | 0;
  label$1 : {
   $5_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
   $6_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
   $7_1 = (HEAP32[($0_1 + 20 | 0) >> 2] | 0) - $6_1 | 0;
   $7_1 = $5_1 >>> 0 < $7_1 >>> 0 ? $5_1 : $7_1;
   if (!$7_1) {
    break label$1
   }
   $4($4_1 | 0, $6_1 | 0, $7_1 | 0) | 0;
   $4_1 = (HEAP32[$3_1 >> 2] | 0) + $7_1 | 0;
   HEAP32[$3_1 >> 2] = $4_1;
   $5_1 = (HEAP32[($3_1 + 4 | 0) >> 2] | 0) - $7_1 | 0;
   HEAP32[($3_1 + 4 | 0) >> 2] = $5_1;
  }
  label$2 : {
   $5_1 = $5_1 >>> 0 < $2_1 >>> 0 ? $5_1 : $2_1;
   if (!$5_1) {
    break label$2
   }
   $4($4_1 | 0, $1_1 | 0, $5_1 | 0) | 0;
   $4_1 = (HEAP32[$3_1 >> 2] | 0) + $5_1 | 0;
   HEAP32[$3_1 >> 2] = $4_1;
   HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[($3_1 + 4 | 0) >> 2] | 0) - $5_1 | 0;
  }
  HEAP8[$4_1 >> 0] = 0;
  $3_1 = HEAP32[($0_1 + 44 | 0) >> 2] | 0;
  HEAP32[($0_1 + 28 | 0) >> 2] = $3_1;
  HEAP32[($0_1 + 20 | 0) >> 2] = $3_1;
  return $2_1 | 0;
 }
 
 function $49($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP8[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 0] = 0;
  return;
 }
 
 function $50($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 16 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 8 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    if ((HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$2
    }
    break label$1;
   }
   label$3 : {
    if (!(((HEAPU8[(HEAP32[($5_1 + 12 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0 | 0) != (0 & 255 | 0 | 0) & 1 | 0)) {
     break label$3
    }
    break label$1;
   }
   HEAP32[($5_1 + 4 | 0) >> 2] = $2_1;
   $47(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, 256 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0) | 0;
   HEAP8[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 255 | 0) >> 0] = 0;
  }
  global$0 = $5_1 + 16 | 0;
  return;
 }
 
 function $51($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  label$1 : {
   if (!((HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   if (!((HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   FUNCTION_TABLE[HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0](HEAP32[($3_1 + 12 | 0) >> 2] | 0);
  }
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $52($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var i64toi32_i32$1 = 0, $4_1 = 0, i64toi32_i32$0 = 0, $32_1 = 0, $7_1 = 0, $29_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $9(40 | 0) | 0), HEAP32[(wasm2js_i32$0 + 4 | 0) >> 2] = wasm2js_i32$1;
  $7_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
  i64toi32_i32$0 = 0;
  $32_1 = 0;
  i64toi32_i32$1 = $7_1;
  HEAP32[i64toi32_i32$1 >> 2] = $32_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = i64toi32_i32$1 + 32 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $32_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $7_1 + 24 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $32_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $7_1 + 16 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $32_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $7_1 + 8 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $32_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[(HEAP32[($4_1 + 4 | 0) >> 2] | 0) >> 2] = 4;
  HEAP32[((HEAP32[($4_1 + 4 | 0) >> 2] | 0) + 4 | 0) >> 2] = 5;
  i64toi32_i32$0 = 0;
  i64toi32_i32$1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
  HEAP32[(i64toi32_i32$1 + 16 | 0) >> 2] = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
  HEAP32[(i64toi32_i32$1 + 20 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[((HEAP32[($4_1 + 4 | 0) >> 2] | 0) + 24 | 0) >> 2] = 1;
  HEAP32[((HEAP32[($4_1 + 4 | 0) >> 2] | 0) + 32 | 0) >> 2] = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 4 | 0) >> 2] | 0) + 36 | 0) >> 2] = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
  $29_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
  global$0 = $4_1 + 16 | 0;
  return $29_1 | 0;
 }
 
 function $53($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $54($0_1, $1_1, $2_1, $2$hi, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $2$hi = $2$hi | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $7_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, i64toi32_i32$0 = 0, i64toi32_i32$5 = 0, i64toi32_i32$2 = 0, $36$hi = 0, $37$hi = 0, $38$hi = 0, $39$hi = 0, $41$hi = 0, $42$hi = 0, $98_1 = 0, $101_1 = 0, $110_1 = 0;
  $7_1 = global$0 - 48 | 0;
  HEAP32[($7_1 + 40 | 0) >> 2] = $0_1;
  HEAP32[($7_1 + 36 | 0) >> 2] = $1_1;
  i64toi32_i32$0 = $2$hi;
  i64toi32_i32$1 = $7_1;
  HEAP32[($7_1 + 24 | 0) >> 2] = $2_1;
  HEAP32[($7_1 + 28 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[($7_1 + 20 | 0) >> 2] = $3_1;
  HEAP32[($7_1 + 16 | 0) >> 2] = $4_1;
  label$1 : {
   label$2 : {
    if (!(HEAP32[($7_1 + 36 | 0) >> 2] | 0)) {
     break label$2
    }
    HEAP32[($7_1 + 44 | 0) >> 2] = 22;
    break label$1;
   }
   HEAP32[($7_1 + 12 | 0) >> 2] = HEAP32[($7_1 + 40 | 0) >> 2] | 0;
   i64toi32_i32$2 = $7_1;
   i64toi32_i32$0 = HEAP32[($7_1 + 24 | 0) >> 2] | 0;
   i64toi32_i32$1 = HEAP32[($7_1 + 28 | 0) >> 2] | 0;
   $36$hi = i64toi32_i32$1;
   i64toi32_i32$1 = 0;
   $37$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $36$hi;
   i64toi32_i32$1 = $37$hi;
   i64toi32_i32$1 = $36$hi;
   i64toi32_i32$2 = i64toi32_i32$0;
   i64toi32_i32$0 = $37$hi;
   i64toi32_i32$3 = HEAP32[((HEAP32[($7_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0;
   label$3 : {
    if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0) & 1 | 0)) {
     break label$3
    }
    HEAP32[($7_1 + 44 | 0) >> 2] = 22;
    break label$1;
   }
   i64toi32_i32$2 = 0;
   $38$hi = i64toi32_i32$2;
   i64toi32_i32$3 = $7_1;
   i64toi32_i32$2 = HEAP32[($7_1 + 24 | 0) >> 2] | 0;
   i64toi32_i32$1 = HEAP32[($7_1 + 28 | 0) >> 2] | 0;
   $39$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $38$hi;
   i64toi32_i32$1 = $39$hi;
   $98_1 = i64toi32_i32$2;
   i64toi32_i32$1 = $38$hi;
   i64toi32_i32$3 = HEAP32[((HEAP32[($7_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0;
   i64toi32_i32$2 = $39$hi;
   i64toi32_i32$0 = $98_1;
   i64toi32_i32$5 = (i64toi32_i32$3 >>> 0 < i64toi32_i32$0 >>> 0) + i64toi32_i32$2 | 0;
   i64toi32_i32$5 = i64toi32_i32$1 - i64toi32_i32$5 | 0;
   $101_1 = i64toi32_i32$3 - i64toi32_i32$0 | 0;
   i64toi32_i32$3 = $7_1;
   HEAP32[$7_1 >> 2] = $101_1;
   HEAP32[($7_1 + 4 | 0) >> 2] = i64toi32_i32$5;
   i64toi32_i32$5 = 0;
   $41$hi = i64toi32_i32$5;
   i64toi32_i32$1 = $7_1;
   i64toi32_i32$5 = HEAP32[$7_1 >> 2] | 0;
   i64toi32_i32$3 = HEAP32[($7_1 + 4 | 0) >> 2] | 0;
   $42$hi = i64toi32_i32$3;
   i64toi32_i32$3 = $41$hi;
   i64toi32_i32$3 = $42$hi;
   $110_1 = i64toi32_i32$5;
   i64toi32_i32$3 = $41$hi;
   i64toi32_i32$1 = HEAP32[($7_1 + 20 | 0) >> 2] | 0;
   i64toi32_i32$5 = $42$hi;
   i64toi32_i32$0 = $110_1;
   label$4 : {
    if (!((i64toi32_i32$3 >>> 0 > i64toi32_i32$5 >>> 0 | ((i64toi32_i32$3 | 0) == (i64toi32_i32$5 | 0) & i64toi32_i32$1 >>> 0 > i64toi32_i32$0 >>> 0 | 0) | 0) & 1 | 0)) {
     break label$4
    }
    i64toi32_i32$0 = $7_1;
    i64toi32_i32$1 = HEAP32[$7_1 >> 2] | 0;
    i64toi32_i32$3 = HEAP32[($7_1 + 4 | 0) >> 2] | 0;
    HEAP32[($7_1 + 20 | 0) >> 2] = i64toi32_i32$1;
   }
   i64toi32_i32$0 = $7_1;
   i64toi32_i32$3 = HEAP32[($7_1 + 24 | 0) >> 2] | 0;
   i64toi32_i32$1 = HEAP32[($7_1 + 28 | 0) >> 2] | 0;
   HEAP32[(HEAP32[($7_1 + 16 | 0) >> 2] | 0) >> 2] = (HEAP32[((HEAP32[($7_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0) + i64toi32_i32$3 | 0;
   HEAP32[((HEAP32[($7_1 + 16 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[($7_1 + 20 | 0) >> 2] | 0;
   HEAP32[($7_1 + 44 | 0) >> 2] = 0;
  }
  return HEAP32[($7_1 + 44 | 0) >> 2] | 0 | 0;
 }
 
 function $55() {
  return fimport$4() | 0 | 0;
 }
 
 function $56() {
  var i64toi32_i32$1 = 0, $2_1 = 0, i64toi32_i32$0 = 0, $29_1 = 0, $5_1 = 0, $20_1 = 0, $26_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $2_1 = global$0 - 16 | 0;
  global$0 = $2_1;
  (wasm2js_i32$0 = $2_1, wasm2js_i32$1 = $9(36 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
  $5_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
  i64toi32_i32$0 = 0;
  $29_1 = 0;
  i64toi32_i32$1 = $5_1;
  HEAP32[i64toi32_i32$1 >> 2] = $29_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[(i64toi32_i32$1 + 32 | 0) >> 2] = 0;
  i64toi32_i32$1 = i64toi32_i32$1 + 24 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $29_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $5_1 + 16 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $29_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $5_1 + 8 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $29_1;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 20 | 0) >> 2] = 6;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] = 7;
  $20_1 = $9(176 | 0) | 0;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = $20_1;
  $5(HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0, 0 | 0, 176 | 0) | 0;
  $26_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
  global$0 = $2_1 + 16 | 0;
  return $26_1 | 0;
 }
 
 function $57($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $8_1 = 0, $27_1 = 0, $35_1 = 0, $48_1 = 0, $212 = 0, $390 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $8_1 = global$0 - 368 | 0;
  global$0 = $8_1;
  HEAP32[($8_1 + 360 | 0) >> 2] = $0_1;
  HEAP32[($8_1 + 356 | 0) >> 2] = $1_1;
  HEAP32[($8_1 + 352 | 0) >> 2] = $2_1;
  HEAP32[($8_1 + 348 | 0) >> 2] = $3_1;
  HEAP32[($8_1 + 344 | 0) >> 2] = $4_1;
  HEAP32[($8_1 + 340 | 0) >> 2] = $5_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[(HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >> 2] | 0 | 0) == (0 | 0) & 1 | 0)) {
     break label$2
    }
    fimport$5($8_1 + 264 | 0 | 0);
    HEAP32[($8_1 + 268 | 0) >> 2] = 1;
    label$3 : {
     label$4 : {
      if (!((HEAP32[((HEAP32[($8_1 + 356 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) < (1 | 0) & 1 | 0)) {
       break label$4
      }
      $27_1 = 1;
      break label$3;
     }
     label$5 : {
      label$6 : {
       if (!((256 | 0) < (HEAP32[((HEAP32[($8_1 + 356 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$6
       }
       $35_1 = 256;
       break label$5;
      }
      $35_1 = HEAP32[((HEAP32[($8_1 + 356 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
     }
     $27_1 = $35_1;
    }
    HEAP32[($8_1 + 264 | 0) >> 2] = $27_1;
    label$7 : {
     label$8 : {
      if (!((HEAP32[((HEAP32[($8_1 + 356 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 < 67108864 >>> 0 & 1 | 0)) {
       break label$8
      }
      $48_1 = HEAP32[((HEAP32[($8_1 + 356 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0;
      break label$7;
     }
     $48_1 = 67108864;
    }
    HEAP32[($8_1 + 284 | 0) >> 2] = $48_1;
    HEAP32[($8_1 + 276 | 0) >> 2] = (HEAPU8[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 12 | 0) >> 0] | 0) & 255 | 0;
    HEAP32[($8_1 + 280 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0;
    label$9 : {
     if (!(fimport$6(HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0, $8_1 + 264 | 0 | 0) | 0)) {
      break label$9
     }
     HEAP32[($8_1 + 364 | 0) >> 2] = 0;
     break label$1;
    }
   }
   HEAP32[($8_1 + 260 | 0) >> 2] = 0;
   $5($8_1 + 96 | 0 | 0, 0 | 0, 160 | 0) | 0;
   label$10 : {
    if (!(fimport$7($8_1 + 40 | 0 | 0, HEAP32[(HEAP32[($8_1 + 352 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($8_1 + 352 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0, 8 | 0, 0 | 0) | 0)) {
     break label$10
    }
    HEAP32[($8_1 + 364 | 0) >> 2] = 0;
    break label$1;
   }
   label$11 : while (1) {
    label$12 : {
     if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$12
     }
     (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = fimport$8(HEAP32[(HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >> 2] | 0 | 0, $8_1 + 40 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 36 | 0) >> 2] = wasm2js_i32$1;
     label$13 : {
      if (!((HEAP32[($8_1 + 36 | 0) >> 2] | 0 | 0) < (0 | 0) & 1 | 0)) {
       break label$13
      }
      if (!((HEAP32[($8_1 + 36 | 0) >> 2] | 0 | 0) != (-6 | 0) & 1 | 0)) {
       break label$13
      }
      fimport$9($8_1 + 40 | 0 | 0);
      HEAP32[($8_1 + 364 | 0) >> 2] = 0;
      break label$1;
     }
    }
    (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = fimport$10(HEAP32[(HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >> 2] | 0 | 0, $8_1 + 96 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 32 | 0) >> 2] = wasm2js_i32$1;
    label$14 : {
     if (!((HEAP32[($8_1 + 32 | 0) >> 2] | 0 | 0) == (-6 | 0) & 1 | 0)) {
      break label$14
     }
     label$15 : {
      if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
       break label$15
      }
      continue label$11;
     }
     HEAP32[($8_1 + 364 | 0) >> 2] = 0;
     break label$1;
    }
    label$16 : {
     if (!((HEAP32[($8_1 + 32 | 0) >> 2] | 0 | 0) < (0 | 0) & 1 | 0)) {
      break label$16
     }
     label$17 : {
      if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
       break label$17
      }
      fimport$9($8_1 + 40 | 0 | 0);
     }
     HEAP32[($8_1 + 364 | 0) >> 2] = 0;
     break label$1;
    }
    label$18 : {
     label$19 : {
      label$20 : {
       if (!(((HEAPU8[((HEAP32[($8_1 + 352 | 0) >> 2] | 0) + 36 | 0) >> 0] | 0) & 255 | 0 | 0) != (255 | 0) & 1 | 0)) {
        break label$20
       }
       if (!(((HEAPU8[((HEAP32[($8_1 + 352 | 0) >> 2] | 0) + 36 | 0) >> 0] | 0) & 255 | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 100 | 0) >> 2] | 0) + 256 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$20
       }
       fimport$11($8_1 + 96 | 0 | 0);
       break label$19;
      }
      HEAP32[($8_1 + 260 | 0) >> 2] = 1;
      break label$18;
     }
     continue label$11;
    }
    break label$11;
   };
   label$21 : {
    if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$21
    }
    fimport$9($8_1 + 40 | 0 | 0);
   }
   label$22 : {
    label$23 : {
     if (!(HEAP32[($8_1 + 260 | 0) >> 2] | 0)) {
      break label$23
     }
     fimport$11((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 8 | 0 | 0);
     $4((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 8 | 0 | 0, $8_1 + 96 | 0 | 0, 160 | 0) | 0;
     HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 172 | 0) >> 2] = HEAP32[((HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0 ? 1 : 0;
     HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 168 | 0) >> 2] = 1;
     break label$22;
    }
    label$24 : {
     label$25 : {
      if (!(HEAP32[($8_1 + 348 | 0) >> 2] | 0)) {
       break label$25
      }
      if (!(HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 168 | 0) >> 2] | 0)) {
       break label$25
      }
      break label$24;
     }
     HEAP32[($8_1 + 364 | 0) >> 2] = 0;
     break label$1;
    }
   }
   HEAP32[($8_1 + 28 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 8 | 0;
   HEAP32[($8_1 + 24 | 0) >> 2] = ((HEAP32[($8_1 + 348 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0;
   label$26 : {
    label$27 : {
     if (!(HEAP32[($8_1 + 24 | 0) >> 2] | 0)) {
      break label$27
     }
     HEAP32[($8_1 + 20 | 0) >> 2] = 0;
     $212 = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0;
     label$28 : {
      label$29 : {
       switch ($212 | 0) {
       case 0:
        HEAP32[($8_1 + 20 | 0) >> 2] = 4;
        break label$28;
       case 1:
        HEAP32[($8_1 + 20 | 0) >> 2] = 3;
        break label$28;
       case 2:
        HEAP32[($8_1 + 20 | 0) >> 2] = 2;
        break label$28;
       case 3:
        break label$29;
       default:
        break label$28;
       };
      }
      HEAP32[($8_1 + 20 | 0) >> 2] = 1;
     }
     label$33 : {
      if (!(HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] | 0)) {
       break label$33
      }
      if (!(HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0)) {
       break label$33
      }
      label$34 : {
       label$35 : {
        if ((HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0) & 1 | 0) {
         break label$35
        }
        if ((HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0) & 1 | 0) {
         break label$35
        }
        if ((HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0 | 0) & 1 | 0) {
         break label$35
        }
        if (!((HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (HEAP32[($8_1 + 20 | 0) >> 2] | 0 | 0) & 1 | 0)) {
         break label$34
        }
       }
       $71(HEAP32[($8_1 + 340 | 0) >> 2] | 0 | 0, 255 | 0);
      }
     }
     HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[($8_1 + 20 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 16 | 0) >> 2] = HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 172 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 20 | 0) >> 2] = HEAP32[((HEAP32[(HEAP32[($8_1 + 28 | 0) >> 2] | 0) >> 2] | 0) + 28 | 0) >> 2] | 0;
     HEAP16[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 76 | 0) >> 1] = HEAP32[((HEAP32[(HEAP32[($8_1 + 28 | 0) >> 2] | 0) >> 2] | 0) + 16 | 0) >> 2] | 0;
     HEAP16[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 78 | 0) >> 1] = HEAP32[((HEAP32[(HEAP32[($8_1 + 28 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0;
     HEAP16[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 80 | 0) >> 1] = HEAP32[((HEAP32[(HEAP32[($8_1 + 28 | 0) >> 2] | 0) >> 2] | 0) + 24 | 0) >> 2] | 0;
     $71(HEAP32[($8_1 + 340 | 0) >> 2] | 0 | 0, 1 | 0);
     HEAP32[($8_1 + 16 | 0) >> 2] = (HEAP32[($8_1 + 20 | 0) >> 2] | 0 | 0) == (4 | 0) & 1 | 0 ? 1 : 3;
     HEAP32[($8_1 + 12 | 0) >> 2] = 0;
     label$36 : {
      label$37 : while (1) {
       if (!((HEAP32[($8_1 + 12 | 0) >> 2] | 0 | 0) < (HEAP32[($8_1 + 16 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$36
       }
       HEAP32[(((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($8_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 8 | 0) + ((HEAP32[($8_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
       HEAP32[(((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($8_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 20 | 0) + ((HEAP32[($8_1 + 12 | 0) >> 2] | 0 ? 1 : 0) << 2 | 0) | 0) >> 2] | 0;
       HEAP32[($8_1 + 12 | 0) >> 2] = (HEAP32[($8_1 + 12 | 0) >> 2] | 0) + 1 | 0;
       continue label$37;
      };
     }
     HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
     break label$26;
    }
    label$38 : {
     if (!(HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] | 0)) {
      break label$38
     }
     if (!(HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0)) {
      break label$38
     }
     label$39 : {
      label$40 : {
       if ((HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0) & 1 | 0) {
        break label$40
       }
       if ((HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0) & 1 | 0) {
        break label$40
       }
       if (!((HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$39
       }
      }
      HEAP32[($8_1 + 364 | 0) >> 2] = 0;
      break label$1;
     }
    }
    HEAP32[(HEAP32[($8_1 + 340 | 0) >> 2] | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0;
    HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0;
    HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0;
    $71(HEAP32[($8_1 + 340 | 0) >> 2] | 0 | 0, 2 | 0);
    HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 52 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
    HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 56 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 28 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0;
    HEAP32[(HEAP32[($8_1 + 344 | 0) >> 2] | 0) >> 2] = (HEAP32[((HEAP32[((HEAP32[($8_1 + 360 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 172 | 0) >> 2] | 0 | 0) == (0 | 0) & 1 | 0;
    HEAP32[((HEAP32[($8_1 + 340 | 0) >> 2] | 0) + 60 | 0) >> 2] = 0;
   }
   HEAP32[($8_1 + 364 | 0) >> 2] = 1;
  }
  $390 = HEAP32[($8_1 + 364 | 0) >> 2] | 0;
  global$0 = $8_1 + 368 | 0;
  return $390 | 0;
 }
 
 function $58($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  label$1 : {
   if (!(HEAP32[((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 168 | 0) >> 2] | 0)) {
    break label$1
   }
   fimport$11((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 8 | 0 | 0);
  }
  label$2 : {
   if (!((HEAP32[(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$2
   }
   fimport$12(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0);
  }
  $10(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $59($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  return;
 }
 
 function $60() {
  return 67854 | 0;
 }
 
 function $61($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $5_1 = 0, $9_1 = 0, i64toi32_i32$0 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  $5_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
  i64toi32_i32$0 = 0;
  HEAP32[$5_1 >> 2] = 0;
  HEAP32[($5_1 + 4 | 0) >> 2] = i64toi32_i32$0;
  HEAP32[($5_1 + 8 | 0) >> 2] = 0;
  $9_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    switch ($9_1 | 0) {
    case 1:
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] = 0;
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
     break label$1;
    case 2:
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] = 1;
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
     break label$1;
    case 3:
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] = 1;
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] = 1;
     break label$1;
    case 4:
     HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] = 1;
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] = 1;
     HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] = 1;
     break label$1;
    case 0:
    case 5:
    default:
     break label$2;
    };
   }
  }
  return;
 }
 
 function $62($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $4_1 = 0;
  $3_1 = global$0 - 16 | 0;
  HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
  $4_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    switch ($4_1 | 0) {
    case 0:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67643;
     break label$1;
    case 2:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66382;
     break label$1;
    case 3:
     HEAP32[($3_1 + 12 | 0) >> 2] = 65627;
     break label$1;
    case 4:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66932;
     break label$1;
    case 5:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66955;
     break label$1;
    case 6:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66609;
     break label$1;
    case 7:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66971;
     break label$1;
    case 8:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67055;
     break label$1;
    case 9:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67035;
     break label$1;
    case 10:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66432;
     break label$1;
    case 11:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67003;
     break label$1;
    case 12:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67086;
     break label$1;
    case 13:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66627;
     break label$1;
    case 14:
     HEAP32[($3_1 + 12 | 0) >> 2] = 65859;
     break label$1;
    case 15:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66756;
     break label$1;
    case 16:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66664;
     break label$1;
    case 17:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67211;
     break label$1;
    case 18:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66897;
     break label$1;
    case 19:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66398;
     break label$1;
    case 20:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67352;
     break label$1;
    case 21:
     HEAP32[($3_1 + 12 | 0) >> 2] = 65694;
     break label$1;
    case 22:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66265;
     break label$1;
    case 23:
     HEAP32[($3_1 + 12 | 0) >> 2] = 67625;
     break label$1;
    case 24:
     HEAP32[($3_1 + 12 | 0) >> 2] = 65638;
     break label$1;
    case 25:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66916;
     break label$1;
    case 26:
     HEAP32[($3_1 + 12 | 0) >> 2] = 65536;
     break label$1;
    case 27:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66684;
     break label$1;
    case 28:
     HEAP32[($3_1 + 12 | 0) >> 2] = 66124;
     break label$1;
    case 1:
    default:
     break label$2;
    };
   }
   HEAP32[($3_1 + 12 | 0) >> 2] = 66251;
  }
  return HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0;
 }
 
 function $63($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $5(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0, 152 | 0) | 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] = 1;
  HEAP16[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 76 | 0) >> 1] = 2;
  HEAP16[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 78 | 0) >> 1] = 2;
  HEAP16[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 80 | 0) >> 1] = 2;
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $64($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, $53_1 = 0, $56_1 = 0, $16_1 = 0, $17_1 = 0, $18_1 = 0, $57_1 = 0, $60_1 = 0, $63_1 = 0, $208 = 0, $222 = 0, $232 = 0, $242 = 0, $252 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] = HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 20 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 64 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0;
  HEAP16[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 76 | 0) >> 1] = HEAPU16[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 76 | 0) >> 1] | 0;
  HEAP16[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 78 | 0) >> 1] = HEAPU16[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 78 | 0) >> 1] | 0;
  HEAP16[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 80 | 0) >> 1] = HEAPU16[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 80 | 0) >> 1] | 0;
  $16_1 = (HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 82 | 0;
  $17_1 = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 82 | 0;
  $18_1 = HEAPU16[$16_1 >> 1] | 0 | ((HEAPU16[($16_1 + 2 | 0) >> 1] | 0) << 16 | 0) | 0;
  HEAP16[$17_1 >> 1] = $18_1;
  HEAP16[($17_1 + 2 | 0) >> 1] = $18_1 >>> 16 | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 88 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 88 | 0) >> 2] | 0;
  i64toi32_i32$2 = (HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 92 | 0;
  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $208 = i64toi32_i32$0;
  i64toi32_i32$0 = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 92 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $208;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  $53_1 = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 100 | 0;
  $56_1 = (HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 100 | 0;
  i64toi32_i32$2 = $56_1;
  i64toi32_i32$1 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $222 = i64toi32_i32$1;
  i64toi32_i32$1 = $53_1;
  HEAP32[i64toi32_i32$1 >> 2] = $222;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  $57_1 = 24;
  i64toi32_i32$2 = i64toi32_i32$2 + $57_1 | 0;
  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $232 = i64toi32_i32$0;
  i64toi32_i32$0 = $53_1 + $57_1 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $232;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  $60_1 = 16;
  i64toi32_i32$2 = $56_1 + $60_1 | 0;
  i64toi32_i32$1 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $242 = i64toi32_i32$1;
  i64toi32_i32$1 = $53_1 + $60_1 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $242;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  $63_1 = 8;
  i64toi32_i32$2 = $56_1 + $63_1 | 0;
  i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
  $252 = i64toi32_i32$0;
  i64toi32_i32$0 = $53_1 + $63_1 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $252;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  HEAP8[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 132 | 0) >> 0] = HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 132 | 0) >> 0] | 0;
  HEAP8[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 133 | 0) >> 0] = HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 133 | 0) >> 0] | 0;
  return;
 }
 
 function $65($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 64 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 60 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 56 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 52 | 0) >> 2] = $2_1;
  label$1 : {
   if ((HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) == (HEAP32[((HEAP32[($5_1 + 60 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) & 1 | 0) {
    break label$1
   }
   fimport$3(66486 | 0, 67258 | 0, 189 | 0, 66043 | 0);
   wasm2js_trap();
  }
  label$2 : {
   if (!((HEAP32[($5_1 + 52 | 0) >> 2] | 0) & 1 | 0)) {
    break label$2
   }
   label$3 : {
    if ((HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) == (HEAP32[((HEAP32[($5_1 + 60 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) & 1 | 0) {
     break label$3
    }
    fimport$3(65705 | 0, 67258 | 0, 191 | 0, 66043 | 0);
    wasm2js_trap();
   }
  }
  (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $66(HEAP32[($5_1 + 56 | 0) >> 2] | 0 | 0) | 0 ? 2 : 1), HEAP32[(wasm2js_i32$0 + 48 | 0) >> 2] = wasm2js_i32$1;
  HEAP32[($5_1 + 44 | 0) >> 2] = (((HEAP32[($5_1 + 52 | 0) >> 2] | 0) & 1 | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0;
  HEAP32[($5_1 + 40 | 0) >> 2] = (((HEAP32[($5_1 + 52 | 0) >> 2] | 0) & 2 | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0;
  HEAP32[($5_1 + 36 | 0) >> 2] = 0;
  label$4 : {
   label$5 : while (1) {
    if (!((HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) <= (3 | 0) & 1 | 0)) {
     break label$4
    }
    HEAP32[($5_1 + 32 | 0) >> 2] = (HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0;
    label$6 : {
     label$7 : {
      label$8 : {
       label$9 : {
        if (!(HEAP32[($5_1 + 44 | 0) >> 2] | 0)) {
         break label$9
        }
        if (!(HEAP32[($5_1 + 32 | 0) >> 2] | 0)) {
         break label$8
        }
       }
       if (!(HEAP32[($5_1 + 40 | 0) >> 2] | 0)) {
        break label$7
       }
       if (!(HEAP32[($5_1 + 32 | 0) >> 2] | 0)) {
        break label$7
       }
      }
      break label$6;
     }
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $67(HEAP32[($5_1 + 56 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 28 | 0) >> 2] = wasm2js_i32$1;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $68(HEAP32[($5_1 + 56 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 24 | 0) >> 2] = wasm2js_i32$1;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $69(HEAP32[($5_1 + 56 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 20 | 0) >> 2] = wasm2js_i32$1;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $69(HEAP32[($5_1 + 60 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 16 | 0) >> 2] = wasm2js_i32$1;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $70(HEAP32[($5_1 + 56 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $70(HEAP32[($5_1 + 60 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
     label$10 : {
      if ((((HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0 | 0) == (((HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0 | 0) & 1 | 0) {
       break label$10
      }
      fimport$3(65602 | 0, 67258 | 0, 211 | 0, 66043 | 0);
      wasm2js_trap();
     }
     label$11 : {
      if ((HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
       break label$11
      }
      break label$6;
     }
     label$12 : {
      if ((HEAP32[($5_1 + 28 | 0) >> 2] | 0 | 0) == ($67(HEAP32[($5_1 + 60 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0 | 0) & 1 | 0) {
       break label$12
      }
      fimport$3(68528 | 0, 67258 | 0, 215 | 0, 66043 | 0);
      wasm2js_trap();
     }
     label$13 : {
      if ((HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0) == ($68(HEAP32[($5_1 + 60 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0) | 0 | 0) & 1 | 0) {
       break label$13
      }
      fimport$3(68479 | 0, 67258 | 0, 216 | 0, 66043 | 0);
      wasm2js_trap();
     }
     HEAP32[($5_1 + 4 | 0) >> 2] = Math_imul(HEAP32[($5_1 + 28 | 0) >> 2] | 0, HEAP32[($5_1 + 48 | 0) >> 2] | 0);
     HEAP32[$5_1 >> 2] = 0;
     label$14 : {
      label$15 : while (1) {
       if (!((HEAP32[$5_1 >> 2] | 0) >>> 0 < (HEAP32[($5_1 + 24 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
        break label$14
       }
       $4(HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0) | 0;
       HEAP32[($5_1 + 20 | 0) >> 2] = (HEAP32[($5_1 + 20 | 0) >> 2] | 0) + (HEAP32[($5_1 + 12 | 0) >> 2] | 0) | 0;
       HEAP32[($5_1 + 16 | 0) >> 2] = (HEAP32[($5_1 + 16 | 0) >> 2] | 0) + (HEAP32[($5_1 + 8 | 0) >> 2] | 0) | 0;
       HEAP32[$5_1 >> 2] = (HEAP32[$5_1 >> 2] | 0) + 1 | 0;
       continue label$15;
      };
     }
    }
    HEAP32[($5_1 + 36 | 0) >> 2] = (HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 1 | 0;
    continue label$5;
   };
  }
  global$0 = $5_1 + 64 | 0;
  return;
 }
 
 function $66($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  return (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0 | 0;
 }
 
 function $67($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $45_1 = 0;
  $4_1 = global$0 - 32 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 20 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    if (HEAP32[($4_1 + 20 | 0) >> 2] | 0) {
     break label$2
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 2] | 0;
    break label$1;
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
      break label$4
     }
     if (!((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
      break label$3
     }
    }
    $61(HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, $4_1 + 8 | 0 | 0);
    label$5 : {
     if (!(HEAP32[($4_1 + 8 | 0) >> 2] | 0)) {
      break label$5
     }
     HEAP32[($4_1 + 28 | 0) >> 2] = 0;
     break label$1;
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = ((HEAP32[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 2] | 0) + (HEAP32[($4_1 + 12 | 0) >> 2] | 0) | 0) >>> (HEAP32[($4_1 + 12 | 0) >> 2] | 0) | 0;
    break label$1;
   }
   label$6 : {
    if (!((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0)) {
     break label$6
    }
    if (!((HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$6
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 2] | 0;
    break label$1;
   }
   HEAP32[($4_1 + 28 | 0) >> 2] = 0;
  }
  $45_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
  global$0 = $4_1 + 32 | 0;
  return $45_1 | 0;
 }
 
 function $68($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $45_1 = 0;
  $4_1 = global$0 - 32 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 20 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    if (HEAP32[($4_1 + 20 | 0) >> 2] | 0) {
     break label$2
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
    break label$1;
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
      break label$4
     }
     if (!((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
      break label$3
     }
    }
    $61(HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, $4_1 + 8 | 0 | 0);
    label$5 : {
     if (!(HEAP32[($4_1 + 8 | 0) >> 2] | 0)) {
      break label$5
     }
     HEAP32[($4_1 + 28 | 0) >> 2] = 0;
     break label$1;
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = ((HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + (HEAP32[($4_1 + 16 | 0) >> 2] | 0) | 0) >>> (HEAP32[($4_1 + 16 | 0) >> 2] | 0) | 0;
    break label$1;
   }
   label$6 : {
    if (!((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0)) {
     break label$6
    }
    if (!((HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$6
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
    break label$1;
   }
   HEAP32[($4_1 + 28 | 0) >> 2] = 0;
  }
  $45_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
  global$0 = $4_1 + 32 | 0;
  return $45_1 | 0;
 }
 
 function $69($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!(HEAP32[($4_1 + 4 | 0) >> 2] | 0)) {
      break label$3
     }
     if ((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
      break label$3
     }
     if (!((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
      break label$2
     }
    }
    HEAP32[($4_1 + 12 | 0) >> 2] = HEAP32[(((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($4_1 + 4 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
    break label$1;
   }
   label$4 : {
    if (!((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0)) {
     break label$4
    }
    HEAP32[($4_1 + 12 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
    break label$1;
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  return HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0;
 }
 
 function $70($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!(HEAP32[($4_1 + 4 | 0) >> 2] | 0)) {
      break label$3
     }
     if ((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
      break label$3
     }
     if (!((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
      break label$2
     }
    }
    HEAP32[($4_1 + 12 | 0) >> 2] = HEAP32[(((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($4_1 + 4 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
    break label$1;
   }
   label$4 : {
    if (!((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0)) {
     break label$4
    }
    HEAP32[($4_1 + 12 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
    break label$1;
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  return HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0;
 }
 
 function $71($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  label$1 : {
   if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0) & 1 | 0)) {
    break label$1
   }
   if (!(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0)) {
    break label$1
   }
   label$2 : {
    if (!(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 48 | 0) >> 2] | 0)) {
     break label$2
    }
    $10(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0);
    $10(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0);
    $10(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0);
   }
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 24 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
  }
  label$3 : {
   if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0) & 2 | 0)) {
    break label$3
   }
   label$4 : {
    if (!(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0)) {
     break label$4
    }
    $10(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0);
   }
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 52 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 56 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 60 | 0) >> 2] = 0;
  }
  global$0 = $4_1 + 16 | 0;
  return;
 }
 
 function $72($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$5 = 0, i64toi32_i32$2 = 0, i64toi32_i32$4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, $177$hi = 0, $178$hi = 0, $179$hi = 0, $180$hi = 0, $23_1 = 0, $182$hi = 0, $183$hi = 0, $184$hi = 0, $185$hi = 0, $24_1 = 0, $67_1 = 0, $369 = 0, $396 = 0, $126 = 0, $164 = 0, $174 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 64 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 56 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 52 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!(HEAP32[(HEAP32[($4_1 + 56 | 0) >> 2] | 0) >> 2] | 0)) {
      break label$3
     }
     if (HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) {
      break label$2
     }
    }
    HEAP32[($4_1 + 60 | 0) >> 2] = 24;
    break label$1;
   }
   (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $66(HEAP32[($4_1 + 56 | 0) >> 2] | 0 | 0) | 0 ? 2 : 1), HEAP32[(wasm2js_i32$0 + 48 | 0) >> 2] = wasm2js_i32$1;
   label$4 : {
    if (!((HEAP32[(HEAP32[($4_1 + 56 | 0) >> 2] | 0) >> 2] | 0) >>> 0 > ((-1 >>> 0) / ((HEAP32[($4_1 + 48 | 0) >> 2] | 0) >>> 0) | 0) >>> 0 & 1 | 0)) {
     break label$4
    }
    HEAP32[($4_1 + 60 | 0) >> 2] = 24;
    break label$1;
   }
   HEAP32[($4_1 + 44 | 0) >> 2] = Math_imul(HEAP32[($4_1 + 48 | 0) >> 2] | 0, HEAP32[(HEAP32[($4_1 + 56 | 0) >> 2] | 0) >> 2] | 0);
   label$5 : {
    label$6 : {
     if ((HEAP32[($4_1 + 44 | 0) >> 2] | 0) >>> 0 > -1 >>> 0 & 1 | 0) {
      break label$6
     }
     if (!((HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 > ((-1 >>> 0) / ((HEAP32[($4_1 + 44 | 0) >> 2] | 0) >>> 0) | 0) >>> 0 & 1 | 0)) {
      break label$5
     }
    }
    HEAP32[($4_1 + 60 | 0) >> 2] = 24;
    break label$1;
   }
   HEAP32[($4_1 + 40 | 0) >> 2] = Math_imul(HEAP32[($4_1 + 44 | 0) >> 2] | 0, HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0);
   label$7 : {
    if (!((HEAP32[($4_1 + 52 | 0) >> 2] | 0) & 1 | 0)) {
     break label$7
    }
    if (!(HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0)) {
     break label$7
    }
    $61(HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, $4_1 + 28 | 0 | 0);
    HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 48 | 0) >> 2] = 1;
    label$8 : {
     if ((HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$8
     }
     HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 36 | 0) >> 2] = HEAP32[($4_1 + 44 | 0) >> 2] | 0;
     $67_1 = $9(HEAP32[($4_1 + 40 | 0) >> 2] | 0 | 0) | 0;
     HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) >> 2] = $67_1;
     label$9 : {
      if ((HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
       break label$9
      }
      HEAP32[($4_1 + 60 | 0) >> 2] = 26;
      break label$1;
     }
    }
    label$10 : {
     if (HEAP32[($4_1 + 28 | 0) >> 2] | 0) {
      break label$10
     }
     i64toi32_i32$0 = 0;
     $177$hi = i64toi32_i32$0;
     i64toi32_i32$1 = HEAP32[($4_1 + 32 | 0) >> 2] | 0;
     i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
     $178$hi = i64toi32_i32$0;
     i64toi32_i32$0 = $177$hi;
     i64toi32_i32$0 = $178$hi;
     $369 = i64toi32_i32$1;
     i64toi32_i32$0 = $177$hi;
     i64toi32_i32$2 = HEAP32[(HEAP32[($4_1 + 56 | 0) >> 2] | 0) >> 2] | 0;
     i64toi32_i32$1 = $178$hi;
     i64toi32_i32$3 = $369;
     i64toi32_i32$4 = i64toi32_i32$2 + i64toi32_i32$3 | 0;
     i64toi32_i32$5 = i64toi32_i32$0 + i64toi32_i32$1 | 0;
     if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
      i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
     }
     $179$hi = i64toi32_i32$5;
     i64toi32_i32$5 = 0;
     $180$hi = i64toi32_i32$5;
     i64toi32_i32$5 = $179$hi;
     i64toi32_i32$5 = $180$hi;
     i64toi32_i32$5 = $179$hi;
     i64toi32_i32$0 = i64toi32_i32$4;
     i64toi32_i32$2 = $180$hi;
     i64toi32_i32$3 = HEAP32[($4_1 + 32 | 0) >> 2] | 0;
     i64toi32_i32$1 = i64toi32_i32$3 & 31 | 0;
     if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
      i64toi32_i32$2 = 0;
      $23_1 = i64toi32_i32$5 >>> i64toi32_i32$1 | 0;
     } else {
      i64toi32_i32$2 = i64toi32_i32$5 >>> i64toi32_i32$1 | 0;
      $23_1 = (((1 << i64toi32_i32$1 | 0) - 1 | 0) & i64toi32_i32$5 | 0) << (32 - i64toi32_i32$1 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$1 | 0) | 0;
     }
     HEAP32[($4_1 + 24 | 0) >> 2] = $23_1;
     i64toi32_i32$2 = 0;
     $182$hi = i64toi32_i32$2;
     i64toi32_i32$0 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
     i64toi32_i32$2 = i64toi32_i32$0 >> 31 | 0;
     $183$hi = i64toi32_i32$2;
     i64toi32_i32$2 = $182$hi;
     i64toi32_i32$2 = $183$hi;
     $396 = i64toi32_i32$0;
     i64toi32_i32$2 = $182$hi;
     i64toi32_i32$5 = HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
     i64toi32_i32$0 = $183$hi;
     i64toi32_i32$3 = $396;
     i64toi32_i32$1 = i64toi32_i32$5 + i64toi32_i32$3 | 0;
     i64toi32_i32$4 = i64toi32_i32$2 + i64toi32_i32$0 | 0;
     if (i64toi32_i32$1 >>> 0 < i64toi32_i32$3 >>> 0) {
      i64toi32_i32$4 = i64toi32_i32$4 + 1 | 0
     }
     $184$hi = i64toi32_i32$4;
     i64toi32_i32$4 = 0;
     $185$hi = i64toi32_i32$4;
     i64toi32_i32$4 = $184$hi;
     i64toi32_i32$4 = $185$hi;
     i64toi32_i32$4 = $184$hi;
     i64toi32_i32$2 = i64toi32_i32$1;
     i64toi32_i32$5 = $185$hi;
     i64toi32_i32$3 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
     i64toi32_i32$0 = i64toi32_i32$3 & 31 | 0;
     if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
      i64toi32_i32$5 = 0;
      $24_1 = i64toi32_i32$4 >>> i64toi32_i32$0 | 0;
     } else {
      i64toi32_i32$5 = i64toi32_i32$4 >>> i64toi32_i32$0 | 0;
      $24_1 = (((1 << i64toi32_i32$0 | 0) - 1 | 0) & i64toi32_i32$4 | 0) << (32 - i64toi32_i32$0 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$0 | 0) | 0;
     }
     HEAP32[($4_1 + 20 | 0) >> 2] = $24_1;
     HEAP32[($4_1 + 16 | 0) >> 2] = Math_imul(HEAP32[($4_1 + 48 | 0) >> 2] | 0, HEAP32[($4_1 + 24 | 0) >> 2] | 0);
     HEAP32[($4_1 + 12 | 0) >> 2] = Math_imul(HEAP32[($4_1 + 16 | 0) >> 2] | 0, HEAP32[($4_1 + 20 | 0) >> 2] | 0);
     HEAP32[($4_1 + 8 | 0) >> 2] = 1;
     label$11 : {
      label$12 : while (1) {
       if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) <= (2 | 0) & 1 | 0)) {
        break label$11
       }
       label$13 : {
        if ((HEAP32[(((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
         break label$13
        }
        HEAP32[(((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[($4_1 + 16 | 0) >> 2] | 0;
        $126 = $9(HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0) | 0;
        HEAP32[(((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = $126;
        label$14 : {
         if ((HEAP32[(((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
          break label$14
         }
         HEAP32[($4_1 + 60 | 0) >> 2] = 26;
         break label$1;
        }
       }
       HEAP32[($4_1 + 8 | 0) >> 2] = (HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0;
       continue label$12;
      };
     }
    }
   }
   label$15 : {
    if (!((HEAP32[($4_1 + 52 | 0) >> 2] | 0) & 2 | 0)) {
     break label$15
    }
    HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 60 | 0) >> 2] = 1;
    label$16 : {
     if ((HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$16
     }
     HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 56 | 0) >> 2] = HEAP32[($4_1 + 44 | 0) >> 2] | 0;
     $164 = $9(HEAP32[($4_1 + 40 | 0) >> 2] | 0 | 0) | 0;
     HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 52 | 0) >> 2] = $164;
     label$17 : {
      if ((HEAP32[((HEAP32[($4_1 + 56 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
       break label$17
      }
      HEAP32[($4_1 + 60 | 0) >> 2] = 26;
      break label$1;
     }
    }
   }
   HEAP32[($4_1 + 60 | 0) >> 2] = 0;
  }
  $174 = HEAP32[($4_1 + 60 | 0) >> 2] | 0;
  global$0 = $4_1 + 64 | 0;
  return $174 | 0;
 }
 
 function $73($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $98_1 = 0, $107_1 = 0, $185 = 0;
  $5_1 = global$0 - 48 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 40 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 36 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 32 | 0) >> 2] = $2_1;
  $61(HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, $5_1 + 20 | 0 | 0);
  label$1 : {
   label$2 : {
    label$3 : {
     if ((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > (HEAP32[(HEAP32[($5_1 + 36 | 0) >> 2] | 0) >> 2] | 0) >>> 0 & 1 | 0) {
      break label$3
     }
     if ((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 > (HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 & 1 | 0) {
      break label$3
     }
     if ((HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0) >>> 0 > ((HEAP32[(HEAP32[($5_1 + 36 | 0) >> 2] | 0) >> 2] | 0) - (HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) | 0) >>> 0 & 1 | 0) {
      break label$3
     }
     if (!((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 > ((HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) - (HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) | 0) >>> 0 & 1 | 0)) {
      break label$2
     }
    }
    HEAP32[($5_1 + 44 | 0) >> 2] = 24;
    break label$1;
   }
   label$4 : {
    if (HEAP32[($5_1 + 20 | 0) >> 2] | 0) {
     break label$4
    }
    label$5 : {
     if ((HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0) & (HEAP32[($5_1 + 24 | 0) >> 2] | 0) | 0) {
      break label$5
     }
     if (!((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) & (HEAP32[($5_1 + 28 | 0) >> 2] | 0) | 0)) {
      break label$4
     }
    }
    HEAP32[($5_1 + 44 | 0) >> 2] = 24;
    break label$1;
   }
   $71(HEAP32[($5_1 + 40 | 0) >> 2] | 0 | 0, 255 | 0);
   $64(HEAP32[($5_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 36 | 0) >> 2] | 0 | 0);
   HEAP32[(HEAP32[($5_1 + 40 | 0) >> 2] | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
   HEAP32[($5_1 + 16 | 0) >> 2] = (HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0 ? 2 : 1;
   label$6 : {
    if (!((HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$6
    }
    HEAP32[($5_1 + 12 | 0) >> 2] = 0;
    label$7 : {
     label$8 : while (1) {
      if (!((HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0) <= (2 | 0) & 1 | 0)) {
       break label$7
      }
      label$9 : {
       if (!(HEAP32[(((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0)) {
        break label$9
       }
       label$10 : {
        label$11 : {
         if (HEAP32[($5_1 + 12 | 0) >> 2] | 0) {
          break label$11
         }
         $98_1 = HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0;
         break label$10;
        }
        $98_1 = (HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0) >>> (HEAP32[($5_1 + 24 | 0) >> 2] | 0) | 0;
       }
       HEAP32[($5_1 + 8 | 0) >> 2] = $98_1;
       label$12 : {
        label$13 : {
         if (HEAP32[($5_1 + 12 | 0) >> 2] | 0) {
          break label$13
         }
         $107_1 = HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
         break label$12;
        }
        $107_1 = (HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> (HEAP32[($5_1 + 28 | 0) >> 2] | 0) | 0;
       }
       HEAP32[($5_1 + 4 | 0) >> 2] = $107_1;
       HEAP32[(((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = ((HEAP32[(((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 4 | 0) >> 2] | 0, HEAP32[(((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0) + Math_imul(HEAP32[($5_1 + 8 | 0) >> 2] | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0) | 0;
       HEAP32[(((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[(((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($5_1 + 12 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
      }
      HEAP32[($5_1 + 12 | 0) >> 2] = (HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 1 | 0;
      continue label$8;
     };
    }
   }
   label$14 : {
    if (!((HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$14
    }
    HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 52 | 0) >> 2] = ((HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0) + Math_imul(HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0) | 0) + Math_imul(HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0) | 0;
    HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 56 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
   }
   HEAP32[($5_1 + 44 | 0) >> 2] = 0;
  }
  $185 = HEAP32[($5_1 + 44 | 0) >> 2] | 0;
  global$0 = $5_1 + 48 | 0;
  return $185 | 0;
 }
 
 function $74($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $71(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0, 255 | 0);
  $17((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 68 | 0 | 0);
  $17((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 136 | 0 | 0);
  $17((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 144 | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $75($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 16 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 4 | 0) >> 2] = $2_1;
  $71(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
  label$1 : {
   if (!((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & 1 | 0)) {
    break label$1
   }
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 24 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 24 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 36 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 28 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 40 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 32 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 44 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 48 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 48 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
  }
  label$2 : {
   if (!((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & 2 | 0)) {
    break label$2
   }
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 52 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 56 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 52 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 56 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 60 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 60 | 0) >> 2] = 0;
  }
  global$0 = $5_1 + 16 | 0;
  return;
 }
 
 function $76($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $6_1 = 0;
  $6_1 = global$0 - 32 | 0;
  HEAP32[($6_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($6_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($6_1 + 16 | 0) >> 2] = $2_1;
  HEAP32[($6_1 + 12 | 0) >> 2] = $3_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[($6_1 + 24 | 0) >> 2] | 0) >>> 0 > (((HEAP32[($6_1 + 16 | 0) >> 2] | 0) >>> 0) / ((HEAP32[($6_1 + 20 | 0) >> 2] | 0) >>> 0) | 0) >>> 0 & 1 | 0)) {
     break label$2
    }
    HEAP32[($6_1 + 28 | 0) >> 2] = 1;
    break label$1;
   }
   label$3 : {
    if (!(HEAP32[($6_1 + 12 | 0) >> 2] | 0)) {
     break label$3
    }
    label$4 : {
     if ((HEAP32[($6_1 + 24 | 0) >> 2] | 0) >>> 0 > (HEAP32[($6_1 + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0) {
      break label$4
     }
     if (!((HEAP32[($6_1 + 20 | 0) >> 2] | 0) >>> 0 > (HEAP32[($6_1 + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$3
     }
    }
    HEAP32[($6_1 + 28 | 0) >> 2] = 1;
    break label$1;
   }
   HEAP32[($6_1 + 28 | 0) >> 2] = 0;
  }
  return HEAP32[($6_1 + 28 | 0) >> 2] | 0 | 0;
 }
 
 function $77($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  label$1 : {
   if (!((HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   FUNCTION_TABLE[HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0](HEAP32[($3_1 + 12 | 0) >> 2] | 0);
  }
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $78($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $6_1 = 0;
  $3_1 = global$0 - 16 | 0;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $6_1 = 0;
  label$1 : {
   if (!(HEAP32[($3_1 + 12 | 0) >> 2] | 0)) {
    break label$1
   }
   $6_1 = 0;
   if (!((HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) != (3 | 0) & 1 | 0)) {
    break label$1
   }
   $6_1 = (HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) != (6 | 0);
  }
  return $6_1 & 1 | 0 | 0;
 }
 
 function $79($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $8_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $8_1 = $78(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) | 0 ? 4 : 3;
  global$0 = $3_1 + 16 | 0;
  return $8_1 | 0;
 }
 
 function $80($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $24_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) == (6 | 0) & 1 | 0)) {
     break label$2
    }
    HEAP32[($3_1 + 12 | 0) >> 2] = 2;
    break label$1;
   }
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = Math_imul($79(HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) | 0, (HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0 ? 2 : 1)), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
  }
  $24_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  global$0 = $3_1 + 16 | 0;
  return $24_1 | 0;
 }
 
 function $81($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] = HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] = 1;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 20 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 24 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = 1;
  return;
 }
 
 function $82($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $14_1 = 0, $26_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
  $83(HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0);
  (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = Math_imul(HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0, $80(HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0) | 0)), HEAP32[(wasm2js_i32$0 + 4 | 0) >> 2] = wasm2js_i32$1;
  $14_1 = $9(Math_imul(HEAP32[($3_1 + 4 | 0) >> 2] | 0, HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) | 0) | 0;
  HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 44 | 0) >> 2] = $14_1;
  label$1 : {
   label$2 : {
    if ((HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$2
    }
    HEAP32[($3_1 + 12 | 0) >> 2] = 26;
    break label$1;
   }
   HEAP32[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 48 | 0) >> 2] = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
   HEAP32[($3_1 + 12 | 0) >> 2] = 0;
  }
  $26_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
  global$0 = $3_1 + 16 | 0;
  return $26_1 | 0;
 }
 
 function $83($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  label$1 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   $10(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0);
  }
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $84($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $8_1 = 0, $19_1 = 0, $20_1 = 0, $51_1 = 0, $52_1 = 0, $53_1 = 0, $54_1 = 0, $61_1 = 0;
  $8_1 = global$0 - 64 | 0;
  global$0 = $8_1;
  HEAP32[($8_1 + 56 | 0) >> 2] = $0_1;
  HEAP32[($8_1 + 52 | 0) >> 2] = $1_1;
  HEAP32[($8_1 + 48 | 0) >> 2] = $2_1;
  HEAP32[($8_1 + 44 | 0) >> 2] = $3_1;
  HEAP32[($8_1 + 40 | 0) >> 2] = $4_1;
  HEAP32[($8_1 + 36 | 0) >> 2] = $5_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if ((HEAP32[($8_1 + 44 | 0) >> 2] | 0) >>> 0 < 64 >>> 0 & 1 | 0) {
      break label$3
     }
     if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0) >>> 0 < 64 >>> 0 & 1 | 0)) {
      break label$2
     }
    }
    $19_1 = HEAP32[($8_1 + 36 | 0) >> 2] | 0;
    $20_1 = HEAP32[($8_1 + 44 | 0) >> 2] | 0;
    HEAP32[($8_1 + 4 | 0) >> 2] = HEAP32[($8_1 + 40 | 0) >> 2] | 0;
    HEAP32[$8_1 >> 2] = $20_1;
    $50($19_1 | 0, 68041 | 0, $8_1 | 0);
    HEAP32[($8_1 + 60 | 0) >> 2] = 0;
    break label$1;
   }
   label$4 : {
    label$5 : {
     label$6 : {
      label$7 : {
       if ((HEAP32[($8_1 + 56 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0) {
        break label$7
       }
       if (!((HEAP32[($8_1 + 56 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
        break label$6
       }
      }
      if ((HEAP32[($8_1 + 52 | 0) >> 2] | 0) & 1 | 0) {
       break label$5
      }
      if ((HEAP32[($8_1 + 44 | 0) >> 2] | 0) & 1 | 0) {
       break label$5
      }
     }
     if (!((HEAP32[($8_1 + 56 | 0) >> 2] | 0 | 0) == (3 | 0) & 1 | 0)) {
      break label$4
     }
     if ((HEAP32[($8_1 + 48 | 0) >> 2] | 0) & 1 | 0) {
      break label$5
     }
     if (!((HEAP32[($8_1 + 40 | 0) >> 2] | 0) & 1 | 0)) {
      break label$4
     }
    }
    $51_1 = HEAP32[($8_1 + 36 | 0) >> 2] | 0;
    $52_1 = HEAP32[($8_1 + 52 | 0) >> 2] | 0;
    $53_1 = HEAP32[($8_1 + 48 | 0) >> 2] | 0;
    $54_1 = HEAP32[($8_1 + 44 | 0) >> 2] | 0;
    HEAP32[($8_1 + 28 | 0) >> 2] = HEAP32[($8_1 + 40 | 0) >> 2] | 0;
    HEAP32[($8_1 + 24 | 0) >> 2] = $54_1;
    HEAP32[($8_1 + 20 | 0) >> 2] = $53_1;
    HEAP32[($8_1 + 16 | 0) >> 2] = $52_1;
    $50($51_1 | 0, 67860 | 0, $8_1 + 16 | 0 | 0);
    HEAP32[($8_1 + 60 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP32[($8_1 + 60 | 0) >> 2] = 1;
  }
  $61_1 = HEAP32[($8_1 + 60 | 0) >> 2] | 0;
  global$0 = $8_1 + 64 | 0;
  return $61_1 | 0;
 }
 
 function $85($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  HEAP32[$4_1 >> 2] = 0;
  label$1 : {
   label$2 : {
    label$3 : while (1) {
     if (!((HEAP32[$4_1 >> 2] | 0 | 0) < (1 | 0) & 1 | 0)) {
      break label$2
     }
     label$4 : {
      label$5 : {
       if (!(HEAP32[($4_1 + 8 | 0) >> 2] | 0)) {
        break label$5
       }
       if (!((HEAP32[(69376 + Math_imul(HEAP32[$4_1 >> 2] | 0, 24) | 0) >> 2] | 0 | 0) != (HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$5
       }
       break label$4;
      }
      label$6 : {
       if (!(HEAP32[($4_1 + 4 | 0) >> 2] | 0)) {
        break label$6
       }
       if (!(((HEAP32[((69376 + Math_imul(HEAP32[$4_1 >> 2] | 0, 24) | 0) + 20 | 0) >> 2] | 0) & (HEAP32[($4_1 + 4 | 0) >> 2] | 0) | 0 | 0) != (HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$6
       }
       break label$4;
      }
      label$7 : {
       if (HEAP32[($4_1 + 8 | 0) >> 2] | 0) {
        break label$7
       }
       if (!((HEAP32[(69376 + Math_imul(HEAP32[$4_1 >> 2] | 0, 24) | 0) >> 2] | 0 | 0) == (6 | 0) & 1 | 0)) {
        break label$7
       }
       break label$4;
      }
      HEAP32[($4_1 + 12 | 0) >> 2] = 69376 + Math_imul(HEAP32[$4_1 >> 2] | 0, 24) | 0;
      break label$1;
     }
     HEAP32[$4_1 >> 2] = (HEAP32[$4_1 >> 2] | 0) + 1 | 0;
     continue label$3;
    };
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  return HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0;
 }
 
 function $86($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $16_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $85(HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) | 0), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[$4_1 >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$2
    }
    HEAP32[($4_1 + 12 | 0) >> 2] = HEAP32[((HEAP32[$4_1 >> 2] | 0) + 4 | 0) >> 2] | 0;
    break label$1;
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  $16_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
  global$0 = $4_1 + 16 | 0;
  return $16_1 | 0;
 }
 
 function $87($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $17_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 4 | 0) >> 2] = $1_1;
  (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $85(HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) | 0), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[$4_1 >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$2
    }
    (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = FUNCTION_TABLE[HEAP32[((HEAP32[$4_1 >> 2] | 0) + 16 | 0) >> 2] | 0 | 0]() | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
    break label$1;
   }
   HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  }
  $17_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
  global$0 = $4_1 + 16 | 0;
  return $17_1 | 0;
 }
 
 function $88($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $8_1 = 0, $196 = 0, $201 = 0, $24_1 = 0, $25_1 = 0, $34_1 = 0, $35_1 = 0, $141 = 0, $142 = 0, $153 = 0, $154 = 0, $169 = 0, $323 = 0, $373 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $8_1 = global$0 - 272 | 0;
  global$0 = $8_1;
  HEAP32[($8_1 + 264 | 0) >> 2] = $0_1;
  HEAP32[($8_1 + 260 | 0) >> 2] = $1_1;
  HEAP32[($8_1 + 256 | 0) >> 2] = $2_1;
  HEAP32[($8_1 + 252 | 0) >> 2] = $3_1;
  HEAP32[($8_1 + 248 | 0) >> 2] = $4_1;
  HEAP32[($8_1 + 244 | 0) >> 2] = $5_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[(HEAP32[($8_1 + 264 | 0) >> 2] | 0) >> 2] | 0 | 0) == (HEAP32[($8_1 + 260 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$2
    }
    if (!((HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) == (HEAP32[($8_1 + 256 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$2
    }
    HEAP32[($8_1 + 268 | 0) >> 2] = 1;
    break label$1;
   }
   label$3 : {
    label$4 : {
     if (!(HEAP32[($8_1 + 260 | 0) >> 2] | 0)) {
      break label$4
     }
     if (HEAP32[($8_1 + 256 | 0) >> 2] | 0) {
      break label$3
     }
    }
    $24_1 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
    $25_1 = HEAP32[($8_1 + 260 | 0) >> 2] | 0;
    HEAP32[($8_1 + 4 | 0) >> 2] = HEAP32[($8_1 + 256 | 0) >> 2] | 0;
    HEAP32[$8_1 >> 2] = $25_1;
    $50($24_1 | 0, 67367 | 0, $8_1 | 0);
    HEAP32[($8_1 + 268 | 0) >> 2] = 0;
    break label$1;
   }
   label$5 : {
    if (!($76(HEAP32[($8_1 + 260 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 256 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 252 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 248 | 0) >> 2] | 0 | 0) | 0)) {
     break label$5
    }
    $34_1 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
    $35_1 = HEAP32[($8_1 + 260 | 0) >> 2] | 0;
    HEAP32[($8_1 + 20 | 0) >> 2] = HEAP32[($8_1 + 256 | 0) >> 2] | 0;
    HEAP32[($8_1 + 16 | 0) >> 2] = $35_1;
    $50($34_1 | 0, 67423 | 0, $8_1 + 16 | 0 | 0);
    HEAP32[($8_1 + 268 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP32[($8_1 + 216 | 0) >> 2] = 0;
   label$6 : {
    label$7 : while (1) {
     if (!((HEAP32[($8_1 + 216 | 0) >> 2] | 0 | 0) < (3 | 0) & 1 | 0)) {
      break label$6
     }
     HEAP32[(($8_1 + 232 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
     HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = 0;
     HEAP32[(($8_1 + 220 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
     HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($8_1 + 216 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] = 0;
     HEAP32[($8_1 + 216 | 0) >> 2] = (HEAP32[($8_1 + 216 | 0) >> 2] | 0) + 1 | 0;
     continue label$7;
    };
   }
   HEAP32[($8_1 + 212 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 48 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 48 | 0) >> 2] = 0;
   HEAP32[($8_1 + 208 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 52 | 0) >> 2] = 0;
   HEAP32[($8_1 + 204 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 56 | 0) >> 2] = 0;
   HEAP32[($8_1 + 200 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 60 | 0) >> 2] = 0;
   HEAP32[($8_1 + 196 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 264 | 0) >> 2] | 0) >> 2] | 0;
   HEAP32[($8_1 + 192 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
   (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $67(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, 1 | 0) | 0), HEAP32[(wasm2js_i32$0 + 188 | 0) >> 2] = wasm2js_i32$1;
   (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $68(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, 1 | 0) | 0), HEAP32[(wasm2js_i32$0 + 184 | 0) >> 2] = wasm2js_i32$1;
   HEAP32[(HEAP32[($8_1 + 264 | 0) >> 2] | 0) >> 2] = HEAP32[($8_1 + 260 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[($8_1 + 256 | 0) >> 2] | 0;
   label$8 : {
    label$9 : {
     if ((HEAP32[($8_1 + 232 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$9
     }
     if (!((HEAP32[($8_1 + 208 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$8
     }
    }
    label$10 : {
     if (!((HEAP32[($8_1 + 196 | 0) >> 2] | 0) >>> 0 > 16384 >>> 0 & 1 | 0)) {
      break label$10
     }
     $141 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
     $142 = HEAP32[($8_1 + 196 | 0) >> 2] | 0;
     HEAP32[($8_1 + 36 | 0) >> 2] = HEAP32[($8_1 + 260 | 0) >> 2] | 0;
     HEAP32[($8_1 + 32 | 0) >> 2] = $142;
     $50($141 | 0, 67558 | 0, $8_1 + 32 | 0 | 0);
     HEAP32[($8_1 + 268 | 0) >> 2] = 0;
     break label$1;
    }
    label$11 : {
     if (!((HEAP32[($8_1 + 192 | 0) >> 2] | 0) >>> 0 > 16384 >>> 0 & 1 | 0)) {
      break label$11
     }
     $153 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
     $154 = HEAP32[($8_1 + 192 | 0) >> 2] | 0;
     HEAP32[($8_1 + 52 | 0) >> 2] = HEAP32[($8_1 + 256 | 0) >> 2] | 0;
     HEAP32[($8_1 + 48 | 0) >> 2] = $154;
     $50($153 | 0, 67490 | 0, $8_1 + 48 | 0 | 0);
     HEAP32[($8_1 + 268 | 0) >> 2] = 0;
     break label$1;
    }
   }
   label$12 : {
    if (!((HEAP32[($8_1 + 232 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$12
    }
    (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $72(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, 1 | 0) | 0), HEAP32[(wasm2js_i32$0 + 180 | 0) >> 2] = wasm2js_i32$1;
    label$13 : {
     if (!(HEAP32[($8_1 + 180 | 0) >> 2] | 0)) {
      break label$13
     }
     $169 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
     (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $62(HEAP32[($8_1 + 180 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 64 | 0) >> 2] = wasm2js_i32$1;
     $50($169 | 0, 66178 | 0, $8_1 + 64 | 0 | 0);
     HEAP32[($8_1 + 268 | 0) >> 2] = 0;
     break label$1;
    }
    HEAP32[($8_1 + 176 | 0) >> 2] = 0;
    label$14 : {
     label$15 : while (1) {
      if (!((HEAP32[($8_1 + 176 | 0) >> 2] | 0 | 0) < (3 | 0) & 1 | 0)) {
       break label$14
      }
      label$16 : {
       label$17 : {
        if ((HEAP32[(($8_1 + 232 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
         break label$17
        }
        break label$16;
       }
       label$18 : {
        label$19 : {
         if (HEAP32[($8_1 + 176 | 0) >> 2] | 0) {
          break label$19
         }
         $196 = HEAP32[($8_1 + 196 | 0) >> 2] | 0;
         break label$18;
        }
        $196 = HEAP32[($8_1 + 188 | 0) >> 2] | 0;
       }
       HEAP32[($8_1 + 172 | 0) >> 2] = $196;
       label$20 : {
        label$21 : {
         if (HEAP32[($8_1 + 176 | 0) >> 2] | 0) {
          break label$21
         }
         $201 = HEAP32[($8_1 + 192 | 0) >> 2] | 0;
         break label$20;
        }
        $201 = HEAP32[($8_1 + 184 | 0) >> 2] | 0;
       }
       HEAP32[($8_1 + 168 | 0) >> 2] = $201;
       (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $67(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 176 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 164 | 0) >> 2] = wasm2js_i32$1;
       (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $68(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 176 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 160 | 0) >> 2] = wasm2js_i32$1;
       label$22 : {
        label$23 : {
         if (!((HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0)) {
          break label$23
         }
         HEAP32[($8_1 + 156 | 0) >> 2] = HEAP32[(($8_1 + 232 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
         HEAP32[($8_1 + 152 | 0) >> 2] = (HEAP32[(($8_1 + 220 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) >>> 1 | 0;
         HEAP32[($8_1 + 148 | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
         HEAP32[($8_1 + 144 | 0) >> 2] = (HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) >>> 1 | 0;
         fimport$13(HEAP32[($8_1 + 156 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 152 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 172 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 168 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 148 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 144 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 164 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 160 | 0) >> 2] | 0 | 0, 3 | 0);
         break label$22;
        }
        HEAP32[($8_1 + 140 | 0) >> 2] = HEAP32[(($8_1 + 232 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
        HEAP32[($8_1 + 136 | 0) >> 2] = HEAP32[(($8_1 + 220 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
        HEAP32[($8_1 + 132 | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 24 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
        HEAP32[($8_1 + 128 | 0) >> 2] = HEAP32[(((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 36 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
        fimport$14(HEAP32[($8_1 + 140 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 136 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 172 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 168 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 132 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 128 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 164 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 160 | 0) >> 2] | 0 | 0, 3 | 0);
       }
       label$24 : {
        if (!(HEAP32[($8_1 + 212 | 0) >> 2] | 0)) {
         break label$24
        }
        $10(HEAP32[(($8_1 + 232 | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0 | 0);
       }
      }
      HEAP32[($8_1 + 176 | 0) >> 2] = (HEAP32[($8_1 + 176 | 0) >> 2] | 0) + 1 | 0;
      continue label$15;
     };
    }
   }
   label$25 : {
    if (!((HEAP32[($8_1 + 208 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$25
    }
    (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $72(HEAP32[($8_1 + 264 | 0) >> 2] | 0 | 0, 2 | 0) | 0), HEAP32[(wasm2js_i32$0 + 124 | 0) >> 2] = wasm2js_i32$1;
    label$26 : {
     if (!(HEAP32[($8_1 + 124 | 0) >> 2] | 0)) {
      break label$26
     }
     $323 = HEAP32[($8_1 + 244 | 0) >> 2] | 0;
     (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $62(HEAP32[($8_1 + 124 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 80 | 0) >> 2] = wasm2js_i32$1;
     $50($323 | 0, 66214 | 0, $8_1 + 80 | 0 | 0);
     HEAP32[($8_1 + 268 | 0) >> 2] = 0;
     break label$1;
    }
    label$27 : {
     label$28 : {
      if (!((HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0)) {
       break label$28
      }
      HEAP32[($8_1 + 120 | 0) >> 2] = HEAP32[($8_1 + 208 | 0) >> 2] | 0;
      HEAP32[($8_1 + 116 | 0) >> 2] = (HEAP32[($8_1 + 204 | 0) >> 2] | 0) >>> 1 | 0;
      HEAP32[($8_1 + 112 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
      HEAP32[($8_1 + 108 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0) >>> 1 | 0;
      fimport$13(HEAP32[($8_1 + 120 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 116 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 196 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 192 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 112 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 108 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 260 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 256 | 0) >> 2] | 0 | 0, 3 | 0);
      break label$27;
     }
     HEAP32[($8_1 + 104 | 0) >> 2] = HEAP32[($8_1 + 208 | 0) >> 2] | 0;
     HEAP32[($8_1 + 100 | 0) >> 2] = HEAP32[($8_1 + 204 | 0) >> 2] | 0;
     HEAP32[($8_1 + 96 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
     HEAP32[($8_1 + 92 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 264 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
     fimport$14(HEAP32[($8_1 + 104 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 100 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 196 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 192 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 96 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 92 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 260 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 256 | 0) >> 2] | 0 | 0, 3 | 0);
    }
    label$29 : {
     if (!(HEAP32[($8_1 + 200 | 0) >> 2] | 0)) {
      break label$29
     }
     $10(HEAP32[($8_1 + 208 | 0) >> 2] | 0 | 0);
    }
   }
   HEAP32[($8_1 + 268 | 0) >> 2] = 1;
  }
  $373 = HEAP32[($8_1 + 268 | 0) >> 2] | 0;
  global$0 = $8_1 + 272 | 0;
  return $373 | 0;
 }
 
 function $89($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $7_1 = 0, $24_1 = 0, $31_1 = 0, $50_1 = 0, $57_1 = 0, $76_1 = 0, $83_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  $7_1 = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + -8 | 0;
  label$1 : {
   label$2 : {
    switch ($7_1 | 0) {
    case 0:
     HEAP32[($4_1 + 8 | 0) >> 2] = (Math_imul((HEAP32[($4_1 + 8 | 0) >> 2] | 0) - 16 | 0, 255) + 109 | 0 | 0) / (219 | 0) | 0;
     label$5 : {
      label$6 : {
       if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) < (0 | 0) & 1 | 0)) {
        break label$6
       }
       $24_1 = 0;
       break label$5;
      }
      label$7 : {
       label$8 : {
        if (!((255 | 0) < (HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) & 1 | 0)) {
         break label$8
        }
        $31_1 = 255;
        break label$7;
       }
       $31_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
      }
      $24_1 = $31_1;
     }
     HEAP32[($4_1 + 8 | 0) >> 2] = $24_1;
     break label$1;
    case 2:
     HEAP32[($4_1 + 8 | 0) >> 2] = (Math_imul((HEAP32[($4_1 + 8 | 0) >> 2] | 0) - 64 | 0, 1023) + 438 | 0 | 0) / (876 | 0) | 0;
     label$9 : {
      label$10 : {
       if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) < (0 | 0) & 1 | 0)) {
        break label$10
       }
       $50_1 = 0;
       break label$9;
      }
      label$11 : {
       label$12 : {
        if (!((1023 | 0) < (HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) & 1 | 0)) {
         break label$12
        }
        $57_1 = 1023;
        break label$11;
       }
       $57_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
      }
      $50_1 = $57_1;
     }
     HEAP32[($4_1 + 8 | 0) >> 2] = $50_1;
     break label$1;
    case 4:
     break label$2;
    default:
     break label$1;
    };
   }
   HEAP32[($4_1 + 8 | 0) >> 2] = (Math_imul((HEAP32[($4_1 + 8 | 0) >> 2] | 0) - 256 | 0, 4095) + 1752 | 0 | 0) / (3504 | 0) | 0;
   label$13 : {
    label$14 : {
     if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) < (0 | 0) & 1 | 0)) {
      break label$14
     }
     $76_1 = 0;
     break label$13;
    }
    label$15 : {
     label$16 : {
      if (!((4095 | 0) < (HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$16
      }
      $83_1 = 4095;
      break label$15;
     }
     $83_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
    }
    $76_1 = $83_1;
   }
   HEAP32[($4_1 + 8 | 0) >> 2] = $76_1;
  }
  return HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0;
 }
 
 function $90($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 8 | 0) >> 2] | 0, 48) | 0;
    label$3 : {
     if (!(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0)) {
      break label$3
     }
     $17(HEAP32[($3_1 + 4 | 0) >> 2] | 0 | 0);
    }
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  $14(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $91() {
  var $2_1 = 0, $18_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $2_1 = global$0 - 16 | 0;
  global$0 = $2_1;
  (wasm2js_i32$0 = $2_1, wasm2js_i32$1 = $9(408 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
  $5(HEAP32[($2_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0, 408 | 0) | 0;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = 1;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] = 268435456;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 32 | 0) >> 2] = 32768;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] = 2592e3;
  HEAP32[((HEAP32[($2_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = 7;
  $18_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
  global$0 = $2_1 + 16 | 0;
  return $18_1 | 0;
 }
 
 function $92($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $93(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  $51(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $93($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  label$1 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$1
   }
   $94(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 404 | 0) >> 2] = 0;
  }
  label$2 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$2
   }
   $74(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 44 | 0) >> 2] = 0;
  }
  $49((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 144 | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $94($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $114(HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0);
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + ((HEAP32[($3_1 + 8 | 0) >> 2] | 0) << 6 | 0) | 0;
    label$3 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$3
     }
     $115(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0 | 0);
    }
    label$4 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$4
     }
     $114(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0 | 0);
    }
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 4 | 0 | 0);
  $95(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 20 | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $95($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 8 | 0) >> 2] | 0, 28) | 0;
    label$3 : {
     if (!((HEAP32[(HEAP32[($3_1 + 4 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$3
     }
     $90(HEAP32[(HEAP32[($3_1 + 4 | 0) >> 2] | 0) >> 2] | 0 | 0);
     HEAP32[(HEAP32[($3_1 + 4 | 0) >> 2] | 0) >> 2] = 0;
    }
    label$4 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$4
     }
     label$5 : {
      if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$5
      }
      if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$5
      }
      $77(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0);
     }
     HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
    }
    label$6 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$6
     }
     $74(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0);
     HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 12 | 0) >> 2] = 0;
    }
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 36 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 64 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 68 | 0) >> 2] = 0;
  label$7 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$7
   }
   $77(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] = 0;
  }
  label$8 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$8
   }
   $77(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] = 0;
  }
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $96($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $8_1 = 0, i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$3 = 0, $325$hi = 0, $326$hi = 0, $327$hi = 0, $328$hi = 0, $111_1 = 0, $124 = 0, $131 = 0, $329$hi = 0, $330$hi = 0, $332$hi = 0, $333$hi = 0, $334$hi = 0, $335$hi = 0, $23_1 = 0, $43_1 = 0, $62_1 = 0, $519 = 0, $80_1 = 0, $93_1 = 0, $189 = 0, $207 = 0, $334 = 0, $884 = 0, $231 = 0, $255 = 0, $257 = 0, $258 = 0, $988 = 0, $299 = 0, $301 = 0, $322 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $8_1 = global$0 - 240 | 0;
  global$0 = $8_1;
  HEAP32[($8_1 + 232 | 0) >> 2] = $0_1;
  HEAP32[($8_1 + 228 | 0) >> 2] = $1_1;
  HEAP32[($8_1 + 224 | 0) >> 2] = $2_1;
  HEAP32[($8_1 + 220 | 0) >> 2] = $3_1;
  HEAP32[($8_1 + 216 | 0) >> 2] = $4_1;
  HEAP32[($8_1 + 212 | 0) >> 2] = $5_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$2
    }
    if (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 136 | 0) >> 2] | 0) {
     break label$2
    }
    label$3 : {
     if (!((HEAP32[($8_1 + 220 | 0) >> 2] | 0) >>> 0 >= (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 128 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$3
     }
     $23_1 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
     HEAP32[($8_1 + 144 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
     $50($23_1 | 0, 65655 | 0, $8_1 + 144 | 0 | 0);
     HEAP32[($8_1 + 236 | 0) >> 2] = 20;
     break label$1;
    }
    HEAP32[(HEAP32[($8_1 + 224 | 0) >> 2] | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0) >> 2] | 0) + (HEAP32[($8_1 + 220 | 0) >> 2] | 0) | 0;
    HEAP32[((HEAP32[($8_1 + 224 | 0) >> 2] | 0) + 4 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 128 | 0) >> 2] | 0) - (HEAP32[($8_1 + 220 | 0) >> 2] | 0) | 0;
    HEAP32[($8_1 + 236 | 0) >> 2] = 0;
    break label$1;
   }
   label$4 : {
    if (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 116 | 0) >> 2] | 0) {
     break label$4
    }
    $43_1 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
    HEAP32[$8_1 >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
    $50($43_1 | 0, 65748 | 0, $8_1 | 0);
    HEAP32[($8_1 + 236 | 0) >> 2] = 20;
    break label$1;
   }
   HEAP32[($8_1 + 208 | 0) >> 2] = 0;
   label$5 : {
    if (!(HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0)) {
     break label$5
    }
    label$6 : {
     label$7 : {
      if (!((HEAP32[((HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0) >>> 0 > 0 >>> 0 & 1 | 0)) {
       break label$7
      }
      HEAP32[($8_1 + 208 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) + 32 | 0;
      break label$6;
     }
     $62_1 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
     HEAP32[($8_1 + 128 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
     $50($62_1 | 0, 66827 | 0, $8_1 + 128 | 0 | 0);
     HEAP32[($8_1 + 236 | 0) >> 2] = 3;
     break label$1;
    }
   }
   i64toi32_i32$2 = HEAP32[($8_1 + 228 | 0) >> 2] | 0;
   i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 16 | 0) >> 2] | 0;
   i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 20 | 0) >> 2] | 0;
   $325$hi = i64toi32_i32$1;
   i64toi32_i32$1 = 0;
   $326$hi = i64toi32_i32$1;
   i64toi32_i32$1 = $325$hi;
   i64toi32_i32$1 = $326$hi;
   i64toi32_i32$1 = $325$hi;
   i64toi32_i32$2 = i64toi32_i32$0;
   i64toi32_i32$0 = $326$hi;
   i64toi32_i32$3 = 0;
   label$8 : {
    if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0) & 1 | 0)) {
     break label$8
    }
    i64toi32_i32$2 = 0;
    $327$hi = i64toi32_i32$2;
    i64toi32_i32$3 = HEAP32[($8_1 + 228 | 0) >> 2] | 0;
    i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 16 | 0) >> 2] | 0;
    i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 20 | 0) >> 2] | 0;
    $328$hi = i64toi32_i32$1;
    i64toi32_i32$1 = $327$hi;
    i64toi32_i32$1 = $328$hi;
    $519 = i64toi32_i32$2;
    i64toi32_i32$1 = $327$hi;
    i64toi32_i32$3 = HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
    i64toi32_i32$2 = $328$hi;
    i64toi32_i32$0 = $519;
    if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$2 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$2 | 0) & i64toi32_i32$3 >>> 0 > i64toi32_i32$0 >>> 0 | 0) | 0) & 1 | 0)) {
     break label$8
    }
    $80_1 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
    HEAP32[($8_1 + 16 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
    $50($80_1 | 0, 67782 | 0, $8_1 + 16 | 0 | 0);
    HEAP32[($8_1 + 236 | 0) >> 2] = 20;
    break label$1;
   }
   label$9 : {
    if (!((HEAP32[($8_1 + 220 | 0) >> 2] | 0) >>> 0 >= (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$9
    }
    $93_1 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
    HEAP32[($8_1 + 32 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
    $50($93_1 | 0, 65655 | 0, $8_1 + 32 | 0 | 0);
    HEAP32[($8_1 + 236 | 0) >> 2] = 20;
    break label$1;
   }
   HEAP32[($8_1 + 204 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) - (HEAP32[($8_1 + 220 | 0) >> 2] | 0) | 0;
   label$10 : {
    label$11 : {
     if (!(HEAP32[($8_1 + 216 | 0) >> 2] | 0)) {
      break label$11
     }
     if (!((HEAP32[($8_1 + 216 | 0) >> 2] | 0) >>> 0 < (HEAP32[($8_1 + 204 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$11
     }
     $111_1 = HEAP32[($8_1 + 216 | 0) >> 2] | 0;
     break label$10;
    }
    $111_1 = HEAP32[($8_1 + 204 | 0) >> 2] | 0;
   }
   HEAP32[($8_1 + 200 | 0) >> 2] = $111_1;
   HEAP32[($8_1 + 196 | 0) >> 2] = (HEAP32[($8_1 + 220 | 0) >> 2] | 0) + (HEAP32[($8_1 + 200 | 0) >> 2] | 0) | 0;
   $124 = 0;
   label$12 : {
    if (!((HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 116 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
     break label$12
    }
    $131 = 1;
    label$13 : {
     if ((HEAP32[($8_1 + 208 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$13
     }
     $131 = (HEAP32[((HEAP32[($8_1 + 228 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0) != (0 | 0);
    }
    $124 = $131;
   }
   HEAP32[($8_1 + 192 | 0) >> 2] = $124 & 1 | 0;
   label$14 : {
    if (HEAP32[($8_1 + 192 | 0) >> 2] | 0) {
     break label$14
    }
    (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = $15((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0 | 0, HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 188 | 0) >> 2] = wasm2js_i32$1;
    label$15 : {
     if (!(HEAP32[($8_1 + 188 | 0) >> 2] | 0)) {
      break label$15
     }
     HEAP32[($8_1 + 236 | 0) >> 2] = HEAP32[($8_1 + 188 | 0) >> 2] | 0;
     break label$1;
    }
    HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 132 | 0) >> 2] = 1;
   }
   HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 136 | 0) >> 2] = 1;
   HEAP32[($8_1 + 184 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0) >> 2] | 0;
   HEAP32[($8_1 + 180 | 0) >> 2] = HEAP32[($8_1 + 196 | 0) >> 2] | 0;
   HEAP32[($8_1 + 176 | 0) >> 2] = 0;
   label$16 : {
    label$17 : while (1) {
     if (!((HEAP32[($8_1 + 176 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 116 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$16
     }
     HEAP32[($8_1 + 172 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0) + ((HEAP32[($8_1 + 176 | 0) >> 2] | 0) << 4 | 0) | 0;
     HEAP32[($8_1 + 168 | 0) >> 2] = HEAP32[((HEAP32[($8_1 + 172 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
     label$18 : {
      if (!((HEAP32[($8_1 + 168 | 0) >> 2] | 0) >>> 0 > (HEAP32[($8_1 + 180 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
       break label$18
      }
      HEAP32[($8_1 + 168 | 0) >> 2] = HEAP32[($8_1 + 180 | 0) >> 2] | 0;
     }
     label$19 : {
      label$20 : {
       if (!((HEAP32[($8_1 + 208 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
        break label$20
       }
       i64toi32_i32$0 = HEAP32[($8_1 + 172 | 0) >> 2] | 0;
       i64toi32_i32$3 = HEAP32[i64toi32_i32$0 >> 2] | 0;
       i64toi32_i32$1 = HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] | 0;
       $329$hi = i64toi32_i32$1;
       i64toi32_i32$1 = 0;
       $330$hi = i64toi32_i32$1;
       i64toi32_i32$1 = $329$hi;
       i64toi32_i32$1 = $330$hi;
       i64toi32_i32$1 = $329$hi;
       i64toi32_i32$0 = i64toi32_i32$3;
       i64toi32_i32$3 = $330$hi;
       i64toi32_i32$2 = HEAP32[((HEAP32[($8_1 + 208 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
       label$21 : {
        if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$3 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$3 | 0) & i64toi32_i32$0 >>> 0 > i64toi32_i32$2 >>> 0 | 0) | 0) & 1 | 0)) {
         break label$21
        }
        $189 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
        HEAP32[($8_1 + 48 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
        $50($189 | 0, 66274 | 0, $8_1 + 48 | 0 | 0);
        HEAP32[($8_1 + 236 | 0) >> 2] = 9;
        break label$1;
       }
       i64toi32_i32$2 = HEAP32[($8_1 + 172 | 0) >> 2] | 0;
       i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
       i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
       HEAP32[($8_1 + 156 | 0) >> 2] = i64toi32_i32$0;
       label$22 : {
        if (!((HEAP32[((HEAP32[($8_1 + 172 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > ((HEAP32[((HEAP32[($8_1 + 208 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) - (HEAP32[($8_1 + 156 | 0) >> 2] | 0) | 0) >>> 0 & 1 | 0)) {
         break label$22
        }
        $207 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
        HEAP32[($8_1 + 64 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
        $50($207 | 0, 66329 | 0, $8_1 + 64 | 0 | 0);
        HEAP32[($8_1 + 236 | 0) >> 2] = 9;
        break label$1;
       }
       HEAP32[($8_1 + 160 | 0) >> 2] = (HEAP32[(HEAP32[($8_1 + 208 | 0) >> 2] | 0) >> 2] | 0) + (HEAP32[($8_1 + 156 | 0) >> 2] | 0) | 0;
       HEAP32[($8_1 + 164 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 208 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) - (HEAP32[($8_1 + 156 | 0) >> 2] | 0) | 0;
       break label$19;
      }
      i64toi32_i32$2 = HEAP32[($8_1 + 228 | 0) >> 2] | 0;
      i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 16 | 0) >> 2] | 0;
      i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 20 | 0) >> 2] | 0;
      $332$hi = i64toi32_i32$0;
      i64toi32_i32$0 = 0;
      $333$hi = i64toi32_i32$0;
      i64toi32_i32$0 = $332$hi;
      i64toi32_i32$0 = $333$hi;
      i64toi32_i32$0 = $332$hi;
      i64toi32_i32$2 = i64toi32_i32$1;
      i64toi32_i32$1 = $333$hi;
      i64toi32_i32$3 = 0;
      label$23 : {
       if (!((i64toi32_i32$0 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$0 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0) & 1 | 0)) {
        break label$23
       }
       i64toi32_i32$3 = HEAP32[($8_1 + 172 | 0) >> 2] | 0;
       i64toi32_i32$2 = HEAP32[i64toi32_i32$3 >> 2] | 0;
       i64toi32_i32$0 = HEAP32[(i64toi32_i32$3 + 4 | 0) >> 2] | 0;
       $334 = i64toi32_i32$2;
       $334$hi = i64toi32_i32$0;
       i64toi32_i32$3 = HEAP32[($8_1 + 228 | 0) >> 2] | 0;
       i64toi32_i32$0 = HEAP32[(i64toi32_i32$3 + 16 | 0) >> 2] | 0;
       i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 20 | 0) >> 2] | 0;
       $335$hi = i64toi32_i32$2;
       i64toi32_i32$2 = $334$hi;
       i64toi32_i32$2 = $335$hi;
       $884 = i64toi32_i32$0;
       i64toi32_i32$2 = $334$hi;
       i64toi32_i32$3 = $334;
       i64toi32_i32$0 = $335$hi;
       i64toi32_i32$1 = $884;
       if (!((i64toi32_i32$2 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$2 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$3 >>> 0 > i64toi32_i32$1 >>> 0 | 0) | 0) & 1 | 0)) {
        break label$23
       }
       $231 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
       HEAP32[($8_1 + 96 | 0) >> 2] = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
       $50($231 | 0, 67710 | 0, $8_1 + 96 | 0 | 0);
       HEAP32[($8_1 + 236 | 0) >> 2] = 9;
       break label$1;
      }
      i64toi32_i32$1 = HEAP32[($8_1 + 172 | 0) >> 2] | 0;
      i64toi32_i32$3 = HEAP32[i64toi32_i32$1 >> 2] | 0;
      i64toi32_i32$2 = HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] | 0;
      (wasm2js_i32$0 = $8_1, wasm2js_i32$1 = FUNCTION_TABLE[HEAP32[((HEAP32[($8_1 + 228 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0](HEAP32[($8_1 + 228 | 0) >> 2] | 0, 0, i64toi32_i32$3, i64toi32_i32$2, HEAP32[($8_1 + 168 | 0) >> 2] | 0, $8_1 + 160 | 0) | 0), HEAP32[(wasm2js_i32$0 + 152 | 0) >> 2] = wasm2js_i32$1;
      label$24 : {
       if (!(HEAP32[($8_1 + 152 | 0) >> 2] | 0)) {
        break label$24
       }
       HEAP32[($8_1 + 236 | 0) >> 2] = HEAP32[($8_1 + 152 | 0) >> 2] | 0;
       break label$1;
      }
      label$25 : {
       if (!((HEAP32[($8_1 + 168 | 0) >> 2] | 0 | 0) != (HEAP32[($8_1 + 164 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$25
       }
       $255 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
       $257 = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
       $258 = HEAP32[($8_1 + 168 | 0) >> 2] | 0;
       HEAP32[($8_1 + 120 | 0) >> 2] = HEAP32[($8_1 + 164 | 0) >> 2] | 0;
       HEAP32[($8_1 + 116 | 0) >> 2] = $258;
       HEAP32[($8_1 + 112 | 0) >> 2] = $257;
       $50($255 | 0, 65895 | 0, $8_1 + 112 | 0 | 0);
       HEAP32[($8_1 + 236 | 0) >> 2] = 20;
       break label$1;
      }
     }
     label$26 : {
      label$27 : {
       if (!(HEAP32[($8_1 + 192 | 0) >> 2] | 0)) {
        break label$27
       }
       i64toi32_i32$1 = $8_1;
       i64toi32_i32$2 = HEAP32[($8_1 + 160 | 0) >> 2] | 0;
       i64toi32_i32$3 = HEAP32[($8_1 + 164 | 0) >> 2] | 0;
       $988 = i64toi32_i32$2;
       i64toi32_i32$2 = (HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0;
       HEAP32[i64toi32_i32$2 >> 2] = $988;
       HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] = i64toi32_i32$3;
       HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 128 | 0) >> 2] = HEAP32[($8_1 + 168 | 0) >> 2] | 0;
       break label$26;
      }
      label$28 : {
       if (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 132 | 0) >> 2] | 0) {
        break label$28
       }
       fimport$3(65776 | 0, 67305 | 0, 1307 | 0, 67232 | 0);
       wasm2js_trap();
      }
      label$29 : {
       if ((HEAP32[($8_1 + 184 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
        break label$29
       }
       fimport$3(65621 | 0, 67305 | 0, 1308 | 0, 67232 | 0);
       wasm2js_trap();
      }
      $4(HEAP32[($8_1 + 184 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 160 | 0) >> 2] | 0 | 0, HEAP32[($8_1 + 168 | 0) >> 2] | 0 | 0) | 0;
      HEAP32[($8_1 + 184 | 0) >> 2] = (HEAP32[($8_1 + 184 | 0) >> 2] | 0) + (HEAP32[($8_1 + 168 | 0) >> 2] | 0) | 0;
     }
     HEAP32[($8_1 + 180 | 0) >> 2] = (HEAP32[($8_1 + 180 | 0) >> 2] | 0) - (HEAP32[($8_1 + 168 | 0) >> 2] | 0) | 0;
     label$30 : {
      if (HEAP32[($8_1 + 180 | 0) >> 2] | 0) {
       break label$30
      }
      break label$16;
     }
     HEAP32[($8_1 + 176 | 0) >> 2] = (HEAP32[($8_1 + 176 | 0) >> 2] | 0) + 1 | 0;
     continue label$17;
    };
   }
   label$31 : {
    if (!(HEAP32[($8_1 + 180 | 0) >> 2] | 0)) {
     break label$31
    }
    $299 = HEAP32[($8_1 + 212 | 0) >> 2] | 0;
    $301 = HEAP32[(HEAP32[($8_1 + 232 | 0) >> 2] | 0) >> 2] | 0;
    HEAP32[($8_1 + 84 | 0) >> 2] = HEAP32[($8_1 + 180 | 0) >> 2] | 0;
    HEAP32[($8_1 + 80 | 0) >> 2] = $301;
    $50($299 | 0, 65959 | 0, $8_1 + 80 | 0 | 0);
    HEAP32[($8_1 + 236 | 0) >> 2] = 20;
    break label$1;
   }
   HEAP32[(HEAP32[($8_1 + 224 | 0) >> 2] | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 124 | 0) >> 2] | 0) + (HEAP32[($8_1 + 220 | 0) >> 2] | 0) | 0;
   HEAP32[((HEAP32[($8_1 + 224 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[($8_1 + 200 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 136 | 0) >> 2] = (HEAP32[((HEAP32[($8_1 + 232 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (HEAP32[($8_1 + 196 | 0) >> 2] | 0 | 0) & 1 | 0;
   HEAP32[($8_1 + 236 | 0) >> 2] = 0;
  }
  $322 = HEAP32[($8_1 + 236 | 0) >> 2] | 0;
  global$0 = $8_1 + 240 | 0;
  return $322 | 0;
 }
 
 function $97($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$3 = 0, i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, $117$hi = 0, $118$hi = 0, $121$hi = 0, $122$hi = 0, $123$hi = 0, $124$hi = 0, $260 = 0, $123 = 0, $298 = 0, $406 = 0, $114_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 64 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 56 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 52 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 48 | 0) >> 2] = $2_1;
  label$1 : {
   label$2 : {
    label$3 : {
     if (!(HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0)) {
      break label$3
     }
     if (!(HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0)) {
      break label$2
     }
    }
    HEAP32[($5_1 + 44 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0;
    label$4 : {
     if (!(HEAP32[($5_1 + 48 | 0) >> 2] | 0)) {
      break label$4
     }
     if (!((HEAP32[($5_1 + 44 | 0) >> 2] | 0) >>> 0 > (HEAP32[($5_1 + 48 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$4
     }
     HEAP32[($5_1 + 44 | 0) >> 2] = HEAP32[($5_1 + 48 | 0) >> 2] | 0;
    }
    label$5 : {
     label$6 : {
      if (!(HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0)) {
       break label$6
      }
      (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $100(HEAP32[(HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 40 | 0) >> 2] = wasm2js_i32$1;
      i64toi32_i32$2 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
      i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 24 | 0) >> 2] | 0;
      i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 28 | 0) >> 2] | 0;
      $117$hi = i64toi32_i32$1;
      i64toi32_i32$1 = 0;
      $118$hi = i64toi32_i32$1;
      i64toi32_i32$1 = $117$hi;
      i64toi32_i32$1 = $118$hi;
      i64toi32_i32$1 = $117$hi;
      i64toi32_i32$2 = i64toi32_i32$0;
      i64toi32_i32$0 = $118$hi;
      i64toi32_i32$3 = -1;
      label$7 : {
       if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$2 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0) & 1 | 0)) {
        break label$7
       }
       HEAP32[($5_1 + 60 | 0) >> 2] = 9;
       break label$1;
      }
      i64toi32_i32$3 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
      i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 24 | 0) >> 2] | 0;
      i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 28 | 0) >> 2] | 0;
      HEAP32[($5_1 + 28 | 0) >> 2] = i64toi32_i32$2;
      (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $96(HEAP32[($5_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0 | 0, $5_1 + 32 | 0 | 0, HEAP32[($5_1 + 28 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 44 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 144 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 24 | 0) >> 2] = wasm2js_i32$1;
      label$8 : {
       if (!(HEAP32[($5_1 + 24 | 0) >> 2] | 0)) {
        break label$8
       }
       HEAP32[($5_1 + 60 | 0) >> 2] = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
       break label$1;
      }
      i64toi32_i32$3 = $5_1;
      i64toi32_i32$1 = HEAP32[($5_1 + 32 | 0) >> 2] | 0;
      i64toi32_i32$2 = HEAP32[($5_1 + 36 | 0) >> 2] | 0;
      $260 = i64toi32_i32$1;
      i64toi32_i32$1 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
      HEAP32[i64toi32_i32$1 >> 2] = $260;
      HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$2;
      HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
      HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 136 | 0) >> 2] | 0;
      break label$5;
     }
     i64toi32_i32$3 = HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0;
     i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 16 | 0) >> 2] | 0;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 20 | 0) >> 2] | 0;
     $121$hi = i64toi32_i32$1;
     i64toi32_i32$1 = 0;
     $122$hi = i64toi32_i32$1;
     i64toi32_i32$1 = $121$hi;
     i64toi32_i32$1 = $122$hi;
     i64toi32_i32$1 = $121$hi;
     i64toi32_i32$3 = i64toi32_i32$2;
     i64toi32_i32$2 = $122$hi;
     i64toi32_i32$0 = 0;
     label$9 : {
      if (!((i64toi32_i32$1 >>> 0 > i64toi32_i32$2 >>> 0 | ((i64toi32_i32$1 | 0) == (i64toi32_i32$2 | 0) & i64toi32_i32$3 >>> 0 > i64toi32_i32$0 >>> 0 | 0) | 0) & 1 | 0)) {
       break label$9
      }
      i64toi32_i32$0 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
      i64toi32_i32$3 = HEAP32[(i64toi32_i32$0 + 24 | 0) >> 2] | 0;
      i64toi32_i32$1 = HEAP32[(i64toi32_i32$0 + 28 | 0) >> 2] | 0;
      $123 = i64toi32_i32$3;
      $123$hi = i64toi32_i32$1;
      i64toi32_i32$0 = HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0;
      i64toi32_i32$1 = HEAP32[(i64toi32_i32$0 + 16 | 0) >> 2] | 0;
      i64toi32_i32$3 = HEAP32[(i64toi32_i32$0 + 20 | 0) >> 2] | 0;
      $124$hi = i64toi32_i32$3;
      i64toi32_i32$3 = $123$hi;
      i64toi32_i32$3 = $124$hi;
      $298 = i64toi32_i32$1;
      i64toi32_i32$3 = $123$hi;
      i64toi32_i32$0 = $123;
      i64toi32_i32$1 = $124$hi;
      i64toi32_i32$2 = $298;
      if (!((i64toi32_i32$3 >>> 0 > i64toi32_i32$1 >>> 0 | ((i64toi32_i32$3 | 0) == (i64toi32_i32$1 | 0) & i64toi32_i32$0 >>> 0 > i64toi32_i32$2 >>> 0 | 0) | 0) & 1 | 0)) {
       break label$9
      }
      HEAP32[($5_1 + 60 | 0) >> 2] = 9;
      break label$1;
     }
     i64toi32_i32$2 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
     i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 24 | 0) >> 2] | 0;
     i64toi32_i32$3 = HEAP32[(i64toi32_i32$2 + 28 | 0) >> 2] | 0;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = FUNCTION_TABLE[HEAP32[((HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0](HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0, 0, i64toi32_i32$0, i64toi32_i32$3, HEAP32[($5_1 + 44 | 0) >> 2] | 0, $5_1 + 16 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
     label$10 : {
      if (!(HEAP32[($5_1 + 12 | 0) >> 2] | 0)) {
       break label$10
      }
      HEAP32[($5_1 + 60 | 0) >> 2] = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
      break label$1;
     }
     label$11 : {
      if (!((HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) != (HEAP32[($5_1 + 44 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$11
      }
      HEAP32[($5_1 + 60 | 0) >> 2] = 20;
      break label$1;
     }
     HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 8 | 0) >> 2] = ((HEAP32[((HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0;
     HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 12 | 0) >> 2] = (HEAP32[($5_1 + 44 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($5_1 + 52 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0) & 1 | 0;
     label$12 : {
      label$13 : {
       if (!(HEAP32[((HEAP32[((HEAP32[($5_1 + 56 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0)) {
        break label$13
       }
       i64toi32_i32$2 = $5_1;
       i64toi32_i32$3 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
       i64toi32_i32$0 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
       $406 = i64toi32_i32$3;
       i64toi32_i32$3 = HEAP32[($5_1 + 52 | 0) >> 2] | 0;
       HEAP32[i64toi32_i32$3 >> 2] = $406;
       HEAP32[(i64toi32_i32$3 + 4 | 0) >> 2] = i64toi32_i32$0;
       break label$12;
      }
      (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $16(HEAP32[($5_1 + 52 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
      label$14 : {
       if (!(HEAP32[($5_1 + 8 | 0) >> 2] | 0)) {
        break label$14
       }
       HEAP32[($5_1 + 60 | 0) >> 2] = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
       break label$1;
      }
     }
    }
   }
   HEAP32[($5_1 + 60 | 0) >> 2] = 0;
  }
  $114_1 = HEAP32[($5_1 + 60 | 0) >> 2] | 0;
  global$0 = $5_1 + 64 | 0;
  return $114_1 | 0;
 }
 
 function $98($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  $51(HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0 | 0);
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 400 | 0) >> 2] = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
  global$0 = $4_1 + 16 | 0;
  return;
 }
 
 function $99($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 16 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 4 | 0) >> 2] = $2_1;
  (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $52(HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0) | 0), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
  label$1 : {
   if ((HEAP32[$5_1 >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
    break label$1
   }
   fimport$3(66395 | 0, 67305 | 0, 3294 | 0, 65550 | 0);
   wasm2js_trap();
  }
  $98(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[$5_1 >> 2] | 0 | 0);
  global$0 = $5_1 + 16 | 0;
  return 0 | 0;
 }
 
 function $100($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $70_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $4_1 = global$0 - 32 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 20 | 0) >> 2] = $1_1;
  label$1 : {
   label$2 : {
    if (HEAP32[($4_1 + 20 | 0) >> 2] | 0) {
     break label$2
    }
    HEAP32[($4_1 + 28 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP32[($4_1 + 16 | 0) >> 2] = 0;
   label$3 : {
    label$4 : while (1) {
     if (!((HEAP32[($4_1 + 16 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$3
     }
     label$5 : {
      if (!((HEAP32[(HEAP32[((HEAP32[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 2] | 0) + ((HEAP32[($4_1 + 16 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) >> 2] | 0 | 0) == (HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$5
      }
      HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[((HEAP32[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 2] | 0) + ((HEAP32[($4_1 + 16 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
      break label$1;
     }
     HEAP32[($4_1 + 16 | 0) >> 2] = (HEAP32[($4_1 + 16 | 0) >> 2] | 0) + 1 | 0;
     continue label$4;
    };
   }
   (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $9(172 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
   $5(HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0, 0 | 0, 172 | 0) | 0;
   label$6 : {
    label$7 : {
     if ($11((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 92 | 0 | 0, 72 | 0, 16 | 0) | 0) {
      break label$7
     }
     break label$6;
    }
    label$8 : {
     if ($11((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 108 | 0 | 0, 16 | 0, 1 | 0) | 0) {
      break label$8
     }
     break label$6;
    }
    HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
    HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[($4_1 + 24 | 0) >> 2] | 0;
    (wasm2js_i32$0 = $4_1, wasm2js_i32$1 = $13(HEAP32[($4_1 + 24 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
    HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
    HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
    break label$1;
   }
   $14((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 108 | 0 | 0);
   $14((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 92 | 0 | 0);
   $10(HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0);
   HEAP32[($4_1 + 28 | 0) >> 2] = 0;
  }
  $70_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
  global$0 = $4_1 + 32 | 0;
  return $70_1 | 0;
 }
 
 function $101($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $204 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 48 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 40 | 0) >> 2] = $0_1;
  $49((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0);
  label$1 : {
   label$2 : {
    label$3 : {
     if (!((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$3
     }
     if (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) {
      break label$2
     }
    }
    HEAP32[($3_1 + 44 | 0) >> 2] = 3;
    break label$1;
   }
   label$4 : {
    label$5 : {
     if (!((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$5
     }
     if ((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 400 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
      break label$4
     }
    }
    HEAP32[($3_1 + 44 | 0) >> 2] = 21;
    break label$1;
   }
   label$6 : {
    if (!((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0 | 0) == (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$6
    }
    if (!((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 68 | 0) >> 2] | 0 | 0) == (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$6
    }
    HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 40 | 0) >> 2] = 0;
    HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 68 | 0) >> 2] = 0;
   }
   label$7 : {
    if ((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0) == ((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0) + (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0) | 0 | 0) & 1 | 0) {
     break label$7
    }
    fimport$3(68376 | 0, 67305 | 0, 4385 | 0, 66775 | 0);
    wasm2js_trap();
   }
   HEAP32[($3_1 + 36 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 48 | 0) >> 2] | 0) + 1 | 0;
   label$8 : {
    if ((HEAP32[((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$8
    }
    (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $102(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 32 | 0) >> 2] = wasm2js_i32$1;
    label$9 : {
     if (!(HEAP32[($3_1 + 32 | 0) >> 2] | 0)) {
      break label$9
     }
     HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 32 | 0) >> 2] | 0;
     break label$1;
    }
   }
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $103(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0, (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 36 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 28 | 0) >> 2] = wasm2js_i32$1;
   label$10 : {
    label$11 : {
     if (!(HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0)) {
      break label$11
     }
     if (!((HEAP32[($3_1 + 28 | 0) >> 2] | 0 | 0) != (23 | 0) & 1 | 0)) {
      break label$10
     }
    }
    HEAP32[($3_1 + 24 | 0) >> 2] = HEAP32[($3_1 + 28 | 0) >> 2] | 0;
    label$12 : {
     if (!(HEAP32[($3_1 + 24 | 0) >> 2] | 0)) {
      break label$12
     }
     HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
     break label$1;
    }
   }
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $103(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0, (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 64 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 20 | 0) >> 2] = wasm2js_i32$1;
   label$13 : {
    label$14 : {
     if (!(HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0)) {
      break label$14
     }
     if (!((HEAP32[($3_1 + 20 | 0) >> 2] | 0 | 0) != (23 | 0) & 1 | 0)) {
      break label$13
     }
    }
    HEAP32[($3_1 + 16 | 0) >> 2] = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
    label$15 : {
     if (!(HEAP32[($3_1 + 16 | 0) >> 2] | 0)) {
      break label$15
     }
     HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
     break label$1;
    }
   }
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $104(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0, (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 36 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
   label$16 : {
    if (!(HEAP32[($3_1 + 12 | 0) >> 2] | 0)) {
     break label$16
    }
    HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
    break label$1;
   }
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $104(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0, (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 64 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
   label$17 : {
    if (!(HEAP32[($3_1 + 8 | 0) >> 2] | 0)) {
     break label$17
    }
    HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
    break label$1;
   }
   label$18 : {
    label$19 : {
     if ((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 40 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0 | 0) & 1 | 0) {
      break label$19
     }
     if (!((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 68 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0 | 0) & 1 | 0)) {
      break label$18
     }
    }
    label$20 : {
     if (HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) {
      break label$20
     }
     fimport$3(66460 | 0, 67305 | 0, 4416 | 0, 66775 | 0);
     wasm2js_trap();
    }
    label$21 : {
     if ((HEAP32[($3_1 + 28 | 0) >> 2] | 0 | 0) == (23 | 0) & 1 | 0) {
      break label$21
     }
     if ((HEAP32[($3_1 + 20 | 0) >> 2] | 0 | 0) == (23 | 0) & 1 | 0) {
      break label$21
     }
     fimport$3(68575 | 0, 67305 | 0, 4419 | 0, 66775 | 0);
     wasm2js_trap();
    }
    HEAP32[($3_1 + 44 | 0) >> 2] = 23;
    break label$1;
   }
   label$22 : {
    label$23 : {
     if (HEAP32[($3_1 + 28 | 0) >> 2] | 0) {
      break label$23
     }
     if (!(HEAP32[($3_1 + 20 | 0) >> 2] | 0)) {
      break label$22
     }
    }
    fimport$3(68686 | 0, 67305 | 0, 4423 | 0, 66775 | 0);
    wasm2js_trap();
   }
   HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 48 | 0) >> 2] = HEAP32[($3_1 + 36 | 0) >> 2] | 0;
   label$24 : {
    if (!((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 112 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
     break label$24
    }
    (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $105(HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 48 | 0) >> 2] | 0 | 0, (HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 64 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 4 | 0) >> 2] = wasm2js_i32$1;
    label$25 : {
     if (!(HEAP32[($3_1 + 4 | 0) >> 2] | 0)) {
      break label$25
     }
     HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
     break label$1;
    }
   }
   HEAP32[($3_1 + 44 | 0) >> 2] = 0;
  }
  $204 = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
  global$0 = $3_1 + 48 | 0;
  return $204 | 0;
 }
 
 function $102($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $64_1 = 0, $72_1 = 0, $147 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 48 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 40 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 36 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0;
  $106(HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0);
  label$1 : {
   label$2 : {
    label$3 : {
     if (!((HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 92 | 0) >> 2] | 0 | 0) == (2 | 0) & 1 | 0)) {
      break label$3
     }
     (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $107(HEAP32[(HEAP32[($3_1 + 40 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0, (HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, (HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 96 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 32 | 0) >> 2] = wasm2js_i32$1;
     label$4 : {
      if (!(HEAP32[($3_1 + 32 | 0) >> 2] | 0)) {
       break label$4
      }
      HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 32 | 0) >> 2] | 0;
      break label$1;
     }
     HEAP32[((HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0;
     label$5 : {
      if (!((HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 > 1 >>> 0 & 1 | 0)) {
       break label$5
      }
      (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $107(HEAP32[(HEAP32[($3_1 + 40 | 0) >> 2] | 0) >> 2] | 0 | 0, (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + 28 | 0 | 0, (HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, (HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 100 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 28 | 0) >> 2] = wasm2js_i32$1;
      label$6 : {
       if (!(HEAP32[($3_1 + 28 | 0) >> 2] | 0)) {
        break label$6
       }
       HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 28 | 0) >> 2] | 0;
       break label$1;
      }
      HEAP32[((HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + 36 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0;
     }
     break label$2;
    }
    $64_1 = 1;
    label$7 : {
     if ((HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
      break label$7
     }
     $72_1 = 0;
     label$8 : {
      if (!((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
       break label$8
      }
      $72_1 = ($108(HEAP32[($3_1 + 36 | 0) >> 2] | 0 | 0) | 0 | 0) != (0 | 0);
     }
     $64_1 = $72_1;
    }
    HEAP32[($3_1 + 24 | 0) >> 2] = $64_1 & 1 | 0;
    label$9 : {
     label$10 : {
      if (!(HEAP32[($3_1 + 24 | 0) >> 2] | 0)) {
       break label$10
      }
      (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $107(HEAP32[(HEAP32[($3_1 + 40 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0, (HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, (HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 96 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 20 | 0) >> 2] = wasm2js_i32$1;
      label$11 : {
       if (!(HEAP32[($3_1 + 20 | 0) >> 2] | 0)) {
        break label$11
       }
       HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
       break label$1;
      }
      HEAP32[($3_1 + 16 | 0) >> 2] = 0;
      label$12 : {
       label$13 : while (1) {
        if (!((HEAP32[($3_1 + 16 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
         break label$12
        }
        HEAP32[(((HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 16 | 0) >> 2] | 0, 28) | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 36 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0;
        HEAP32[($3_1 + 16 | 0) >> 2] = (HEAP32[($3_1 + 16 | 0) >> 2] | 0) + 1 | 0;
        continue label$13;
       };
      }
      break label$9;
     }
     HEAP32[($3_1 + 12 | 0) >> 2] = 0;
     label$14 : {
      label$15 : while (1) {
       if (!((HEAP32[($3_1 + 12 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
        break label$14
       }
       HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[((HEAP32[((HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 12 | 0) >> 2] | 0, 28) | 0;
       (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $107(HEAP32[(HEAP32[($3_1 + 40 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 8 | 0) >> 2] | 0 | 0, (HEAP32[($3_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 8 | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 4 | 0) >> 2] = wasm2js_i32$1;
       label$16 : {
        if (!(HEAP32[($3_1 + 4 | 0) >> 2] | 0)) {
         break label$16
        }
        HEAP32[($3_1 + 44 | 0) >> 2] = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
        break label$1;
       }
       HEAP32[($3_1 + 12 | 0) >> 2] = (HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 1 | 0;
       continue label$15;
      };
     }
    }
   }
   HEAP32[($3_1 + 44 | 0) >> 2] = 0;
  }
  $147 = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
  global$0 = $3_1 + 48 | 0;
  return $147 | 0;
 }
 
 function $103($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $49_1 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 32 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    label$3 : while (1) {
     if (!((HEAP32[($5_1 + 12 | 0) >> 2] | 0) >>> 0 < (HEAP32[(HEAP32[($5_1 + 16 | 0) >> 2] | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$2
     }
     HEAP32[($5_1 + 8 | 0) >> 2] = (HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul((HEAP32[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) + (HEAP32[($5_1 + 12 | 0) >> 2] | 0) | 0, 28) | 0;
     label$4 : {
      if (!((HEAP32[($5_1 + 20 | 0) >> 2] | 0) >>> 0 >= (HEAP32[((HEAP32[(HEAP32[($5_1 + 8 | 0) >> 2] | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
       break label$4
      }
      HEAP32[($5_1 + 28 | 0) >> 2] = 16;
      break label$1;
     }
     HEAP32[($5_1 + 4 | 0) >> 2] = (HEAP32[(HEAP32[(HEAP32[($5_1 + 8 | 0) >> 2] | 0) >> 2] | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 20 | 0) >> 2] | 0, 48) | 0;
     (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $97(HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0, 0 | 0) | 0), HEAP32[wasm2js_i32$0 >> 2] = wasm2js_i32$1;
     label$5 : {
      if (!(HEAP32[$5_1 >> 2] | 0)) {
       break label$5
      }
      HEAP32[($5_1 + 28 | 0) >> 2] = HEAP32[$5_1 >> 2] | 0;
      break label$1;
     }
     HEAP32[($5_1 + 12 | 0) >> 2] = (HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 1 | 0;
     continue label$3;
    };
   }
   HEAP32[($5_1 + 28 | 0) >> 2] = 0;
  }
  $49_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
  global$0 = $5_1 + 32 | 0;
  return $49_1 | 0;
 }
 
 function $104($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $133 = 0, $253 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $5_1 = global$0 - 48 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 40 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 36 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 32 | 0) >> 2] = $2_1;
  HEAP32[($5_1 + 28 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
  HEAP32[($5_1 + 24 | 0) >> 2] = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    label$3 : while (1) {
     if (!((HEAP32[($5_1 + 24 | 0) >> 2] | 0) >>> 0 < (HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$2
     }
     HEAP32[($5_1 + 20 | 0) >> 2] = (HEAP32[((HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) + (HEAP32[($5_1 + 24 | 0) >> 2] | 0) | 0, 28) | 0;
     HEAP32[($5_1 + 16 | 0) >> 2] = (HEAP32[(HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 36 | 0) >> 2] | 0, 48) | 0;
     label$4 : {
      if (!((HEAP32[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
       break label$4
      }
      label$5 : {
       if (HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) {
        break label$5
       }
       fimport$3(66460 | 0, 67305 | 0, 4276 | 0, 66101 | 0);
       wasm2js_trap();
      }
      HEAP32[($5_1 + 44 | 0) >> 2] = 0;
      break label$1;
     }
     HEAP32[($5_1 + 12 | 0) >> 2] = 0;
     label$6 : {
      if (FUNCTION_TABLE[HEAP32[((HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0](HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0, HEAP32[($5_1 + 40 | 0) >> 2] | 0, HEAP32[($5_1 + 16 | 0) >> 2] | 0, (HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0, $5_1 + 12 | 0, HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) | 0) {
       break label$6
      }
      $50((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, 67176 | 0, 0 | 0);
      (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $109(HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 44 | 0) >> 2] = wasm2js_i32$1;
      break label$1;
     }
     label$7 : {
      if (!((HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
       break label$7
      }
      if (!(HEAP32[($5_1 + 12 | 0) >> 2] | 0)) {
       break label$7
      }
      (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $110(HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 8 | 0) >> 2] = wasm2js_i32$1;
      label$8 : {
       if (!(HEAP32[($5_1 + 8 | 0) >> 2] | 0)) {
        break label$8
       }
       $50((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, 67117 | 0, 0 | 0);
       HEAP32[($5_1 + 44 | 0) >> 2] = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
       break label$1;
      }
     }
     label$9 : {
      label$10 : {
       if ((HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0) != (HEAP32[(HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) & 1 | 0) {
        break label$10
       }
       if (!((HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$9
       }
      }
      label$11 : {
       if ($88(HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 32 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0) | 0) {
        break label$11
       }
       $50((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, 67152 | 0, 0 | 0);
       (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $109(HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 44 | 0) >> 2] = wasm2js_i32$1;
       break label$1;
      }
     }
     $133 = HEAP32[($5_1 + 32 | 0) >> 2] | 0;
     HEAP32[($133 + 4 | 0) >> 2] = (HEAP32[($133 + 4 | 0) >> 2] | 0) + 1 | 0;
     label$12 : {
      label$13 : {
       if (!((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 > 0 >>> 0 & 1 | 0)) {
        break label$13
       }
       if (!((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) >>> 0 > 0 >>> 0 & 1 | 0)) {
        break label$13
       }
       label$14 : {
        if (HEAP32[($5_1 + 24 | 0) >> 2] | 0) {
         break label$14
        }
        (wasm2js_i32$0 = $5_1, wasm2js_i32$1 = $111(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 32 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 4 | 0) >> 2] = wasm2js_i32$1;
        label$15 : {
         if (!(HEAP32[($5_1 + 4 | 0) >> 2] | 0)) {
          break label$15
         }
         HEAP32[($5_1 + 44 | 0) >> 2] = HEAP32[($5_1 + 4 | 0) >> 2] | 0;
         break label$1;
        }
       }
       label$16 : {
        if ($112(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 32 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0) | 0) {
         break label$16
        }
        HEAP32[($5_1 + 44 | 0) >> 2] = 18;
        break label$1;
       }
       break label$12;
      }
      label$17 : {
       if ((HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0) {
        break label$17
       }
       fimport$3(68338 | 0, 67305 | 0, 4343 | 0, 66101 | 0);
       wasm2js_trap();
      }
      label$18 : {
       if (!(HEAP32[($5_1 + 24 | 0) >> 2] | 0)) {
        break label$18
       }
       fimport$3(68359 | 0, 67305 | 0, 4344 | 0, 66101 | 0);
       wasm2js_trap();
      }
      HEAP32[$5_1 >> 2] = HEAP32[((HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
      label$19 : {
       label$20 : {
        if ((HEAP32[(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) >> 2] | 0 | 0) != (HEAP32[(HEAP32[$5_1 >> 2] | 0) >> 2] | 0 | 0) & 1 | 0) {
         break label$20
        }
        if ((HEAP32[((HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[$5_1 >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) & 1 | 0) {
         break label$20
        }
        if (!((HEAP32[((HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[$5_1 >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) & 1 | 0)) {
         break label$19
        }
       }
       label$21 : {
        if (!((HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
         break label$21
        }
        $50((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 144 | 0 | 0, 66521 | 0, 0 | 0);
        HEAP32[($5_1 + 44 | 0) >> 2] = 12;
        break label$1;
       }
       $71(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0, 255 | 0);
       HEAP32[(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) >> 2] = HEAP32[(HEAP32[$5_1 >> 2] | 0) >> 2] | 0;
       HEAP32[((HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[$5_1 >> 2] | 0) + 4 | 0) >> 2] | 0;
       HEAP32[((HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[$5_1 >> 2] | 0) + 8 | 0) >> 2] | 0;
      }
      $75(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 44 | 0) >> 2] | 0 | 0, HEAP32[$5_1 >> 2] | 0 | 0, ((HEAP32[((HEAP32[(HEAP32[($5_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0 ? 2 : 1) | 0);
     }
     HEAP32[($5_1 + 24 | 0) >> 2] = (HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 1 | 0;
     continue label$3;
    };
   }
   HEAP32[($5_1 + 44 | 0) >> 2] = 0;
  }
  $253 = HEAP32[($5_1 + 44 | 0) >> 2] | 0;
  global$0 = $5_1 + 48 | 0;
  return $253 | 0;
 }
 
 function $105($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$1 = 0, $5_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$3 = 0, i64toi32_i32$5 = 0, $32_1 = 0, $35_1 = 0, $79_1 = 0, $36_1 = 0, $39_1 = 0, $42_1 = 0, $45_1 = 0, $97$hi = 0, $64_1 = 0, i64toi32_i32$4 = 0, $101$hi = 0, $102$hi = 0, $80_1 = 0, $187 = 0, $197 = 0, $207 = 0, $217 = 0, $227 = 0, $237 = 0, $97_1 = 0, $274$hi = 0, $100_1 = 0, $107_1 = 0.0, $110_1 = 0.0, $87_1 = 0;
  $5_1 = global$0 - 32 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 16 | 0) >> 2] = $2_1;
  label$1 : {
   label$2 : {
    if ((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$2
    }
    HEAP32[($5_1 + 28 | 0) >> 2] = 3;
    break label$1;
   }
   label$3 : {
    label$4 : {
     if ((HEAP32[($5_1 + 20 | 0) >> 2] | 0) >>> 0 > 2147483647 >>> 0 & 1 | 0) {
      break label$4
     }
     if (!((HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) >= (HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0 | 0) & 1 | 0)) {
      break label$3
     }
    }
    HEAP32[($5_1 + 28 | 0) >> 2] = 16;
    break label$1;
   }
   label$5 : {
    if ((HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 112 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$5
    }
    $32_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
    $35_1 = (HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 64 | 0;
    i64toi32_i32$2 = $35_1;
    i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $187 = i64toi32_i32$0;
    i64toi32_i32$0 = $32_1;
    HEAP32[i64toi32_i32$0 >> 2] = $187;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    $36_1 = 32;
    i64toi32_i32$2 = i64toi32_i32$2 + $36_1 | 0;
    i64toi32_i32$1 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $197 = i64toi32_i32$1;
    i64toi32_i32$1 = $32_1 + $36_1 | 0;
    HEAP32[i64toi32_i32$1 >> 2] = $197;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    $39_1 = 24;
    i64toi32_i32$2 = $35_1 + $39_1 | 0;
    i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $207 = i64toi32_i32$0;
    i64toi32_i32$0 = $32_1 + $39_1 | 0;
    HEAP32[i64toi32_i32$0 >> 2] = $207;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    $42_1 = 16;
    i64toi32_i32$2 = $35_1 + $42_1 | 0;
    i64toi32_i32$1 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $217 = i64toi32_i32$1;
    i64toi32_i32$1 = $32_1 + $42_1 | 0;
    HEAP32[i64toi32_i32$1 >> 2] = $217;
    HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
    $45_1 = 8;
    i64toi32_i32$2 = $35_1 + $45_1 | 0;
    i64toi32_i32$0 = HEAP32[i64toi32_i32$2 >> 2] | 0;
    i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 4 | 0) >> 2] | 0;
    $227 = i64toi32_i32$0;
    i64toi32_i32$0 = $32_1 + $45_1 | 0;
    HEAP32[i64toi32_i32$0 >> 2] = $227;
    HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
    HEAP32[($5_1 + 28 | 0) >> 2] = 0;
    break label$1;
   }
   i64toi32_i32$2 = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
   i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 104 | 0) >> 2] | 0;
   i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 108 | 0) >> 2] | 0;
   $237 = i64toi32_i32$1;
   i64toi32_i32$1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
   HEAP32[i64toi32_i32$1 >> 2] = $237;
   HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
   i64toi32_i32$0 = 0;
   i64toi32_i32$1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
   HEAP32[(i64toi32_i32$1 + 16 | 0) >> 2] = 0;
   HEAP32[(i64toi32_i32$1 + 20 | 0) >> 2] = i64toi32_i32$0;
   HEAP32[($5_1 + 12 | 0) >> 2] = 0;
   label$6 : {
    label$7 : while (1) {
     if (!((HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0) < (HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) & 1 | 0)) {
      break label$6
     }
     i64toi32_i32$0 = 0;
     $97_1 = $113(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 112 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0) | 0;
     $97$hi = i64toi32_i32$0;
     $64_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
     i64toi32_i32$2 = $64_1;
     i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 16 | 0) >> 2] | 0;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 20 | 0) >> 2] | 0;
     $274$hi = i64toi32_i32$1;
     i64toi32_i32$1 = $97$hi;
     i64toi32_i32$1 = $274$hi;
     i64toi32_i32$2 = i64toi32_i32$0;
     i64toi32_i32$0 = $97$hi;
     i64toi32_i32$3 = $97_1;
     i64toi32_i32$4 = i64toi32_i32$2 + i64toi32_i32$3 | 0;
     i64toi32_i32$5 = i64toi32_i32$1 + i64toi32_i32$0 | 0;
     if (i64toi32_i32$4 >>> 0 < i64toi32_i32$3 >>> 0) {
      i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
     }
     i64toi32_i32$2 = $64_1;
     HEAP32[(i64toi32_i32$2 + 16 | 0) >> 2] = i64toi32_i32$4;
     HEAP32[(i64toi32_i32$2 + 20 | 0) >> 2] = i64toi32_i32$5;
     HEAP32[($5_1 + 12 | 0) >> 2] = (HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 1 | 0;
     continue label$7;
    };
   }
   i64toi32_i32$5 = 0;
   $100_1 = $113(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 404 | 0) >> 2] | 0) + 112 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 20 | 0) >> 2] | 0 | 0) | 0;
   i64toi32_i32$2 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
   HEAP32[(i64toi32_i32$2 + 32 | 0) >> 2] = $100_1;
   HEAP32[(i64toi32_i32$2 + 36 | 0) >> 2] = i64toi32_i32$5;
   i64toi32_i32$1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
   i64toi32_i32$5 = HEAP32[i64toi32_i32$1 >> 2] | 0;
   i64toi32_i32$2 = HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] | 0;
   $101$hi = i64toi32_i32$2;
   i64toi32_i32$2 = 0;
   $102$hi = i64toi32_i32$2;
   i64toi32_i32$2 = $101$hi;
   i64toi32_i32$2 = $102$hi;
   i64toi32_i32$2 = $101$hi;
   i64toi32_i32$1 = i64toi32_i32$5;
   i64toi32_i32$5 = $102$hi;
   i64toi32_i32$3 = 0;
   label$8 : {
    label$9 : {
     if (!((i64toi32_i32$2 >>> 0 > i64toi32_i32$5 >>> 0 | ((i64toi32_i32$2 | 0) == (i64toi32_i32$5 | 0) & i64toi32_i32$1 >>> 0 > i64toi32_i32$3 >>> 0 | 0) | 0) & 1 | 0)) {
      break label$9
     }
     $79_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
     i64toi32_i32$3 = $79_1;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 16 | 0) >> 2] | 0;
     i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 20 | 0) >> 2] | 0;
     i64toi32_i32$3 = 0;
     $107_1 = +(i64toi32_i32$1 >>> 0) + 4294967296.0 * +(i64toi32_i32$2 >>> 0);
     i64toi32_i32$3 = $79_1;
     i64toi32_i32$2 = HEAP32[i64toi32_i32$3 >> 2] | 0;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 4 | 0) >> 2] | 0;
     i64toi32_i32$3 = 0;
     HEAPF64[($79_1 + 8 | 0) >> 3] = $107_1 / (+(i64toi32_i32$2 >>> 0) + 4294967296.0 * +(i64toi32_i32$1 >>> 0));
     $80_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
     i64toi32_i32$3 = $80_1;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 32 | 0) >> 2] | 0;
     i64toi32_i32$2 = HEAP32[(i64toi32_i32$3 + 36 | 0) >> 2] | 0;
     i64toi32_i32$3 = 0;
     $110_1 = +(i64toi32_i32$1 >>> 0) + 4294967296.0 * +(i64toi32_i32$2 >>> 0);
     i64toi32_i32$3 = $80_1;
     i64toi32_i32$2 = HEAP32[i64toi32_i32$3 >> 2] | 0;
     i64toi32_i32$1 = HEAP32[(i64toi32_i32$3 + 4 | 0) >> 2] | 0;
     i64toi32_i32$3 = 0;
     HEAPF64[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 24 | 0) >> 3] = $110_1 / (+(i64toi32_i32$2 >>> 0) + 4294967296.0 * +(i64toi32_i32$1 >>> 0));
     break label$8;
    }
    HEAPF64[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 8 | 0) >> 3] = +(0 | 0);
    HEAPF64[((HEAP32[($5_1 + 16 | 0) >> 2] | 0) + 24 | 0) >> 3] = +(0 | 0);
   }
   HEAP32[($5_1 + 28 | 0) >> 2] = 0;
  }
  $87_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
  global$0 = $5_1 + 32 | 0;
  return $87_1 | 0;
 }
 
 function $106($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 8 | 0) >> 2] | 0, 28) | 0;
    label$3 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$3
     }
     $71(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, 255 | 0);
    }
    label$4 : {
     if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$4
     }
     label$5 : {
      if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$5
      }
      if (!((HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0) & 1 | 0)) {
       break label$5
      }
      $77(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0);
     }
     HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 8 | 0) >> 2] = 0;
    }
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 40 | 0) >> 2] = 0;
  HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 68 | 0) >> 2] = 0;
  label$6 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$6
   }
   $77(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 96 | 0) >> 2] = 0;
  }
  label$7 : {
   if (!((HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
    break label$7
   }
   $77(HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] | 0 | 0);
   HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 100 | 0) >> 2] = 0;
  }
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $107($0_1, $1_1, $2_1, $3_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  var $6_1 = 0, $18_1 = 0, $40_1 = 0;
  $6_1 = global$0 - 32 | 0;
  global$0 = $6_1;
  HEAP32[($6_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($6_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($6_1 + 16 | 0) >> 2] = $2_1;
  HEAP32[($6_1 + 12 | 0) >> 2] = $3_1;
  label$1 : {
   label$2 : {
    if ((HEAP32[((HEAP32[($6_1 + 20 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) == ($86(HEAP32[($6_1 + 24 | 0) >> 2] | 0 | 0, 1 | 0) | 0 | 0) & 1 | 0) {
     break label$2
    }
    HEAP32[($6_1 + 28 | 0) >> 2] = 15;
    break label$1;
   }
   $18_1 = $87(HEAP32[($6_1 + 24 | 0) >> 2] | 0 | 0, 1 | 0) | 0;
   HEAP32[(HEAP32[($6_1 + 12 | 0) >> 2] | 0) >> 2] = $18_1;
   label$3 : {
    if ((HEAP32[(HEAP32[($6_1 + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$3
    }
    HEAP32[($6_1 + 28 | 0) >> 2] = 26;
    break label$1;
   }
   HEAP32[((HEAP32[(HEAP32[($6_1 + 12 | 0) >> 2] | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
   HEAP8[((HEAP32[(HEAP32[($6_1 + 12 | 0) >> 2] | 0) >> 2] | 0) + 12 | 0) >> 0] = HEAPU8[((HEAP32[($6_1 + 20 | 0) >> 2] | 0) + 24 | 0) >> 0] | 0;
   HEAP32[((HEAP32[(HEAP32[($6_1 + 12 | 0) >> 2] | 0) >> 2] | 0) + 16 | 0) >> 2] = HEAP32[((HEAP32[(HEAP32[($6_1 + 20 | 0) >> 2] | 0) >> 2] | 0) + 16 | 0) >> 2] | 0;
   HEAP32[($6_1 + 28 | 0) >> 2] = 0;
  }
  $40_1 = HEAP32[($6_1 + 28 | 0) >> 2] | 0;
  global$0 = $6_1 + 32 | 0;
  return $40_1 | 0;
 }
 
 function $108($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 32 | 0;
  HEAP32[($3_1 + 24 | 0) >> 2] = $0_1;
  label$1 : {
   label$2 : {
    if (!((HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 36 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
     break label$2
    }
    if (!((HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
     break label$2
    }
    HEAP32[($3_1 + 28 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP8[($3_1 + 23 | 0) >> 0] = HEAPU8[((HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + 24 | 0) >> 0] | 0;
   HEAP32[($3_1 + 16 | 0) >> 2] = HEAP32[((HEAP32[(HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) >> 2] | 0) + 16 | 0) >> 2] | 0;
   HEAP32[($3_1 + 12 | 0) >> 2] = 1;
   label$3 : {
    label$4 : while (1) {
     if (!((HEAP32[($3_1 + 12 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 28 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$3
     }
     HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 12 | 0) >> 2] | 0, 28) | 0;
     label$5 : {
      label$6 : {
       if (((HEAPU8[((HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 24 | 0) >> 0] | 0) & 255 | 0 | 0) != ((HEAPU8[($3_1 + 23 | 0) >> 0] | 0) & 255 | 0 | 0) & 1 | 0) {
        break label$6
       }
       if (!((HEAP32[((HEAP32[(HEAP32[($3_1 + 8 | 0) >> 2] | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0) != (HEAP32[($3_1 + 16 | 0) >> 2] | 0 | 0) & 1 | 0)) {
        break label$5
       }
      }
      HEAP32[($3_1 + 28 | 0) >> 2] = 0;
      break label$1;
     }
     HEAP32[($3_1 + 12 | 0) >> 2] = (HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 1 | 0;
     continue label$4;
    };
   }
   HEAP32[($3_1 + 28 | 0) >> 2] = 1;
  }
  return HEAP32[($3_1 + 28 | 0) >> 2] | 0 | 0;
 }
 
 function $109($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  return ((HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0 ? 12 : 11) | 0;
 }
 
 function $110($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $123 = 0, wasm2js_i32$0 = 0, wasm2js_i32$1 = 0;
  $3_1 = global$0 - 80 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 72 | 0) >> 2] = $0_1;
  label$1 : {
   label$2 : {
    if (!(HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 60 | 0) >> 2] | 0)) {
     break label$2
    }
    HEAP32[($3_1 + 76 | 0) >> 2] = 25;
    break label$1;
   }
   HEAP32[($3_1 + 68 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0;
   HEAP32[($3_1 + 64 | 0) >> 2] = HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0;
   HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 52 | 0) >> 2] = 0;
   HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 56 | 0) >> 2] = 0;
   (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $72(HEAP32[($3_1 + 72 | 0) >> 2] | 0 | 0, 2 | 0) | 0), HEAP32[(wasm2js_i32$0 + 60 | 0) >> 2] = wasm2js_i32$1;
   label$3 : {
    if (!(HEAP32[($3_1 + 60 | 0) >> 2] | 0)) {
     break label$3
    }
    HEAP32[($3_1 + 76 | 0) >> 2] = HEAP32[($3_1 + 60 | 0) >> 2] | 0;
    break label$1;
   }
   label$4 : {
    label$5 : {
     if (!((HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 > 8 >>> 0 & 1 | 0)) {
      break label$5
     }
     HEAP32[($3_1 + 56 | 0) >> 2] = 0;
     label$6 : {
      label$7 : while (1) {
       if (!((HEAP32[($3_1 + 56 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
        break label$6
       }
       HEAP32[($3_1 + 52 | 0) >> 2] = (HEAP32[($3_1 + 68 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 56 | 0) >> 2] | 0, HEAP32[($3_1 + 64 | 0) >> 2] | 0) | 0;
       HEAP32[($3_1 + 48 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 56 | 0) >> 2] | 0, HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0) | 0;
       HEAP32[($3_1 + 44 | 0) >> 2] = 0;
       label$8 : {
        label$9 : while (1) {
         if (!((HEAP32[($3_1 + 44 | 0) >> 2] | 0) >>> 0 < (HEAP32[(HEAP32[($3_1 + 72 | 0) >> 2] | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
          break label$8
         }
         HEAP32[($3_1 + 40 | 0) >> 2] = (HEAPU16[((HEAP32[($3_1 + 52 | 0) >> 2] | 0) + ((HEAP32[($3_1 + 44 | 0) >> 2] | 0) << 1 | 0) | 0) >> 1] | 0) & 65535 | 0;
         (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $89(HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 40 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 36 | 0) >> 2] = wasm2js_i32$1;
         HEAP16[((HEAP32[($3_1 + 48 | 0) >> 2] | 0) + ((HEAP32[($3_1 + 44 | 0) >> 2] | 0) << 1 | 0) | 0) >> 1] = HEAP32[($3_1 + 36 | 0) >> 2] | 0;
         HEAP32[($3_1 + 44 | 0) >> 2] = (HEAP32[($3_1 + 44 | 0) >> 2] | 0) + 1 | 0;
         continue label$9;
        };
       }
       HEAP32[($3_1 + 56 | 0) >> 2] = (HEAP32[($3_1 + 56 | 0) >> 2] | 0) + 1 | 0;
       continue label$7;
      };
     }
     break label$4;
    }
    HEAP32[($3_1 + 32 | 0) >> 2] = 0;
    label$10 : {
     label$11 : while (1) {
      if (!((HEAP32[($3_1 + 32 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
       break label$10
      }
      HEAP32[($3_1 + 28 | 0) >> 2] = (HEAP32[($3_1 + 68 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 32 | 0) >> 2] | 0, HEAP32[($3_1 + 64 | 0) >> 2] | 0) | 0;
      HEAP32[($3_1 + 24 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 52 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 32 | 0) >> 2] | 0, HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 56 | 0) >> 2] | 0) | 0;
      HEAP32[($3_1 + 20 | 0) >> 2] = 0;
      label$12 : {
       label$13 : while (1) {
        if (!((HEAP32[($3_1 + 20 | 0) >> 2] | 0) >>> 0 < (HEAP32[(HEAP32[($3_1 + 72 | 0) >> 2] | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
         break label$12
        }
        HEAP32[($3_1 + 16 | 0) >> 2] = (HEAPU8[((HEAP32[($3_1 + 28 | 0) >> 2] | 0) + (HEAP32[($3_1 + 20 | 0) >> 2] | 0) | 0) >> 0] | 0) & 255 | 0;
        (wasm2js_i32$0 = $3_1, wasm2js_i32$1 = $89(HEAP32[((HEAP32[($3_1 + 72 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0, HEAP32[($3_1 + 16 | 0) >> 2] | 0 | 0) | 0), HEAP32[(wasm2js_i32$0 + 12 | 0) >> 2] = wasm2js_i32$1;
        HEAP8[((HEAP32[($3_1 + 24 | 0) >> 2] | 0) + (HEAP32[($3_1 + 20 | 0) >> 2] | 0) | 0) >> 0] = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
        HEAP32[($3_1 + 20 | 0) >> 2] = (HEAP32[($3_1 + 20 | 0) >> 2] | 0) + 1 | 0;
        continue label$13;
       };
      }
      HEAP32[($3_1 + 32 | 0) >> 2] = (HEAP32[($3_1 + 32 | 0) >> 2] | 0) + 1 | 0;
      continue label$11;
     };
    }
   }
   HEAP32[($3_1 + 76 | 0) >> 2] = 0;
  }
  $123 = HEAP32[($3_1 + 76 | 0) >> 2] | 0;
  global$0 = $3_1 + 80 | 0;
  return $123 | 0;
 }
 
 function $111($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, $114_1 = 0, $134 = 0, $200 = 0;
  $5_1 = global$0 - 48 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 40 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 36 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 32 | 0) >> 2] = $2_1;
  HEAP32[($5_1 + 28 | 0) >> 2] = (HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 12 | 0;
  HEAP32[($5_1 + 24 | 0) >> 2] = (HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[((HEAP32[($5_1 + 36 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0, 28) | 0;
  label$1 : {
   label$2 : {
    label$3 : {
     if (Math_imul(HEAP32[(HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0, HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0) {
      break label$3
     }
     if (!(Math_imul(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, HEAP32[(HEAP32[($5_1 + 28 | 0) >> 2] | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$2
     }
    }
    $50(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0, 68775 | 0, 0 | 0);
    HEAP32[($5_1 + 44 | 0) >> 2] = 18;
    break label$1;
   }
   label$4 : {
    label$5 : {
     if (Math_imul(HEAP32[(HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0, (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) - 1 | 0) >>> 0 >= (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0) {
      break label$5
     }
     if (!(Math_imul(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, (HEAP32[(HEAP32[($5_1 + 28 | 0) >> 2] | 0) >> 2] | 0) - 1 | 0) >>> 0 >= (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$4
     }
    }
    $50(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0, 68163 | 0, 0 | 0);
    HEAP32[($5_1 + 44 | 0) >> 2] = 18;
    break label$1;
   }
   HEAP32[($5_1 + 20 | 0) >> 2] = (HEAP32[((HEAP32[(HEAP32[($5_1 + 24 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0;
   label$6 : {
    if (!(HEAP32[($5_1 + 20 | 0) >> 2] | 0)) {
     break label$6
    }
    label$7 : {
     if (!(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0)) {
      break label$7
     }
     fimport$3(67661 | 0, 67305 | 0, 1460 | 0, 66004 | 0);
     wasm2js_trap();
    }
   }
   label$8 : {
    if ($84(HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, HEAP32[(HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0, HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0) | 0) {
     break label$8
    }
    HEAP32[($5_1 + 44 | 0) >> 2] = 18;
    break label$1;
   }
   $114_1 = 1;
   label$9 : {
    if ((HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) & 1 | 0) {
     break label$9
    }
    $114_1 = 1;
    if ((HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) & 1 | 0) {
     break label$9
    }
    $114_1 = (HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0);
   }
   HEAP32[($5_1 + 16 | 0) >> 2] = $114_1 & 1 | 0;
   $134 = 0;
   label$10 : {
    if (HEAP32[($5_1 + 20 | 0) >> 2] | 0) {
     break label$10
    }
    $134 = (HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0);
   }
   HEAP32[($5_1 + 12 | 0) >> 2] = $134 & 1 | 0;
   label$11 : {
    label$12 : {
     if (HEAP32[($5_1 + 16 | 0) >> 2] | 0) {
      break label$12
     }
     if (!(HEAP32[($5_1 + 12 | 0) >> 2] | 0)) {
      break label$11
     }
    }
    label$13 : {
     if (!(HEAP32[($5_1 + 20 | 0) >> 2] | 0)) {
      break label$13
     }
     $50(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0, 65800 | 0, 0 | 0);
     HEAP32[($5_1 + 44 | 0) >> 2] = 18;
     break label$1;
    }
    label$14 : {
     if (!(HEAP32[($5_1 + 16 | 0) >> 2] | 0)) {
      break label$14
     }
     $71(HEAP32[($5_1 + 32 | 0) >> 2] | 0 | 0, 255 | 0);
     HEAP32[(HEAP32[($5_1 + 32 | 0) >> 2] | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 4 | 0) >> 2] = HEAP32[((HEAP32[($5_1 + 28 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
     HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 8 | 0) >> 2] = HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0;
    }
    label$15 : {
     if (!(HEAP32[($5_1 + 12 | 0) >> 2] | 0)) {
      break label$15
     }
     $71(HEAP32[($5_1 + 32 | 0) >> 2] | 0 | 0, 1 | 0);
     HEAP32[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 12 | 0) >> 2] = HEAP32[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0;
    }
    label$16 : {
     if (HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 116 | 0) >> 2] | 0) {
      break label$16
     }
     HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 116 | 0) >> 2] = 1;
     HEAP16[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 76 | 0) >> 1] = HEAPU16[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 76 | 0) >> 1] | 0;
     HEAP16[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 78 | 0) >> 1] = HEAPU16[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 78 | 0) >> 1] | 0;
     HEAP16[((HEAP32[($5_1 + 32 | 0) >> 2] | 0) + 80 | 0) >> 1] = HEAPU16[((HEAP32[((HEAP32[($5_1 + 24 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 80 | 0) >> 1] | 0;
    }
   }
   label$17 : {
    if (!($72(HEAP32[($5_1 + 32 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 20 | 0) >> 2] | 0 ? 2 : 1) | 0) | 0)) {
     break label$17
    }
    $50(HEAP32[((HEAP32[($5_1 + 40 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0, 66731 | 0, 0 | 0);
    HEAP32[($5_1 + 44 | 0) >> 2] = 26;
    break label$1;
   }
   HEAP32[($5_1 + 44 | 0) >> 2] = 0;
  }
  $200 = HEAP32[($5_1 + 44 | 0) >> 2] | 0;
  global$0 = $5_1 + 48 | 0;
  return $200 | 0;
 }
 
 function $112($0_1, $1_1, $2_1, $3_1, $4_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  var $7_1 = 0, $208 = 0;
  $7_1 = global$0 - 384 | 0;
  global$0 = $7_1;
  HEAP32[($7_1 + 376 | 0) >> 2] = $0_1;
  HEAP32[($7_1 + 372 | 0) >> 2] = $1_1;
  HEAP32[($7_1 + 368 | 0) >> 2] = $2_1;
  HEAP32[($7_1 + 364 | 0) >> 2] = $3_1;
  HEAP32[($7_1 + 360 | 0) >> 2] = $4_1;
  HEAP32[($7_1 + 356 | 0) >> 2] = (HEAP32[($7_1 + 372 | 0) >> 2] | 0) + 12 | 0;
  HEAP32[($7_1 + 352 | 0) >> 2] = (HEAP32[((HEAP32[($7_1 + 376 | 0) >> 2] | 0) + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[((HEAP32[($7_1 + 372 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0, 28) | 0;
  label$1 : {
   label$2 : {
    if (!((HEAP32[($7_1 + 364 | 0) >> 2] | 0 | 0) != (HEAP32[($7_1 + 352 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$2
    }
    label$3 : {
     label$4 : {
      if ((HEAP32[(HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) != (HEAP32[(HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0 | 0) & 1 | 0) {
       break label$4
      }
      if ((HEAP32[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0 | 0) & 1 | 0) {
       break label$4
      }
      if ((HEAP32[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0 | 0) & 1 | 0) {
       break label$4
      }
      if ((HEAP32[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0) & 1 | 0) {
       break label$4
      }
      if ((HEAP32[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0) != (HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0 | 0) & 1 | 0) {
       break label$4
      }
      if (((HEAPU16[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 76 | 0) >> 1] | 0) & 65535 | 0 | 0) != ((HEAPU16[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 76 | 0) >> 1] | 0) & 65535 | 0 | 0) & 1 | 0) {
       break label$4
      }
      if (((HEAPU16[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 78 | 0) >> 1] | 0) & 65535 | 0 | 0) != ((HEAPU16[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 78 | 0) >> 1] | 0) & 65535 | 0 | 0) & 1 | 0) {
       break label$4
      }
      if (!(((HEAPU16[((HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 80 | 0) >> 1] | 0) & 65535 | 0 | 0) != ((HEAPU16[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 80 | 0) >> 1] | 0) & 65535 | 0 | 0) & 1 | 0)) {
       break label$3
      }
     }
     $50(HEAP32[((HEAP32[($7_1 + 376 | 0) >> 2] | 0) + 108 | 0) >> 2] | 0 | 0, 66064 | 0, 0 | 0);
     HEAP32[($7_1 + 380 | 0) >> 2] = 0;
     break label$1;
    }
   }
   HEAP32[($7_1 + 348 | 0) >> 2] = ((HEAP32[($7_1 + 360 | 0) >> 2] | 0) >>> 0) / ((HEAP32[((HEAP32[($7_1 + 372 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) >>> 0) | 0;
   HEAP32[($7_1 + 344 | 0) >> 2] = ((HEAP32[($7_1 + 360 | 0) >> 2] | 0) >>> 0) % ((HEAP32[((HEAP32[($7_1 + 372 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) >>> 0) | 0;
   $63($7_1 + 192 | 0 | 0);
   $63($7_1 + 40 | 0 | 0);
   HEAP32[($7_1 + 24 | 0) >> 2] = Math_imul(HEAP32[(HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0, HEAP32[($7_1 + 344 | 0) >> 2] | 0);
   HEAP32[($7_1 + 28 | 0) >> 2] = Math_imul(HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0, HEAP32[($7_1 + 348 | 0) >> 2] | 0);
   HEAP32[($7_1 + 32 | 0) >> 2] = HEAP32[(HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >> 2] | 0;
   HEAP32[($7_1 + 36 | 0) >> 2] = HEAP32[((HEAP32[((HEAP32[($7_1 + 352 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
   label$5 : {
    if (!(((HEAP32[($7_1 + 24 | 0) >> 2] | 0) + (HEAP32[($7_1 + 32 | 0) >> 2] | 0) | 0) >>> 0 > (HEAP32[((HEAP32[($7_1 + 356 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$5
    }
    HEAP32[($7_1 + 32 | 0) >> 2] = (HEAP32[((HEAP32[($7_1 + 356 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) - (HEAP32[($7_1 + 24 | 0) >> 2] | 0) | 0;
   }
   label$6 : {
    if (!(((HEAP32[($7_1 + 28 | 0) >> 2] | 0) + (HEAP32[($7_1 + 36 | 0) >> 2] | 0) | 0) >>> 0 > (HEAP32[((HEAP32[($7_1 + 356 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$6
    }
    HEAP32[($7_1 + 36 | 0) >> 2] = (HEAP32[((HEAP32[($7_1 + 356 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0) - (HEAP32[($7_1 + 28 | 0) >> 2] | 0) | 0;
   }
   HEAP32[($7_1 + 8 | 0) >> 2] = 0;
   HEAP32[($7_1 + 12 | 0) >> 2] = 0;
   HEAP32[($7_1 + 16 | 0) >> 2] = HEAP32[($7_1 + 32 | 0) >> 2] | 0;
   HEAP32[($7_1 + 20 | 0) >> 2] = HEAP32[($7_1 + 36 | 0) >> 2] | 0;
   label$7 : {
    label$8 : {
     if ($73($7_1 + 40 | 0 | 0, HEAP32[($7_1 + 368 | 0) >> 2] | 0 | 0, $7_1 + 24 | 0 | 0) | 0) {
      break label$8
     }
     if (!($73($7_1 + 192 | 0 | 0, HEAP32[((HEAP32[($7_1 + 364 | 0) >> 2] | 0) + 12 | 0) >> 2] | 0 | 0, $7_1 + 8 | 0 | 0) | 0)) {
      break label$7
     }
    }
    fimport$3(67650 | 0, 67305 | 0, 1545 | 0, 66796 | 0);
    wasm2js_trap();
   }
   $65($7_1 + 40 | 0 | 0, $7_1 + 192 | 0 | 0, ((HEAP32[((HEAP32[(HEAP32[($7_1 + 364 | 0) >> 2] | 0) >> 2] | 0) + 20 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0 ? 2 : 1) | 0);
   HEAP32[($7_1 + 380 | 0) >> 2] = 1;
  }
  $208 = HEAP32[($7_1 + 380 | 0) >> 2] | 0;
  global$0 = $7_1 + 384 | 0;
  return $208 | 0;
 }
 
 function $113($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 32 | 0;
  HEAP32[($4_1 + 24 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 20 | 0) >> 2] = $1_1;
  HEAP32[($4_1 + 16 | 0) >> 2] = 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  label$1 : {
   label$2 : {
    label$3 : while (1) {
     if (!((HEAP32[($4_1 + 12 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 72 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
      break label$2
     }
     HEAP32[($4_1 + 8 | 0) >> 2] = (HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 64 | 0) >> 2] | 0) + ((HEAP32[($4_1 + 12 | 0) >> 2] | 0) << 3 | 0) | 0;
     HEAP32[($4_1 + 16 | 0) >> 2] = (HEAP32[($4_1 + 16 | 0) >> 2] | 0) + (HEAP32[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 2] | 0) | 0;
     label$4 : {
      label$5 : {
       if ((HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) < (HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0) & 1 | 0) {
        break label$5
       }
       if (!((HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0) == ((HEAP32[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 72 | 0) >> 2] | 0) - 1 | 0 | 0) & 1 | 0)) {
        break label$4
       }
      }
      HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0;
      break label$1;
     }
     HEAP32[($4_1 + 12 | 0) >> 2] = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 1 | 0;
     continue label$3;
    };
   }
   HEAP32[($4_1 + 28 | 0) >> 2] = 1;
  }
  return HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0;
 }
 
 function $114($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 8 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = HEAP32[((HEAP32[(HEAP32[($3_1 + 12 | 0) >> 2] | 0) >> 2] | 0) + ((HEAP32[($3_1 + 8 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0;
    $14((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 92 | 0 | 0);
    $14((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 108 | 0 | 0);
    label$3 : {
     if (!(HEAP32[((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 132 | 0) >> 2] | 0)) {
      break label$3
     }
     $17((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 124 | 0 | 0);
    }
    $10(HEAP32[($3_1 + 4 | 0) >> 2] | 0 | 0);
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  $14(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 16 | 0 | 0);
  $17((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 32 | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $115($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0;
  $3_1 = global$0 - 16 | 0;
  global$0 = $3_1;
  HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
  $14(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  HEAP32[($3_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($3_1 + 8 | 0) >> 2] | 0) >>> 0 < (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 24 | 0) >> 2] | 0) >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 16 | 0) >> 2] | 0) + Math_imul(HEAP32[($3_1 + 8 | 0) >> 2] | 0, 20) | 0;
    $14((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + 4 | 0 | 0);
    HEAP32[($3_1 + 8 | 0) >> 2] = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 16 | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 32 | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 48 | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 64 | 0 | 0);
  $14((HEAP32[($3_1 + 12 | 0) >> 2] | 0) + 80 | 0 | 0);
  $10(HEAP32[($3_1 + 12 | 0) >> 2] | 0 | 0);
  global$0 = $3_1 + 16 | 0;
  return;
 }
 
 function $118() {
  return global$0 | 0;
 }
 
 function $119($0_1) {
  $0_1 = $0_1 | 0;
  global$0 = $0_1;
 }
 
 function $120($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = (global$0 - $0_1 | 0) & -16 | 0;
  global$0 = $1_1;
  return $1_1 | 0;
 }
 
 function $121($0_1, $1_1, $2_1, $3_1, $3$hi, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $3$hi = $3$hi | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var i64toi32_i32$0 = 0;
  i64toi32_i32$0 = $3$hi;
  return FUNCTION_TABLE[$0_1 | 0]($1_1, $2_1, $3_1, i64toi32_i32$0, $4_1, $5_1) | 0 | 0;
 }
 
 function $122($0_1, $1_1, $2_1, $3_1, $4_1, $5_1, $6_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  $6_1 = $6_1 | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$4 = 0, i64toi32_i32$3 = 0, $18_1 = 0, $7_1 = 0, $8_1 = 0, $9_1 = 0, $11_1 = 0, $11$hi = 0, $14$hi = 0;
  $7_1 = $0_1;
  $8_1 = $1_1;
  $9_1 = $2_1;
  i64toi32_i32$0 = 0;
  $11_1 = $3_1;
  $11$hi = i64toi32_i32$0;
  i64toi32_i32$0 = 0;
  i64toi32_i32$2 = $4_1;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
   $18_1 = 0;
  } else {
   i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$0 << i64toi32_i32$4 | 0) | 0;
   $18_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
  }
  $14$hi = i64toi32_i32$1;
  i64toi32_i32$1 = $11$hi;
  i64toi32_i32$0 = $11_1;
  i64toi32_i32$2 = $14$hi;
  i64toi32_i32$3 = $18_1;
  i64toi32_i32$2 = i64toi32_i32$1 | i64toi32_i32$2 | 0;
  return $121($7_1 | 0, $8_1 | 0, $9_1 | 0, i64toi32_i32$0 | i64toi32_i32$3 | 0 | 0, i64toi32_i32$2 | 0, $5_1 | 0, $6_1 | 0) | 0 | 0;
 }
 
 function _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$4 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, var$2 = 0, i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, var$3 = 0, var$4 = 0, var$5 = 0, $21_1 = 0, $22_1 = 0, var$6 = 0, $24_1 = 0, $17_1 = 0, $18_1 = 0, $23_1 = 0, $29_1 = 0, $45_1 = 0, $56$hi = 0, $62$hi = 0;
  i64toi32_i32$0 = var$1$hi;
  var$2 = var$1;
  var$4 = var$2 >>> 16 | 0;
  i64toi32_i32$0 = var$0$hi;
  var$3 = var$0;
  var$5 = var$3 >>> 16 | 0;
  $17_1 = Math_imul(var$4, var$5);
  $18_1 = var$2;
  i64toi32_i32$2 = var$3;
  i64toi32_i32$1 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$1 = 0;
   $21_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
   $21_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
  }
  $23_1 = $17_1 + Math_imul($18_1, $21_1) | 0;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$0 = var$1;
  i64toi32_i32$2 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$2 = 0;
   $22_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
  } else {
   i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
   $22_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
  }
  $29_1 = $23_1 + Math_imul($22_1, var$3) | 0;
  var$2 = var$2 & 65535 | 0;
  var$3 = var$3 & 65535 | 0;
  var$6 = Math_imul(var$2, var$3);
  var$2 = (var$6 >>> 16 | 0) + Math_imul(var$2, var$5) | 0;
  $45_1 = $29_1 + (var$2 >>> 16 | 0) | 0;
  var$2 = (var$2 & 65535 | 0) + Math_imul(var$4, var$3) | 0;
  i64toi32_i32$2 = 0;
  i64toi32_i32$1 = $45_1 + (var$2 >>> 16 | 0) | 0;
  i64toi32_i32$0 = 0;
  i64toi32_i32$3 = 32;
  i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
  if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
   i64toi32_i32$0 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
   $24_1 = 0;
  } else {
   i64toi32_i32$0 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$1 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$2 << i64toi32_i32$4 | 0) | 0;
   $24_1 = i64toi32_i32$1 << i64toi32_i32$4 | 0;
  }
  $56$hi = i64toi32_i32$0;
  i64toi32_i32$0 = 0;
  $62$hi = i64toi32_i32$0;
  i64toi32_i32$0 = $56$hi;
  i64toi32_i32$2 = $24_1;
  i64toi32_i32$1 = $62$hi;
  i64toi32_i32$3 = var$2 << 16 | 0 | (var$6 & 65535 | 0) | 0;
  i64toi32_i32$1 = i64toi32_i32$0 | i64toi32_i32$1 | 0;
  i64toi32_i32$2 = i64toi32_i32$2 | i64toi32_i32$3 | 0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
  return i64toi32_i32$2 | 0;
 }
 
 function _ZN17compiler_builtins3int4udiv10divmod_u6417h6026910b5ed08e40E(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$2 = 0, i64toi32_i32$3 = 0, i64toi32_i32$4 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$5 = 0, var$2 = 0, var$3 = 0, var$4 = 0, var$5 = 0, var$5$hi = 0, var$6 = 0, var$6$hi = 0, i64toi32_i32$6 = 0, $37_1 = 0, $38_1 = 0, $39_1 = 0, $40_1 = 0, $41_1 = 0, $42_1 = 0, $43_1 = 0, $44_1 = 0, var$8$hi = 0, $45_1 = 0, $46_1 = 0, $47_1 = 0, $48_1 = 0, var$7$hi = 0, $49_1 = 0, $63$hi = 0, $65_1 = 0, $65$hi = 0, $120$hi = 0, $129$hi = 0, $134$hi = 0, var$8 = 0, $140 = 0, $140$hi = 0, $142$hi = 0, $144 = 0, $144$hi = 0, $151 = 0, $151$hi = 0, $154$hi = 0, var$7 = 0, $165$hi = 0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             i64toi32_i32$0 = var$0$hi;
             i64toi32_i32$2 = var$0;
             i64toi32_i32$1 = 0;
             i64toi32_i32$3 = 32;
             i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
             if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
              i64toi32_i32$1 = 0;
              $37_1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
             } else {
              i64toi32_i32$1 = i64toi32_i32$0 >>> i64toi32_i32$4 | 0;
              $37_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$0 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
             }
             var$2 = $37_1;
             if (var$2) {
              i64toi32_i32$1 = var$1$hi;
              var$3 = var$1;
              if (!var$3) {
               break label$11
              }
              i64toi32_i32$0 = var$3;
              i64toi32_i32$2 = 0;
              i64toi32_i32$3 = 32;
              i64toi32_i32$4 = i64toi32_i32$3 & 31 | 0;
              if (32 >>> 0 <= (i64toi32_i32$3 & 63 | 0) >>> 0) {
               i64toi32_i32$2 = 0;
               $38_1 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
              } else {
               i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$4 | 0;
               $38_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$0 >>> i64toi32_i32$4 | 0) | 0;
              }
              var$4 = $38_1;
              if (!var$4) {
               break label$9
              }
              var$2 = Math_clz32(var$4) - Math_clz32(var$2) | 0;
              if (var$2 >>> 0 <= 31 >>> 0) {
               break label$8
              }
              break label$2;
             }
             i64toi32_i32$2 = var$1$hi;
             i64toi32_i32$1 = var$1;
             i64toi32_i32$0 = 1;
             i64toi32_i32$3 = 0;
             if (i64toi32_i32$2 >>> 0 > i64toi32_i32$0 >>> 0 | ((i64toi32_i32$2 | 0) == (i64toi32_i32$0 | 0) & i64toi32_i32$1 >>> 0 >= i64toi32_i32$3 >>> 0 | 0) | 0) {
              break label$2
             }
             i64toi32_i32$1 = var$0$hi;
             var$2 = var$0;
             i64toi32_i32$1 = i64toi32_i32$2;
             i64toi32_i32$1 = i64toi32_i32$2;
             var$3 = var$1;
             var$2 = (var$2 >>> 0) / (var$3 >>> 0) | 0;
             i64toi32_i32$1 = 0;
             __wasm_intrinsics_temp_i64 = var$0 - Math_imul(var$2, var$3) | 0;
             __wasm_intrinsics_temp_i64$hi = i64toi32_i32$1;
             i64toi32_i32$1 = 0;
             i64toi32_i32$2 = var$2;
             i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
             return i64toi32_i32$2 | 0;
            }
            i64toi32_i32$2 = var$1$hi;
            i64toi32_i32$3 = var$1;
            i64toi32_i32$1 = 0;
            i64toi32_i32$0 = 32;
            i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
            if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
             i64toi32_i32$1 = 0;
             $39_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
            } else {
             i64toi32_i32$1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
             $39_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
            }
            var$3 = $39_1;
            i64toi32_i32$1 = var$0$hi;
            if (!var$0) {
             break label$7
            }
            if (!var$3) {
             break label$6
            }
            var$4 = var$3 + -1 | 0;
            if (var$4 & var$3 | 0) {
             break label$6
            }
            i64toi32_i32$1 = 0;
            i64toi32_i32$2 = var$4 & var$2 | 0;
            i64toi32_i32$3 = 0;
            i64toi32_i32$0 = 32;
            i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
            if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
             i64toi32_i32$3 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
             $40_1 = 0;
            } else {
             i64toi32_i32$3 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
             $40_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
            }
            $63$hi = i64toi32_i32$3;
            i64toi32_i32$3 = var$0$hi;
            i64toi32_i32$1 = var$0;
            i64toi32_i32$2 = 0;
            i64toi32_i32$0 = -1;
            i64toi32_i32$2 = i64toi32_i32$3 & i64toi32_i32$2 | 0;
            $65_1 = i64toi32_i32$1 & i64toi32_i32$0 | 0;
            $65$hi = i64toi32_i32$2;
            i64toi32_i32$2 = $63$hi;
            i64toi32_i32$3 = $40_1;
            i64toi32_i32$1 = $65$hi;
            i64toi32_i32$0 = $65_1;
            i64toi32_i32$1 = i64toi32_i32$2 | i64toi32_i32$1 | 0;
            __wasm_intrinsics_temp_i64 = i64toi32_i32$3 | i64toi32_i32$0 | 0;
            __wasm_intrinsics_temp_i64$hi = i64toi32_i32$1;
            i64toi32_i32$1 = 0;
            i64toi32_i32$3 = var$2 >>> ((__wasm_ctz_i32(var$3 | 0) | 0) & 31 | 0) | 0;
            i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
            return i64toi32_i32$3 | 0;
           }
          }
          var$4 = var$3 + -1 | 0;
          if (!(var$4 & var$3 | 0)) {
           break label$5
          }
          var$2 = (Math_clz32(var$3) + 33 | 0) - Math_clz32(var$2) | 0;
          var$3 = 0 - var$2 | 0;
          break label$3;
         }
         var$3 = 63 - var$2 | 0;
         var$2 = var$2 + 1 | 0;
         break label$3;
        }
        var$4 = (var$2 >>> 0) / (var$3 >>> 0) | 0;
        i64toi32_i32$3 = 0;
        i64toi32_i32$2 = var$2 - Math_imul(var$4, var$3) | 0;
        i64toi32_i32$1 = 0;
        i64toi32_i32$0 = 32;
        i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
        if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
         i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
         $41_1 = 0;
        } else {
         i64toi32_i32$1 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
         $41_1 = i64toi32_i32$2 << i64toi32_i32$4 | 0;
        }
        __wasm_intrinsics_temp_i64 = $41_1;
        __wasm_intrinsics_temp_i64$hi = i64toi32_i32$1;
        i64toi32_i32$1 = 0;
        i64toi32_i32$2 = var$4;
        i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
        return i64toi32_i32$2 | 0;
       }
       var$2 = Math_clz32(var$3) - Math_clz32(var$2) | 0;
       if (var$2 >>> 0 < 31 >>> 0) {
        break label$4
       }
       break label$2;
      }
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$2 = 0;
      __wasm_intrinsics_temp_i64 = var$4 & var$0 | 0;
      __wasm_intrinsics_temp_i64$hi = i64toi32_i32$2;
      if ((var$3 | 0) == (1 | 0)) {
       break label$1
      }
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$2 = 0;
      $120$hi = i64toi32_i32$2;
      i64toi32_i32$2 = var$0$hi;
      i64toi32_i32$3 = var$0;
      i64toi32_i32$1 = $120$hi;
      i64toi32_i32$0 = __wasm_ctz_i32(var$3 | 0) | 0;
      i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
      if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
       i64toi32_i32$1 = 0;
       $42_1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
      } else {
       i64toi32_i32$1 = i64toi32_i32$2 >>> i64toi32_i32$4 | 0;
       $42_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$2 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$3 >>> i64toi32_i32$4 | 0) | 0;
      }
      i64toi32_i32$3 = $42_1;
      i64toi32_i32$HIGH_BITS = i64toi32_i32$1;
      return i64toi32_i32$3 | 0;
     }
     var$3 = 63 - var$2 | 0;
     var$2 = var$2 + 1 | 0;
    }
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$3 = 0;
    $129$hi = i64toi32_i32$3;
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$2 = var$0;
    i64toi32_i32$1 = $129$hi;
    i64toi32_i32$0 = var$2 & 63 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$1 = 0;
     $43_1 = i64toi32_i32$3 >>> i64toi32_i32$4 | 0;
    } else {
     i64toi32_i32$1 = i64toi32_i32$3 >>> i64toi32_i32$4 | 0;
     $43_1 = (((1 << i64toi32_i32$4 | 0) - 1 | 0) & i64toi32_i32$3 | 0) << (32 - i64toi32_i32$4 | 0) | 0 | (i64toi32_i32$2 >>> i64toi32_i32$4 | 0) | 0;
    }
    var$5 = $43_1;
    var$5$hi = i64toi32_i32$1;
    i64toi32_i32$1 = var$0$hi;
    i64toi32_i32$1 = 0;
    $134$hi = i64toi32_i32$1;
    i64toi32_i32$1 = var$0$hi;
    i64toi32_i32$3 = var$0;
    i64toi32_i32$2 = $134$hi;
    i64toi32_i32$0 = var$3 & 63 | 0;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$3 << i64toi32_i32$4 | 0;
     $44_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$3 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$1 << i64toi32_i32$4 | 0) | 0;
     $44_1 = i64toi32_i32$3 << i64toi32_i32$4 | 0;
    }
    var$0 = $44_1;
    var$0$hi = i64toi32_i32$2;
    label$13 : {
     if (var$2) {
      i64toi32_i32$2 = var$1$hi;
      i64toi32_i32$1 = var$1;
      i64toi32_i32$3 = -1;
      i64toi32_i32$0 = -1;
      i64toi32_i32$4 = i64toi32_i32$1 + i64toi32_i32$0 | 0;
      i64toi32_i32$5 = i64toi32_i32$2 + i64toi32_i32$3 | 0;
      if (i64toi32_i32$4 >>> 0 < i64toi32_i32$0 >>> 0) {
       i64toi32_i32$5 = i64toi32_i32$5 + 1 | 0
      }
      var$8 = i64toi32_i32$4;
      var$8$hi = i64toi32_i32$5;
      label$15 : while (1) {
       i64toi32_i32$5 = var$5$hi;
       i64toi32_i32$2 = var$5;
       i64toi32_i32$1 = 0;
       i64toi32_i32$0 = 1;
       i64toi32_i32$3 = i64toi32_i32$0 & 31 | 0;
       if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
        i64toi32_i32$1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
        $45_1 = 0;
       } else {
        i64toi32_i32$1 = ((1 << i64toi32_i32$3 | 0) - 1 | 0) & (i64toi32_i32$2 >>> (32 - i64toi32_i32$3 | 0) | 0) | 0 | (i64toi32_i32$5 << i64toi32_i32$3 | 0) | 0;
        $45_1 = i64toi32_i32$2 << i64toi32_i32$3 | 0;
       }
       $140 = $45_1;
       $140$hi = i64toi32_i32$1;
       i64toi32_i32$1 = var$0$hi;
       i64toi32_i32$5 = var$0;
       i64toi32_i32$2 = 0;
       i64toi32_i32$0 = 63;
       i64toi32_i32$3 = i64toi32_i32$0 & 31 | 0;
       if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
        i64toi32_i32$2 = 0;
        $46_1 = i64toi32_i32$1 >>> i64toi32_i32$3 | 0;
       } else {
        i64toi32_i32$2 = i64toi32_i32$1 >>> i64toi32_i32$3 | 0;
        $46_1 = (((1 << i64toi32_i32$3 | 0) - 1 | 0) & i64toi32_i32$1 | 0) << (32 - i64toi32_i32$3 | 0) | 0 | (i64toi32_i32$5 >>> i64toi32_i32$3 | 0) | 0;
       }
       $142$hi = i64toi32_i32$2;
       i64toi32_i32$2 = $140$hi;
       i64toi32_i32$1 = $140;
       i64toi32_i32$5 = $142$hi;
       i64toi32_i32$0 = $46_1;
       i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
       var$5 = i64toi32_i32$1 | i64toi32_i32$0 | 0;
       var$5$hi = i64toi32_i32$5;
       $144 = var$5;
       $144$hi = i64toi32_i32$5;
       i64toi32_i32$5 = var$8$hi;
       i64toi32_i32$5 = var$5$hi;
       i64toi32_i32$5 = var$8$hi;
       i64toi32_i32$2 = var$8;
       i64toi32_i32$1 = var$5$hi;
       i64toi32_i32$0 = var$5;
       i64toi32_i32$3 = i64toi32_i32$2 - i64toi32_i32$0 | 0;
       i64toi32_i32$6 = i64toi32_i32$2 >>> 0 < i64toi32_i32$0 >>> 0;
       i64toi32_i32$4 = i64toi32_i32$6 + i64toi32_i32$1 | 0;
       i64toi32_i32$4 = i64toi32_i32$5 - i64toi32_i32$4 | 0;
       i64toi32_i32$5 = i64toi32_i32$3;
       i64toi32_i32$2 = 0;
       i64toi32_i32$0 = 63;
       i64toi32_i32$1 = i64toi32_i32$0 & 31 | 0;
       if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
        i64toi32_i32$2 = i64toi32_i32$4 >> 31 | 0;
        $47_1 = i64toi32_i32$4 >> i64toi32_i32$1 | 0;
       } else {
        i64toi32_i32$2 = i64toi32_i32$4 >> i64toi32_i32$1 | 0;
        $47_1 = (((1 << i64toi32_i32$1 | 0) - 1 | 0) & i64toi32_i32$4 | 0) << (32 - i64toi32_i32$1 | 0) | 0 | (i64toi32_i32$5 >>> i64toi32_i32$1 | 0) | 0;
       }
       var$6 = $47_1;
       var$6$hi = i64toi32_i32$2;
       i64toi32_i32$2 = var$1$hi;
       i64toi32_i32$2 = var$6$hi;
       i64toi32_i32$4 = var$6;
       i64toi32_i32$5 = var$1$hi;
       i64toi32_i32$0 = var$1;
       i64toi32_i32$5 = i64toi32_i32$2 & i64toi32_i32$5 | 0;
       $151 = i64toi32_i32$4 & i64toi32_i32$0 | 0;
       $151$hi = i64toi32_i32$5;
       i64toi32_i32$5 = $144$hi;
       i64toi32_i32$2 = $144;
       i64toi32_i32$4 = $151$hi;
       i64toi32_i32$0 = $151;
       i64toi32_i32$1 = i64toi32_i32$2 - i64toi32_i32$0 | 0;
       i64toi32_i32$6 = i64toi32_i32$2 >>> 0 < i64toi32_i32$0 >>> 0;
       i64toi32_i32$3 = i64toi32_i32$6 + i64toi32_i32$4 | 0;
       i64toi32_i32$3 = i64toi32_i32$5 - i64toi32_i32$3 | 0;
       var$5 = i64toi32_i32$1;
       var$5$hi = i64toi32_i32$3;
       i64toi32_i32$3 = var$0$hi;
       i64toi32_i32$5 = var$0;
       i64toi32_i32$2 = 0;
       i64toi32_i32$0 = 1;
       i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
       if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
        i64toi32_i32$2 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
        $48_1 = 0;
       } else {
        i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
        $48_1 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
       }
       $154$hi = i64toi32_i32$2;
       i64toi32_i32$2 = var$7$hi;
       i64toi32_i32$2 = $154$hi;
       i64toi32_i32$3 = $48_1;
       i64toi32_i32$5 = var$7$hi;
       i64toi32_i32$0 = var$7;
       i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
       var$0 = i64toi32_i32$3 | i64toi32_i32$0 | 0;
       var$0$hi = i64toi32_i32$5;
       i64toi32_i32$5 = var$6$hi;
       i64toi32_i32$2 = var$6;
       i64toi32_i32$3 = 0;
       i64toi32_i32$0 = 1;
       i64toi32_i32$3 = i64toi32_i32$5 & i64toi32_i32$3 | 0;
       var$6 = i64toi32_i32$2 & i64toi32_i32$0 | 0;
       var$6$hi = i64toi32_i32$3;
       var$7 = var$6;
       var$7$hi = i64toi32_i32$3;
       var$2 = var$2 + -1 | 0;
       if (var$2) {
        continue label$15
       }
       break label$15;
      };
      break label$13;
     }
    }
    i64toi32_i32$3 = var$5$hi;
    __wasm_intrinsics_temp_i64 = var$5;
    __wasm_intrinsics_temp_i64$hi = i64toi32_i32$3;
    i64toi32_i32$3 = var$0$hi;
    i64toi32_i32$5 = var$0;
    i64toi32_i32$2 = 0;
    i64toi32_i32$0 = 1;
    i64toi32_i32$4 = i64toi32_i32$0 & 31 | 0;
    if (32 >>> 0 <= (i64toi32_i32$0 & 63 | 0) >>> 0) {
     i64toi32_i32$2 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
     $49_1 = 0;
    } else {
     i64toi32_i32$2 = ((1 << i64toi32_i32$4 | 0) - 1 | 0) & (i64toi32_i32$5 >>> (32 - i64toi32_i32$4 | 0) | 0) | 0 | (i64toi32_i32$3 << i64toi32_i32$4 | 0) | 0;
     $49_1 = i64toi32_i32$5 << i64toi32_i32$4 | 0;
    }
    $165$hi = i64toi32_i32$2;
    i64toi32_i32$2 = var$6$hi;
    i64toi32_i32$2 = $165$hi;
    i64toi32_i32$3 = $49_1;
    i64toi32_i32$5 = var$6$hi;
    i64toi32_i32$0 = var$6;
    i64toi32_i32$5 = i64toi32_i32$2 | i64toi32_i32$5 | 0;
    i64toi32_i32$3 = i64toi32_i32$3 | i64toi32_i32$0 | 0;
    i64toi32_i32$HIGH_BITS = i64toi32_i32$5;
    return i64toi32_i32$3 | 0;
   }
   i64toi32_i32$3 = var$0$hi;
   __wasm_intrinsics_temp_i64 = var$0;
   __wasm_intrinsics_temp_i64$hi = i64toi32_i32$3;
   i64toi32_i32$3 = 0;
   var$0 = 0;
   var$0$hi = i64toi32_i32$3;
  }
  i64toi32_i32$3 = var$0$hi;
  i64toi32_i32$5 = var$0;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$3;
  return i64toi32_i32$5 | 0;
 }
 
 function __wasm_ctz_i32(var$0) {
  var$0 = var$0 | 0;
  if (var$0) {
   return 31 - Math_clz32((var$0 + -1 | 0) ^ var$0 | 0) | 0 | 0
  }
  return 32 | 0;
 }
 
 function __wasm_i64_mul(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$0 = var$1$hi;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$1 = _ZN17compiler_builtins3int3mul3Mul3mul17h070e9a1c69faec5bE(var$0 | 0, i64toi32_i32$0 | 0, var$1 | 0, i64toi32_i32$1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function __wasm_i64_udiv(var$0, var$0$hi, var$1, var$1$hi) {
  var$0 = var$0 | 0;
  var$0$hi = var$0$hi | 0;
  var$1 = var$1 | 0;
  var$1$hi = var$1$hi | 0;
  var i64toi32_i32$0 = 0, i64toi32_i32$1 = 0;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$0 = var$1$hi;
  i64toi32_i32$0 = var$0$hi;
  i64toi32_i32$1 = var$1$hi;
  i64toi32_i32$1 = _ZN17compiler_builtins3int4udiv10divmod_u6417h6026910b5ed08e40E(var$0 | 0, i64toi32_i32$0 | 0, var$1 | 0, i64toi32_i32$1 | 0) | 0;
  i64toi32_i32$0 = i64toi32_i32$HIGH_BITS;
  i64toi32_i32$HIGH_BITS = i64toi32_i32$0;
  return i64toi32_i32$1 | 0;
 }
 
 function __wasm_rotl_i32(var$0, var$1) {
  var$0 = var$0 | 0;
  var$1 = var$1 | 0;
  var var$2 = 0;
  var$2 = var$1 & 31 | 0;
  var$1 = (0 - var$1 | 0) & 31 | 0;
  return ((-1 >>> var$2 | 0) & var$0 | 0) << var$2 | 0 | (((-1 << var$1 | 0) & var$0 | 0) >>> var$1 | 0) | 0 | 0;
 }
 
 // EMSCRIPTEN_END_FUNCS
;
 bufferView = HEAPU8;
 initActiveSegments(imports);
 var FUNCTION_TABLE = Table([null, $44, $45, $48, $53, $54, $57, $58, $59, $55, $56]);
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 function __wasm_memory_grow(pagesToAdd) {
  pagesToAdd = pagesToAdd | 0;
  var oldPages = __wasm_memory_size() | 0;
  var newPages = oldPages + pagesToAdd | 0;
  if ((oldPages < newPages) && (newPages < 65536)) {
   var newBuffer = new ArrayBuffer(Math_imul(newPages, 65536));
   var newHEAP8 = new Int8Array(newBuffer);
   newHEAP8.set(HEAP8);
   HEAP8 = new Int8Array(newBuffer);
   HEAP16 = new Int16Array(newBuffer);
   HEAP32 = new Int32Array(newBuffer);
   HEAPU8 = new Uint8Array(newBuffer);
   HEAPU16 = new Uint16Array(newBuffer);
   HEAPU32 = new Uint32Array(newBuffer);
   HEAPF32 = new Float32Array(newBuffer);
   HEAPF64 = new Float64Array(newBuffer);
   buffer = newBuffer;
   bufferView = HEAPU8;
  }
  return oldPages;
 }
 
 return {
  "memory": Object.create(Object.prototype, {
   "grow": {
    "value": __wasm_memory_grow
   }, 
   "buffer": {
    "get": function () {
     return buffer;
    }
    
   }
  }), 
  "__wasm_call_ctors": $0, 
  "avifVersion": $60, 
  "avifResultToString": $62, 
  "avifRGBImageSetDefaults": $81, 
  "avifRGBImageAllocatePixels": $82, 
  "avifDecoderCreate": $91, 
  "avifDecoderDestroy": $92, 
  "avifDecoderSetIOMemory": $99, 
  "avifDecoderNextImage": $101, 
  "stackSave": $118, 
  "stackRestore": $119, 
  "stackAlloc": $120, 
  "__indirect_function_table": FUNCTION_TABLE, 
  "dynCall_iiijii": $122
 };
}

  return asmFunc(info);
}

)(info);
  },

  instantiate: /** @suppress{checkTypes} */ function(binary, info) {
    return {
      then: function(ok) {
        var module = new WebAssembly.Module(binary);
        ok({
          'instance': new WebAssembly.Instance(module, info)
        });
      }
    };
  },

  RuntimeError: Error
};

// We don't need to actually download a wasm binary, mark it as present but empty.
wasmBinary = [];
// end include: wasm2js.js
if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    // This build was created without ASSERTIONS defined.  `assert()` should not
    // ever be called in this configuration but in case there are callers in
    // the wild leave this simple abort() implementation here for now.
    abort(text);
  }
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}
// end include: runtime_shared.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;

  
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  what += '. Build with -sASSERTIONS for more info.';

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
var wasmBinaryFile;
  wasmBinaryFile = 'libavif.wasm';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'sync fetching of the wasm failed: you can preload it to Module["wasmBinary"] manually, or emcc.py will do that for you when generating HTML (but not JS)';
}

function getBinaryPromise(binaryFile) {
  // If we don't have the binary yet, try to load it asynchronously.
  // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
  // See https://github.com/github/fetch/pull/92#issuecomment-140665932
  // Cordova or Electron apps are typically loaded from a file:// url.
  // So use fetch if it is available and the url is not a file, otherwise fall back to XHR.
  if (!wasmBinary
      && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch == 'function'
      && !isFileURI(binaryFile)
    ) {
      return fetch(binaryFile, { credentials: 'same-origin' }).then((response) => {
        if (!response['ok']) {
          throw `failed to load wasm binary file at '${binaryFile}'`;
        }
        return response['arrayBuffer']();
      }).catch(() => getBinarySync(binaryFile));
    }
    else if (readAsync) {
      // fetch is not available or url is file => try XHR (readAsync uses XHR internally)
      return new Promise((resolve, reject) => {
        readAsync(binaryFile, (response) => resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))), reject)
      });
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateSync(file, info) {
  var module;
  var binary = getBinarySync(file);
  module = new WebAssembly.Module(binary);
  var instance = new WebAssembly.Instance(module, info);
  return [instance, module];
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    updateMemoryViews();

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {

    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        return false;
    }
  }

  var result = instantiateSync(wasmBinaryFile, info);
  // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193,
  // the above line no longer optimizes out down to the following line.
  // When the regression is fixed, we can remove this if/else.
  return receiveInstance(result[0]);
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
// end include: runtime_debug.js
// === Body ===
// end include: preamble.js


  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': abort('to do getValue(i64) use WASM_BIGINT');
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': abort('to do setValue(i64) use WASM_BIGINT');
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  /** @type {function(...*):?} */
  function _ScalePlane(
  ) {
  abort('missing function: ScalePlane');
  }
  _ScalePlane.stub = true;

  /** @type {function(...*):?} */
  function _ScalePlane_12(
  ) {
  abort('missing function: ScalePlane_12');
  }
  _ScalePlane_12.stub = true;

  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  var ___assert_fail = (condition, filename, line, func) => {
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    };

  var _abort = () => {
      abort('');
    };

  /** @type {function(...*):?} */
  function _dav1d_close(
  ) {
  abort('missing function: dav1d_close');
  }
  _dav1d_close.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_data_unref(
  ) {
  abort('missing function: dav1d_data_unref');
  }
  _dav1d_data_unref.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_data_wrap(
  ) {
  abort('missing function: dav1d_data_wrap');
  }
  _dav1d_data_wrap.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_default_settings(
  ) {
  abort('missing function: dav1d_default_settings');
  }
  _dav1d_default_settings.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_get_picture(
  ) {
  abort('missing function: dav1d_get_picture');
  }
  _dav1d_get_picture.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_open(
  ) {
  abort('missing function: dav1d_open');
  }
  _dav1d_open.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_picture_unref(
  ) {
  abort('missing function: dav1d_picture_unref');
  }
  _dav1d_picture_unref.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_send_data(
  ) {
  abort('missing function: dav1d_send_data');
  }
  _dav1d_send_data.stub = true;

  /** @type {function(...*):?} */
  function _dav1d_version(
  ) {
  abort('missing function: dav1d_version');
  }
  _dav1d_version.stub = true;

  var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  
  var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
      }
      // implicit 0 return to save code size (caller will cast "undefined" into 0
      // anyhow)
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
  
      var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      return false;
    };

  /** @type {function(...*):?} */
  function _free(
  ) {
  abort('missing function: free');
  }
  _free.stub = true;

  /** @type {function(...*):?} */
  function _malloc(
  ) {
  abort('missing function: malloc');
  }
  _malloc.stub = true;

  /** @type {function(...*):?} */
  function _memcpy(
  ) {
  abort('missing function: memcpy');
  }
  _memcpy.stub = true;

  /** @type {function(...*):?} */
  function _memset(
  ) {
  abort('missing function: memset');
  }
  _memset.stub = true;

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };

  
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      // When the function takes numbers and returns a number, we can just return
      // the original function
      var numericArgs = !argTypes || argTypes.every((type) => type === 'number' || type === 'boolean');
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };
var wasmImports = {
  /** @export */
  ScalePlane: _ScalePlane,
  /** @export */
  ScalePlane_12: _ScalePlane_12,
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  abort: _abort,
  /** @export */
  dav1d_close: _dav1d_close,
  /** @export */
  dav1d_data_unref: _dav1d_data_unref,
  /** @export */
  dav1d_data_wrap: _dav1d_data_wrap,
  /** @export */
  dav1d_default_settings: _dav1d_default_settings,
  /** @export */
  dav1d_get_picture: _dav1d_get_picture,
  /** @export */
  dav1d_open: _dav1d_open,
  /** @export */
  dav1d_picture_unref: _dav1d_picture_unref,
  /** @export */
  dav1d_send_data: _dav1d_send_data,
  /** @export */
  dav1d_version: _dav1d_version,
  /** @export */
  emscripten_memcpy_js: _emscripten_memcpy_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap
};
var wasmExports = createWasm();
var ___wasm_call_ctors = wasmExports['__wasm_call_ctors']
var _avifVersion = Module['_avifVersion'] = wasmExports['avifVersion']
var _avifResultToString = Module['_avifResultToString'] = wasmExports['avifResultToString']
var _avifRGBImageSetDefaults = Module['_avifRGBImageSetDefaults'] = wasmExports['avifRGBImageSetDefaults']
var _avifRGBImageAllocatePixels = Module['_avifRGBImageAllocatePixels'] = wasmExports['avifRGBImageAllocatePixels']
var _avifDecoderCreate = Module['_avifDecoderCreate'] = wasmExports['avifDecoderCreate']
var _avifDecoderDestroy = Module['_avifDecoderDestroy'] = wasmExports['avifDecoderDestroy']
var _avifDecoderSetIOMemory = Module['_avifDecoderSetIOMemory'] = wasmExports['avifDecoderSetIOMemory']
var _avifDecoderNextImage = Module['_avifDecoderNextImage'] = wasmExports['avifDecoderNextImage']
var stackSave = wasmExports['stackSave']
var stackRestore = wasmExports['stackRestore']
var stackAlloc = wasmExports['stackAlloc']
var dynCall_iiijii = Module['dynCall_iiijii'] = wasmExports['dynCall_iiijii']


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module['ccall'] = ccall;
Module['cwrap'] = cwrap;


var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function run() {

  if (runDependencies > 0) {
    return;
  }

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();

// end include: postamble.js

